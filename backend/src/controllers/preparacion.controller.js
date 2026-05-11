// controllers/preparacion.controller.js

const Joi = require('joi');
const PreparacionModel = require('../models/preparacion.model');

// ── Esquema de validación ─────────────────────────────────────────
// Definimos el esquema del reactivo dentro de la preparación
const schemaReactivoUsado = Joi.object({
  reactivo_id: Joi.string().uuid().required()
    .messages({ 'string.guid': 'El ID del reactivo debe ser un UUID válido' }),
  cantidad: Joi.number().positive().required(),
  unidad: Joi.string()
    .valid('L', 'mL', 'µL', 'g', 'kg', 'mg', 'µg', 'unidad')
    .required(),
  concentracion: Joi.string().max(80).allow('', null),
  orden: Joi.number().integer().min(1).allow(null),
  observacion: Joi.string().max(300).allow('', null),
});

const schemaPreparacion = Joi.object({
  reactivo_principal_id: Joi.string().uuid().allow('', null),
  nombre: Joi.string().min(3).max(200).required()
    .messages({ 'string.empty': 'El nombre de la preparación es requerido' }),
  descripcion: Joi.string().allow('', null),
  volumen_final: Joi.number().positive().allow(null),
  unidad_volumen: Joi.string().valid('L', 'mL', 'µL').default('mL'),
  procedimiento: Joi.string().allow('', null),
  observaciones: Joi.string().allow('', null),
  fecha_preparacion: Joi.date().default(() => new Date()),
  fecha_vencimiento: Joi.date().allow(null),
  responsable_id: Joi.string().uuid().allow('', null),
  estado: Joi.string()
    .valid('activa', 'vencida', 'descartada')
    .default('activa'),
  // Array de reactivos usados en la preparación
  reactivos_usados: Joi.array().items(schemaReactivoUsado).default([]),
});

const PreparacionController = {

  // GET /api/preparaciones
  async listar(req, res) {
    try {
      const { pagina, limite, busqueda, estado, responsable_id } = req.query;
      const resultado = await PreparacionModel.findAll({
        pagina: parseInt(pagina) || 1,
        limite: parseInt(limite) || 20,
        busqueda: busqueda || null,
        estado: estado || null,
        responsable_id: responsable_id || null,
      });
      res.json(resultado);
    } catch (err) {
      console.error('Error al listar preparaciones:', err);
      res.status(500).json({ error: 'Error al obtener preparaciones' });
    }
  },

  // GET /api/preparaciones/:id
  async obtenerUna(req, res) {
    try {
      const preparacion = await PreparacionModel.findById(req.params.id);
      if (!preparacion) {
        return res.status(404).json({ error: 'Preparación no encontrada' });
      }
      res.json(preparacion);
    } catch (err) {
      console.error('Error al obtener preparación:', err);
      res.status(500).json({ error: 'Error al obtener la preparación' });
    }
  },

  // POST /api/preparaciones
  async crear(req, res) {
    try {
      const { error, value } = schemaPreparacion.validate(req.body, {
        abortEarly: false,
      });
      if (error) {
        return res.status(400).json({
          error: 'Datos inválidos',
          detalles: error.details.map(d => d.message),
        });
      }

      // Si no se especifica responsable, usamos el usuario autenticado
      if (!value.responsable_id) {
        value.responsable_id = req.usuario.id;
      }

      const { reactivos_usados, ...datosPrepacion } = value;
      const preparacion = await PreparacionModel.create(
        datosPrepacion, reactivos_usados
      );

      res.status(201).json({
        message: 'Preparación registrada correctamente',
        preparacion,
      });
    } catch (err) {
      console.error('Error al crear preparación:', err);
      res.status(500).json({ error: 'Error al registrar la preparación' });
    }
  },

  // PUT /api/preparaciones/:id
  async actualizar(req, res) {
    try {
      // Verificar que la preparación existe
      const preparacion = await PreparacionModel.findById(req.params.id);
      if (!preparacion) {
        return res.status(404).json({ error: 'Preparación no encontrada' });
      }

      // Convertir campos numéricos que pueden llegar como string
      const body = { ...req.body };
      if (body.volumen_final !== undefined)
        body.volumen_final = body.volumen_final
          ? parseFloat(body.volumen_final) : null;

      // Validación parcial — ningún campo es obligatorio en edición
      const { error, value } = schemaPreparacion
        .fork(
          Object.keys(schemaPreparacion.describe().keys),
          f => f.optional()
        )
        .validate(body, { abortEarly: false });

      if (error) {
        return res.status(400).json({
          error: 'Datos inválidos',
          detalles: error.details.map(d => d.message),
        });
      }

      const { reactivos_usados, ...datosActualizar } = value;

      // Llamar al modelo
      await PreparacionModel.update(
        req.params.id,
        datosActualizar,
        reactivos_usados  // puede ser undefined si no se envió
      );

      // Retornar el registro actualizado completo
      const actualizada = await PreparacionModel.findById(req.params.id);
      res.json({
        message: 'Preparación actualizada correctamente',
        preparacion: actualizada,
      });

    } catch (err) {
      console.error('Error al actualizar preparación:', err);
      res.status(500).json({
        error: process.env.NODE_ENV === 'production'
          ? 'Error interno del servidor'
          : err.message,   // en desarrollo muestra el error real
      });
    }
  },
  // DELETE /api/preparaciones/:id — solo admin (manejado en routes)
  async eliminar(req, res) {
    try {
      const eliminada = await PreparacionModel.delete(req.params.id);
      if (!eliminada) {
        return res.status(404).json({ error: 'Preparación no encontrada' });
      }
      res.json({
        message: 'Preparación eliminada correctamente',
        preparacion: eliminada,
      });
    } catch (err) {
      console.error('Error al eliminar preparación:', err);
      res.status(500).json({ error: 'Error al eliminar la preparación' });
    }
  },
};

module.exports = PreparacionController;