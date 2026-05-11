// models/reactivo.model.js
// Todas las consultas SQL del módulo de reactivos.
// Usamos transacciones donde necesitamos que varias operaciones
// sean atómicas: o todas se completan, o ninguna.

const pool = require('../config/db');

const ReactivoModel = {

    // ── LISTAR con paginación y filtros ────────────────────────────
    async findAll({ pagina = 1, limite = 20, busqueda, estado, esControlado }) {
    const offset = (pagina - 1) * limite;
    const params = [];
    const condiciones = [];

    // Siempre filtramos reactivos activos
    // Los reactivos desactivados por borrado lógico no aparecen en el inventario
    condiciones.push('r.activo = true');

    // Búsqueda por texto — busca en nombre, CAS, código interno y sinónimos
    if (busqueda) {
      params.push(`%${busqueda}%`);
      condiciones.push(
        `(r.nombre ILIKE $${params.length}
          OR r.cas ILIKE $${params.length}
          OR r.codigo_interno ILIKE $${params.length}
          OR r.sinonimos ILIKE $${params.length})`
      );
    }

    // Filtro por estado
    if (estado) {
      params.push(estado);
      condiciones.push(`r.estado = $${params.length}`);
    }

    // Filtro por controlado SICOQ
    if (esControlado !== undefined) {
      params.push(esControlado);
      condiciones.push(`r.es_controlado = $${params.length}`);
    }

    // El WHERE siempre tiene al menos 'r.activo = true'
    const where = 'WHERE ' + condiciones.join(' AND ');

    // Consulta principal con JOIN a proveedores y usuarios
    params.push(limite, offset);
    const queryDatos = `
      SELECT
        r.id, r.codigo_interno, r.nombre, r.cas, r.formula_molecular,
        r.concentracion, r.lote, r.fecha_vencimiento, r.fecha_ingreso,
        r.estado, r.ubicacion, r.unidad_medida, r.cantidad_actual,
        r.cantidad_inicial, r.es_controlado, r.peligrosidad,
        r.numero_un, r.tipo_residuo, r.precio, r.marca,
        r.fecha_apertura, r.ficha_seguridad_url, r.activo,
        p.nombre  AS proveedor_nombre,
        u.nombre  AS analista_apertura
      FROM reactivos r
      LEFT JOIN proveedores p ON r.proveedor_id = p.id
      LEFT JOIN usuarios    u ON r.analista_apertura_id = u.id
      ${where}
      ORDER BY r.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    // Consulta de total para calcular páginas
    // Usamos los params sin limite/offset (los últimos dos)
    const paramsCount = params.slice(0, params.length - 2);
    const queryTotal = `
      SELECT COUNT(*) FROM reactivos r ${where}
    `;

    // Ejecutamos las dos consultas en paralelo
    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, params),
      pool.query(queryTotal, paramsCount),
    ]);

    return {
      datos:        resultDatos.rows,
      total:        parseInt(resultTotal.rows[0].count),
      pagina,
      limite,
      totalPaginas: Math.ceil(resultTotal.rows[0].count / limite),
    };
  },
  
    // ── OBTENER UNO con todos sus detalles y pictogramas ───────────
    async findById(id) {
        // Consulta principal del reactivo
        const resultReactivo = await pool.query(`
      SELECT
        r.*,
        p.nombre  AS proveedor_nombre,
        p.email   AS proveedor_email,
        p.telefono AS proveedor_telefono,
        u.nombre  AS analista_apertura
      FROM reactivos r
      LEFT JOIN proveedores p ON r.proveedor_id = p.id
      LEFT JOIN usuarios    u ON r.analista_apertura_id = u.id
      WHERE r.id = $1
    `, [id]);

        if (!resultReactivo.rows[0]) return null;

        // Consulta de pictogramas asociados
        const resultPictogramas = await pool.query(`
      SELECT pic.id, pic.nombre, pic.codigo_ghs, pic.imagen_url
      FROM pictogramas pic
      INNER JOIN reactivo_pictogramas rp ON pic.id = rp.pictograma_id
      WHERE rp.reactivo_id = $1
    `, [id]);

        return {
            ...resultReactivo.rows[0],
            pictogramas: resultPictogramas.rows,
        };
    },

    // ── CREAR con transacción (reactivo + pictogramas) ──────────────
    async create(datos, pictogramaIds = []) {
        // BEGIN inicia una transacción: si algo falla, hacemos ROLLBACK
        // y ningún cambio queda en la base de datos
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Insertar el reactivo
            const resultReactivo = await client.query(`
        INSERT INTO reactivos (
          codigo_interno, nombre, sinonimos, cas, formula_molecular,
          marca, proveedor_id, concentracion, presentacion,
          cantidad_inicial, cantidad_actual, unidad_medida,
          lote, fecha_vencimiento, fecha_ingreso, fecha_apertura,
          analista_apertura_id, estado, ubicacion, almacenamiento,
          peligrosidad, numero_un, tipo_residuo,
          ficha_seguridad_url, es_controlado, precio
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24,$25,$26
        ) RETURNING *
      `, [
                datos.codigo_interno, datos.nombre, datos.sinonimos,
                datos.cas, datos.formula_molecular, datos.marca,
                datos.proveedor_id, datos.concentracion, datos.presentacion,
                datos.cantidad_inicial, datos.cantidad_inicial,  // cantidad_actual = inicial al crear
                datos.unidad_medida, datos.lote,
                datos.fecha_vencimiento, datos.fecha_ingreso, datos.fecha_apertura,
                datos.analista_apertura_id, datos.estado || 'en_inventario',
                datos.ubicacion, datos.almacenamiento,
                datos.peligrosidad, datos.numero_un, datos.tipo_residuo,
                datos.ficha_seguridad_url, datos.es_controlado || false,
                datos.precio,
            ]);

            const reactivo = resultReactivo.rows[0];

            // 2. Insertar los pictogramas en la tabla intermedia
            if (pictogramaIds.length > 0) {
                for (const picId of pictogramaIds) {
                    await client.query(
                        'INSERT INTO reactivo_pictogramas (reactivo_id, pictograma_id) VALUES ($1, $2)',
                        [reactivo.id, picId]
                    );
                }
            }

            await client.query('COMMIT'); // todo salió bien, confirmar cambios
            return reactivo;

        } catch (err) {
            await client.query('ROLLBACK'); // algo falló, revertir todo
            throw err; // propagar el error al controller
        } finally {
            client.release(); // siempre devolver la conexión al pool
        }
    },

    // ── ACTUALIZAR con transacción ─────────────────────────────────
    async update(id, datos, pictogramaIds) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Construimos el SET dinámicamente: solo actualizamos los campos enviados
            const campos = [];
            const valores = [];

            const camposPermitidos = [
                'codigo_interno', 'nombre', 'sinonimos', 'cas', 'formula_molecular',
                'marca', 'proveedor_id', 'concentracion', 'presentacion',
                'cantidad_inicial', 'unidad_medida', 'lote', 'fecha_vencimiento',
                'fecha_ingreso', 'fecha_apertura', 'analista_apertura_id',
                'estado', 'ubicacion', 'almacenamiento', 'peligrosidad',
                'numero_un', 'tipo_residuo', 'ficha_seguridad_url',
                'es_controlado', 'precio',
            ];

            for (const campo of camposPermitidos) {
                if (datos[campo] !== undefined) {
                    valores.push(datos[campo]);
                    campos.push(`${campo} = $${valores.length}`);
                }
            }

            if (campos.length === 0 && pictogramaIds === undefined) {
                await client.query('ROLLBACK');
                return null; // nada que actualizar
            }

            let reactivo = null;
            if (campos.length > 0) {
                valores.push(id);
                const result = await client.query(`
          UPDATE reactivos SET ${campos.join(', ')}
          WHERE id = $${valores.length}
          RETURNING *
        `, valores);
                reactivo = result.rows[0];
            }

            // Si vienen nuevos pictogramas, reemplazamos los anteriores
            if (pictogramaIds !== undefined) {
                await client.query(
                    'DELETE FROM reactivo_pictogramas WHERE reactivo_id = $1', [id]
                );
                for (const picId of pictogramaIds) {
                    await client.query(
                        'INSERT INTO reactivo_pictogramas (reactivo_id, pictograma_id) VALUES ($1, $2)',
                        [id, picId]
                    );
                }
            }

            await client.query('COMMIT');
            return reactivo;

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    },

    // ── ELIMINAR ───────────────────────────────────────────────────
  async delete(id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar si tiene consumos SICOQ
    const resConsumos = await client.query(
      `SELECT COUNT(*) FROM sicoq_consumos WHERE reactivo_id = $1`,
      [id]
    );

    // Verificar si está en preparaciones
    const resPreps = await client.query(
      `SELECT COUNT(*) FROM preparacion_reactivos WHERE reactivo_id = $1`,
      [id]
    );

    const tieneConsumos      = parseInt(resConsumos.rows[0].count) > 0;
    const tienePreparaciones = parseInt(resPreps.rows[0].count) > 0;
    const tieneHistorial     = tieneConsumos || tienePreparaciones;

    let reactivo;

    if (tieneHistorial) {
      // Tiene historial — borrado lógico
      // El reactivo se desactiva pero sus registros se conservan
      const result = await client.query(
        `UPDATE reactivos
         SET activo = false, estado = 'agotado', updated_at = NOW()
         WHERE id = $1
         RETURNING id, nombre, codigo_interno`,
        [id]
      );
      reactivo = {
        ...result.rows[0],
        tipo_eliminacion: 'logico',
        razon: tieneConsumos
          ? 'Tiene registros SICOQ asociados'
          : 'Está referenciado en preparaciones',
      };
    } else {
      // Sin historial — borrado físico seguro
      // Primero eliminamos las relaciones de pictogramas
      await client.query(
        `DELETE FROM reactivo_pictogramas WHERE reactivo_id = $1`,
        [id]
      );

      const result = await client.query(
        `DELETE FROM reactivos WHERE id = $1
         RETURNING id, nombre, codigo_interno`,
        [id]
      );

      if (!result.rows[0]) {
        await client.query('ROLLBACK');
        const err = new Error('Reactivo no encontrado');
        err.code = 'NOT_FOUND';
        throw err;
      }

      reactivo = {
        ...result.rows[0],
        tipo_eliminacion: 'fisico',
      };
    }

    await client.query('COMMIT');
    return reactivo;

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
},

    // ── PRÓXIMOS A VENCER ──────────────────────────────────────────
    async proximosVencer(dias = 90) {
        const result = await pool.query(`
      SELECT
        r.id, r.codigo_interno, r.nombre, r.fecha_vencimiento,
        r.estado, r.ubicacion, r.cantidad_actual, r.unidad_medida,
        (r.fecha_vencimiento - CURRENT_DATE) AS dias_restantes
      FROM reactivos r
      WHERE
        r.fecha_vencimiento IS NOT NULL
        AND r.fecha_vencimiento <= CURRENT_DATE + INTERVAL '1 day' * $1
        AND r.fecha_vencimiento >= CURRENT_DATE
        AND r.estado != 'agotado'
      ORDER BY r.fecha_vencimiento ASC
    `, [dias]);
        return result.rows;
    },

    // ── VERIFICAR código interno duplicado ─────────────────────────
    async existeCodigo(codigo, excluirId = null) {
        const params = [codigo];
        let query = 'SELECT id FROM reactivos WHERE codigo_interno = $1';
        if (excluirId) {
            params.push(excluirId);
            query += ` AND id != $2`;
        }
        const result = await pool.query(query, params);
        return result.rows.length > 0;
    },
};

module.exports = ReactivoModel;