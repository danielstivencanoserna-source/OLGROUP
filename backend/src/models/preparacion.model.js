const pool = require('../config/db');

const PreparacionModel = {

  // ── LISTAR con paginación y búsqueda ───────────────────────────
  async findAll({ pagina = 1, limite = 20, busqueda, estado, responsable_id }) {
    const offset = (pagina - 1) * limite;
    const params = [];
    const condiciones = [];

    if (busqueda) {
      params.push(`%${busqueda}%`);
      condiciones.push(
        `(ps.nombre ILIKE $${params.length} OR ps.descripcion ILIKE $${params.length})`
      );
    }

    if (estado) {
      params.push(estado);
      condiciones.push(`ps.estado = $${params.length}`);
    }

    if (responsable_id) {
      params.push(responsable_id);
      condiciones.push(`ps.responsable_id = $${params.length}`);
    }

    const where = condiciones.length > 0
      ? 'WHERE ' + condiciones.join(' AND ')
      : '';

    const paramsCount = [...params];
    params.push(limite, offset);

    const queryDatos = `
      SELECT
        ps.id, ps.nombre, ps.descripcion, ps.volumen_final,
        ps.unidad_volumen, ps.fecha_preparacion, ps.fecha_vencimiento,
        ps.estado, ps.created_at,
        u.nombre AS responsable_nombre,
        -- Contamos cuántos reactivos tiene esta preparación
        COUNT(pr.id)::int AS total_reactivos
      FROM preparacion_soluciones ps
      LEFT JOIN usuarios u           ON ps.responsable_id = u.id
      LEFT JOIN preparacion_reactivos pr ON ps.id = pr.preparacion_id
      ${where}
      GROUP BY ps.id, u.nombre
      ORDER BY ps.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const queryTotal = `
      SELECT COUNT(DISTINCT ps.id)
      FROM preparacion_soluciones ps
      ${where}
    `;

    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, params),
      pool.query(queryTotal, paramsCount),
    ]);

    return {
      datos: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count),
      pagina,
      limite,
      totalPaginas: Math.ceil(resultTotal.rows[0].count / limite),
    };
  },

  // ── OBTENER UNA preparación con todos sus reactivos ────────────
  async findById(id) {
    // Primero traemos los datos generales de la preparación
    // En findById(), reemplaza la consulta por esta:
    const resultPrep = await pool.query(`
  SELECT
    ps.*,
    u.nombre  AS responsable_nombre,
    u.email   AS responsable_email,
    r.nombre  AS reactivo_principal_nombre,
    r.cas     AS reactivo_principal_cas
  FROM preparacion_soluciones ps
  LEFT JOIN usuarios  u ON ps.responsable_id = u.id
  LEFT JOIN reactivos r ON ps.reactivo_principal_id = r.id
  WHERE ps.id = $1
`, [id]);

    if (!resultPrep.rows[0]) return null;

    // Luego traemos los reactivos usados con sus datos completos
    // Ordenamos por el campo 'orden' para mostrarlos en el orden
    // correcto de adición durante el procedimiento
    const resultReactivos = await pool.query(`
      SELECT
        pr.id, pr.cantidad, pr.unidad, pr.concentracion,
        pr.orden, pr.observacion,
        r.id             AS reactivo_id,
        r.nombre         AS reactivo_nombre,
        r.codigo_interno AS reactivo_codigo,
        r.cas            AS reactivo_cas,
        r.formula_molecular
      FROM preparacion_reactivos pr
      INNER JOIN reactivos r ON pr.reactivo_id = r.id
      WHERE pr.preparacion_id = $1
      ORDER BY pr.orden ASC
    `, [id]);

    return {
      ...resultPrep.rows[0],
      reactivos: resultReactivos.rows,
    };
  },

  // ── CREAR nueva preparación ────────────────────────────────────
  async create(datos) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const resultPrep = await client.query(`
        INSERT INTO preparacion_soluciones (
          nombre, descripcion, volumen_final, unidad_volumen,
          procedimiento, observaciones, fecha_preparacion,
          fecha_vencimiento, responsable_id, estado,
          reactivo_principal_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING *
      `, [
        datos.nombre, datos.descripcion,
        datos.volumen_final, datos.unidad_volumen || 'mL',
        datos.procedimiento, datos.observaciones,
        datos.fecha_preparacion || new Date(),
        datos.fecha_vencimiento || null,
        datos.responsable_id, datos.estado || 'activa',
        datos.reactivo_principal_id || null,
      ]);

      await client.query('COMMIT');
      return resultPrep.rows[0];

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // ── ACTUALIZAR preparación ─────────────────────────────────────
  async update(id, datos, reactivosUsados) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const campos  = [];
    const valores = [];
    const camposPermitidos = [
      'nombre', 'descripcion', 'volumen_final', 'unidad_volumen',
      'procedimiento', 'observaciones', 'fecha_preparacion',
      'fecha_vencimiento', 'responsable_id', 'estado',
      'reactivo_principal_id',
    ];

    for (const campo of camposPermitidos) {
      if (datos[campo] !== undefined) {
        valores.push(datos[campo]);
        campos.push(`${campo} = $${valores.length}`);
      }
    }

    // ── CORRECCIÓN: siempre hacemos UPDATE aunque no haya campos
    // para que returned el registro actual
    valores.push(id);
    const setClause = campos.length > 0
      ? campos.join(', ')
      : 'updated_at = NOW()'; // al menos actualizamos el timestamp

    const result = await client.query(`
      UPDATE preparacion_soluciones
      SET ${setClause}
      WHERE id = $${valores.length}
      RETURNING *
    `, valores);

    const preparacion = result.rows[0];

    // Reemplazar reactivos si vienen en el body
    if (reactivosUsados !== undefined && Array.isArray(reactivosUsados)) {
      await client.query(
        'DELETE FROM preparacion_reactivos WHERE preparacion_id = $1', [id]
      );
      for (let i = 0; i < reactivosUsados.length; i++) {
        const r = reactivosUsados[i];
        if (!r.reactivo_id) continue; // saltar filas vacías
        await client.query(`
          INSERT INTO preparacion_reactivos (
            preparacion_id, reactivo_id, cantidad,
            unidad, concentracion, orden, observacion
          ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        `, [
          id,
          r.reactivo_id,
          r.cantidad,
          r.unidad,
          r.concentracion || null,
          r.orden || (i + 1),
          r.observacion || null,
        ]);
      }
    }

    await client.query('COMMIT');
    return preparacion;

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
},

  // ── ELIMINAR — CASCADE borra los reactivos de la tabla intermedia
  async delete(id) {
    const result = await pool.query(
      `DELETE FROM preparacion_soluciones
       WHERE id = $1
       RETURNING id, nombre`,
      [id]
    );
    return result.rows[0];
  },
};

module.exports = PreparacionModel;