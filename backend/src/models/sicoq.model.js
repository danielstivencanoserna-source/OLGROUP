// models/sicoq.model.js
//
// Este archivo contiene SOLO las consultas SQL del módulo SICOQ.
// No tiene lógica de negocio — eso va en el controller.
// Su única responsabilidad es hablar con la base de datos.

const pool = require('../config/db');

const SicoqModel = {

  // ── REGISTRAR UN CONSUMO ────────────────────────────────────────
  //
  // Esta es la operación más importante del módulo.
  // Usamos una TRANSACCIÓN porque necesitamos hacer DOS cosas
  // al mismo tiempo de forma atómica:
  //   1. Insertar el registro en sicoq_consumos
  //   2. Reducir la cantidad_actual del reactivo
  //
  // Si cualquiera de las dos falla, NINGUNA se guarda.
  // Esto garantiza que el inventario y los registros siempre estén sincronizados.
  // Por ejemplo: si el INSERT falla después del UPDATE, sin transacción
  // el inventario quedaría descontado sin ningún registro que lo justifique.

  async registrarConsumo(datos) {
    // pool.connect() nos da una conexión dedicada del pool
    // que podemos usar para la transacción completa
    const client = await pool.connect();

    try {
      // BEGIN inicia la transacción — a partir de aquí nada se guarda
      // en la BD hasta que hagamos COMMIT
      await client.query('BEGIN');

      // ── Paso 1: Verificar que el reactivo existe, es controlado
      //           y tiene suficiente cantidad disponible
      //
      // Usamos FOR UPDATE para bloquear la fila durante la transacción.
      // Esto evita que dos personas registren consumos del mismo reactivo
      // al mismo tiempo y ambas vean la misma cantidad disponible
      // (condición de carrera / race condition).
      const resultReactivo = await client.query(
        `SELECT id, nombre, cantidad_actual, unidad_medida, es_controlado
         FROM reactivos
         WHERE id = $1
         FOR UPDATE`,
        [datos.reactivo_id]
      );

      // Si no existe el reactivo, abortamos todo
      if (resultReactivo.rows.length === 0) {
        await client.query('ROLLBACK');
        // Lanzamos un error con un código personalizado para que
        // el controller pueda responder con el mensaje correcto
        const err = new Error('Reactivo no encontrado');
        err.code  = 'NOT_FOUND';
        throw err;
      }

      const reactivo = resultReactivo.rows[0];

      // Verificar que es un reactivo controlado (SICOQ solo aplica a estos)
      if (!reactivo.es_controlado) {
        await client.query('ROLLBACK');
        const err = new Error('Este reactivo no está marcado como controlado');
        err.code  = 'NOT_CONTROLLED';
        throw err;
      }

      // ── Paso 2: Convertir la cantidad al sistema de unidades del reactivo
      //
      // El reactivo puede estar en Litros pero el consumo registrarse en mL.
      // Necesitamos convertir para comparar y descontar correctamente.
      const cantidadEnUnidadReactivo = convertirUnidad(
        datos.cantidad,
        datos.unidad,
        reactivo.unidad_medida
      );

      // Verificar que hay suficiente cantidad disponible
      if (cantidadEnUnidadReactivo > parseFloat(reactivo.cantidad_actual)) {
        await client.query('ROLLBACK');
        const err = new Error(
          `Cantidad insuficiente. Disponible: ${reactivo.cantidad_actual} ${reactivo.unidad_medida}`
        );
        err.code = 'INSUFFICIENT_QUANTITY';
        throw err;
      }

      // ── Paso 3: Insertar el registro de consumo
      const resultConsumo = await client.query(
        `INSERT INTO sicoq_consumos (
          reactivo_id, responsable_id, nombre_responsable,
          cantidad, unidad, uso_descripcion, observaciones, numero_acta
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          datos.reactivo_id,
          datos.responsable_id || null,  // puede ser null si no hay usuario registrado
          datos.nombre_responsable,
          datos.cantidad,
          datos.unidad,
          datos.uso_descripcion,
          datos.observaciones || null,
          datos.numero_acta   || null,
        ]
      );

      // ── Paso 4: Descontar la cantidad del inventario
      //
      // Actualizamos cantidad_actual restando la cantidad consumida convertida.
      // Usamos GREATEST(..., 0) para evitar que quede en negativo por
      // errores de redondeo en decimales.
      await client.query(
        `UPDATE reactivos
         SET cantidad_actual = GREATEST(cantidad_actual - $1, 0),
             estado = CASE
               WHEN GREATEST(cantidad_actual - $1, 0) = 0 THEN 'agotado'
               ELSE estado
             END
         WHERE id = $2`,
        [cantidadEnUnidadReactivo, datos.reactivo_id]
      );
      // Nota sobre el CASE: si después del descuento la cantidad llega a 0,
      // el estado del reactivo cambia automáticamente a 'agotado'.
      // Así no hay que actualizarlo manualmente.

      // ── Todo salió bien: confirmar los cambios en la BD
      await client.query('COMMIT');

      return {
        consumo:  resultConsumo.rows[0],
        reactivo: {
          id:              reactivo.id,
          nombre:          reactivo.nombre,
          cantidad_actual: parseFloat(reactivo.cantidad_actual) - cantidadEnUnidadReactivo,
          unidad_medida:   reactivo.unidad_medida,
        },
      };

    } catch (err) {
      // Si llegamos aquí, algo falló — revertimos TODO
      // ROLLBACK deshace el INSERT y el UPDATE como si nunca hubieran ocurrido
      await client.query('ROLLBACK');
      throw err; // re-lanzamos el error para que el controller lo maneje

    } finally {
      // SIEMPRE devolvemos la conexión al pool, pase lo que pase.
      // Sin esto, el pool se quedaría sin conexiones disponibles
      // después de unos pocos errores y el servidor dejaría de funcionar.
      client.release();
    }
  },

  // ── LISTAR CONSUMOS con filtros y paginación ───────────────────
  //
  // Permite filtrar por reactivo, responsable y rango de fechas.
  // Útil para generar reportes de trazabilidad para auditorías SICOQ.

  async findAll({ pagina = 1, limite = 20, reactivo_id, nombre_responsable, desde, hasta }) {
    const offset     = (pagina - 1) * limite;
    const params     = [];
    const condiciones = [];

    // Construimos el filtro dinámicamente — solo agregamos condiciones
    // para los parámetros que realmente fueron enviados en la petición
    if (reactivo_id) {
      params.push(reactivo_id);
      condiciones.push(`sc.reactivo_id = $${params.length}`);
    }

    if (nombre_responsable) {
      params.push(`%${nombre_responsable}%`);
      // ILIKE es búsqueda case-insensitive — busca "garcia", "Garcia" o "GARCIA"
      condiciones.push(`sc.nombre_responsable ILIKE $${params.length}`);
    }

    if (desde) {
      params.push(desde);
      condiciones.push(`sc.fecha_consumo >= $${params.length}`);
    }

    if (hasta) {
      params.push(hasta);
      // Agregamos 1 día al "hasta" para incluir todo ese día
      condiciones.push(`sc.fecha_consumo < $${params.length}::date + INTERVAL '1 day'`);
    }

    const where = condiciones.length > 0
      ? 'WHERE ' + condiciones.join(' AND ')
      : '';

    // Copiamos params antes de agregar limite/offset
    // porque los usamos también para el COUNT
    const paramsCount = [...params];

    params.push(limite, offset);

    const queryDatos = `
      SELECT
        sc.id,
        sc.cantidad,
        sc.unidad,
        sc.uso_descripcion,
        sc.observaciones,
        sc.numero_acta,
        sc.fecha_consumo,
        sc.nombre_responsable,
        r.id              AS reactivo_id,
        r.nombre          AS reactivo_nombre,
        r.codigo_interno  AS reactivo_codigo,
        r.cas             AS reactivo_cas,
        r.cantidad_actual AS reactivo_cantidad_actual,
        r.unidad_medida   AS reactivo_unidad
      FROM sicoq_consumos sc
      INNER JOIN reactivos r ON sc.reactivo_id = r.id
      ${where}
      ORDER BY sc.fecha_consumo DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const queryTotal = `
      SELECT COUNT(*)
      FROM sicoq_consumos sc
      INNER JOIN reactivos r ON sc.reactivo_id = r.id
      ${where}
    `;

    // Ejecutamos las dos consultas en paralelo para mayor eficiencia
    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos,  params),
      pool.query(queryTotal,  paramsCount),
    ]);

    return {
      datos:        resultDatos.rows,
      total:        parseInt(resultTotal.rows[0].count),
      pagina,
      limite,
      totalPaginas: Math.ceil(resultTotal.rows[0].count / limite),
    };
  },

  // ── OBTENER UN CONSUMO POR ID ───────────────────────────────────
  async findById(id) {
    const result = await pool.query(
      `SELECT
        sc.*,
        r.nombre         AS reactivo_nombre,
        r.codigo_interno AS reactivo_codigo,
        r.cas            AS reactivo_cas,
        r.unidad_medida  AS reactivo_unidad
       FROM sicoq_consumos sc
       INNER JOIN reactivos r ON sc.reactivo_id = r.id
       WHERE sc.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  // ── LISTAR SOLO LOS REACTIVOS CONTROLADOS ─────────────────────
  // Este endpoint es para el buscador del formulario de registro de consumo.
  // Solo muestra los reactivos marcados como es_controlado = true
  // y que no estén agotados.
  async findReactivosControlados(busqueda) {
    const params = [];
    let where = 'WHERE r.es_controlado = true AND r.estado != \'agotado\'';

    if (busqueda) {
      params.push(`%${busqueda}%`);
      where += ` AND (r.nombre ILIKE $1 OR r.codigo_interno ILIKE $1 OR r.cas ILIKE $1)`;
    }

    const result = await pool.query(
      `SELECT
        r.id, r.codigo_interno, r.nombre, r.cas,
        r.cantidad_actual, r.unidad_medida, r.estado
       FROM reactivos r
       ${where}
       ORDER BY r.nombre
       LIMIT 20`,
      params
    );
    return result.rows;
  },
};

// ── FUNCIÓN AUXILIAR: conversión de unidades ────────────────────
//
// Esta función convierte entre unidades de medida compatibles.
// Por ejemplo: si el reactivo está en Litros y el consumo es 500 mL,
// necesitamos saber cuántos litros son 500 mL (= 0.5 L) para hacer
// el descuento correcto en el inventario.
//
// Se exporta también para poder usarla en pruebas unitarias en el futuro.

function convertirUnidad(cantidad, unidadOrigen, unidadDestino) {
  // Si las unidades son iguales, no hay nada que convertir
  if (unidadOrigen === unidadDestino) return cantidad;

  // Tabla de conversión: todo se normaliza a la unidad base
  // Unidades de volumen → base: litros (L)
  // Unidades de masa    → base: gramos (g)
  const factores = {
    'L':  1,
    'mL': 0.001,
    'µL': 0.000001,
    'g':  1,
    'kg': 1000,
    'mg': 0.001,
    'µg': 0.000001,
  };

  const factorOrigen  = factores[unidadOrigen];
  const factorDestino = factores[unidadDestino];

  // Si alguna unidad no está en la tabla, no podemos convertir
  // En ese caso, devolvemos la cantidad original sin convertir
  // (el controller validará que las unidades sean compatibles)
  if (!factorOrigen || !factorDestino) return cantidad;

  // La conversión es: cantidad × (factor origen / factor destino)
  // Ejemplo: 500 mL a L → 500 × (0.001 / 1) = 0.5 L
  return cantidad * (factorOrigen / factorDestino);
}

module.exports = SicoqModel;
module.exports.convertirUnidad = convertirUnidad;