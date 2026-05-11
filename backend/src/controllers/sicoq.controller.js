// controllers/sicoq.controller.js
//
// El controller es el intermediario entre las rutas y el modelo.
// Su responsabilidad es:
//   1. Recibir la petición HTTP
//   2. Validar los datos con Joi
//   3. Llamar al modelo con los datos limpios
//   4. Responder al cliente con el resultado o el error apropiado
//
// El controller NO escribe SQL — eso es trabajo del modelo.
// El controller NO define URLs — eso es trabajo de las rutas.

const Joi        = require('joi');
const SicoqModel = require('../models/sicoq.model');
const pool = require('../config/db');


// ── Esquema de validación para registrar un consumo ────────────
//
// Joi define exactamente qué campos se esperan, de qué tipo
// y si son obligatorios o no. Si los datos no cumplen el esquema,
// respondemos con 400 antes de tocar la base de datos.
// Esto protege la BD de datos incorrectos o maliciosos.

const schemaConsumo = Joi.object({
  reactivo_id: Joi.string().uuid().required()
    .messages({ 'string.guid': 'El ID del reactivo debe ser un UUID válido' }),

  nombre_responsable: Joi.string().min(3).max(100).required()
    .messages({ 'string.empty': 'El nombre del responsable es requerido' }),

  cantidad: Joi.number().positive().required()
    .messages({ 'number.positive': 'La cantidad debe ser un número positivo' }),

  unidad: Joi.string()
    .valid('L', 'mL', 'µL', 'g', 'kg', 'mg', 'µg')
    .required()
    .messages({ 'any.only': 'Unidad no válida. Use: L, mL, µL, g, kg, mg o µg' }),

  uso_descripcion: Joi.string().min(5).max(500).required()
    .messages({ 'string.empty': 'Debe describir para qué se usó el reactivo' }),

  observaciones: Joi.string().max(500).allow('', null),

  numero_acta: Joi.string().max(50).allow('', null),
});

const SicoqController = {

  // POST /api/sicoq/consumos
  // Registra un nuevo consumo y descuenta el inventario
  async registrarConsumo(req, res) {
    try {
      // ── Paso 1: Validar con Joi ──────────────────────────────
      const { error, value } = schemaConsumo.validate(req.body, {
        abortEarly: false, // muestra todos los errores, no solo el primero
      });

      if (error) {
        return res.status(400).json({
          error:    'Datos inválidos',
          detalles: error.details.map(d => d.message),
        });
      }

      // ── Paso 2: Agregar el ID del usuario autenticado ────────
      // req.usuario viene del middleware autenticar — es el usuario
      // que está haciendo la petición con su token JWT.
      // Lo guardamos en el registro para tener trazabilidad completa.
      value.responsable_id = req.usuario.id;

      // ── Paso 3: Llamar al modelo ─────────────────────────────
      const resultado = await SicoqModel.registrarConsumo(value);

      // ── Paso 4: Responder con éxito ──────────────────────────
      res.status(201).json({
        message:  'Consumo registrado correctamente',
        consumo:  resultado.consumo,
        reactivo: resultado.reactivo, // incluye la nueva cantidad_actual
      });

    } catch (err) {
      // ── Manejo de errores con código personalizado ───────────
      // El modelo lanza errores con err.code para que el controller
      // pueda responder con el mensaje y status HTTP correcto.
      // Esto es mucho más limpio que retornar objetos especiales.

      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({ error: err.message });
      }
      if (err.code === 'NOT_CONTROLLED') {
        return res.status(400).json({ error: err.message });
      }
      if (err.code === 'INSUFFICIENT_QUANTITY') {
        return res.status(400).json({ error: err.message });
      }

      // Cualquier otro error no esperado
      console.error('Error al registrar consumo SICOQ:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // GET /api/sicoq/consumos
  // Lista el historial completo con filtros opcionales
  async listarConsumos(req, res) {
    try {
      // Los filtros llegan como query params en la URL
      // Ejemplo: /api/sicoq/consumos?desde=2026-01-01&hasta=2026-03-31
      const { pagina, limite, reactivo_id, nombre_responsable, desde, hasta } = req.query;

      const resultado = await SicoqModel.findAll({
        pagina:             parseInt(pagina)  || 1,
        limite:             parseInt(limite)  || 20,
        reactivo_id:        reactivo_id        || null,
        nombre_responsable: nombre_responsable || null,
        desde:              desde              || null,
        hasta:              hasta              || null,
      });

      res.json(resultado);

    } catch (err) {
      console.error('Error al listar consumos SICOQ:', err);
      res.status(500).json({ error: 'Error al obtener historial de consumos' });
    }
  },

  // GET /api/sicoq/consumos/:id
  // Retorna el detalle completo de un consumo específico
  async obtenerConsumo(req, res) {
    try {
      const consumo = await SicoqModel.findById(req.params.id);

      if (!consumo) {
        return res.status(404).json({ error: 'Registro de consumo no encontrado' });
      }

      res.json(consumo);

    } catch (err) {
      console.error('Error al obtener consumo:', err);
      res.status(500).json({ error: 'Error al obtener el registro' });
    }
  },

  // GET /api/sicoq/reactivos
  // Lista solo los reactivos controlados disponibles
  // Este endpoint alimenta el buscador del formulario en el frontend
  async listarReactivosControlados(req, res) {
    try {
      // El parámetro q es el texto de búsqueda del buscador
      const { q } = req.query;
      const reactivos = await SicoqModel.findReactivosControlados(q || null);
      res.json(reactivos);

    } catch (err) {
      console.error('Error al listar reactivos controlados:', err);
      res.status(500).json({ error: 'Error al obtener reactivos controlados' });
    }
  },
  // Agregar dentro del objeto SicoqController, después de listarReactivosControlados:

  // DELETE /api/sicoq/consumos/:id  — solo admin
  async eliminarConsumo(req, res) {
    try {
      const result = await pool.query(
        'DELETE FROM sicoq_consumos WHERE id = $1 RETURNING id',
        [req.params.id]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Registro no encontrado' });
      }
      res.json({ message: 'Registro eliminado correctamente' });
    } catch (err) {
      console.error('Error al eliminar consumo:', err);
      res.status(500).json({ error: 'Error al eliminar el registro' });
    }
  },
};

module.exports = SicoqController;