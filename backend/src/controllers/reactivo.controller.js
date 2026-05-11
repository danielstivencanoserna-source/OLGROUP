// controllers/reactivo.controller.js

const Joi = require('joi');
const ReactivoModel = require('../models/reactivo.model');
const path = require('path');
const fs = require('fs');

// ── Esquema de validación ─────────────────────────────────────────
// Definimos qué campos son obligatorios y sus formatos válidos.
// Joi valida antes de tocar la base de datos.

const schemaReactivo = Joi.object({
  codigo_interno: Joi.string().max(50).required(),
  nombre: Joi.string().max(200).required(),
  sinonimos: Joi.string().allow('', null),
  cas: Joi.string().max(30).allow('', null),
  formula_molecular: Joi.string().max(100).allow('', null),
  marca: Joi.string().max(100).allow('', null),
  proveedor_id: Joi.string().uuid().allow('', null),
  concentracion: Joi.string().max(80).allow('', null),
  presentacion: Joi.string().max(100).allow('', null),
  cantidad_inicial: Joi.number().positive().required(),
  unidad_medida: Joi.string().valid('L', 'mL', 'g', 'kg', 'mg', 'µg', 'µL', 'unidad').required(),
  lote: Joi.string().max(80).allow('', null),
  fecha_vencimiento: Joi.date().allow(null),
  fecha_ingreso: Joi.date().default(() => new Date()),
  fecha_apertura: Joi.date().allow(null),
  analista_apertura_id: Joi.string().uuid().allow('', null),
  estado: Joi.string()
    .valid('en_uso', 'agotado', 'en_compra', 'en_inventario')
    .default('en_inventario'),
  ubicacion: Joi.string().max(100).allow('', null),
  almacenamiento: Joi.string().allow('', null),
  peligrosidad: Joi.string().max(100).allow('', null),
  numero_un: Joi.string().max(20).allow('', null),
  tipo_residuo: Joi.string()
    .valid('acido', 'base', 'halogenado', 'organico', 'inorganico', 'especial')
    .allow('', null),
  es_controlado: Joi.boolean().default(false),
  precio: Joi.number().min(0).allow(null),
  // pictogramas viene como array de UUIDs
  pictograma_ids: Joi.array().items(Joi.string().uuid()).default([]),
});

// ── Helpers ───────────────────────────────────────────────────────

// Elimina el PDF anterior cuando se sube uno nuevo
function eliminarPDFAnterior(urlAnterior) {
  if (!urlAnterior) return;
  const nombreArchivo = path.basename(urlAnterior);
  const rutaArchivo = path.join(__dirname, '../uploads', nombreArchivo);
  if (fs.existsSync(rutaArchivo)) {
    fs.unlinkSync(rutaArchivo);
  }
}

// Construye la URL pública del PDF subido
function construirUrlPDF(req, nombreArchivo) {
  return `${req.protocol}://${req.get('host')}/uploads/${nombreArchivo}`;
}

// ── Controllers ───────────────────────────────────────────────────

const ReactivoController = {

  // GET /api/reactivos
  async listar(req, res) {
    try {
      const { pagina, limite, busqueda, estado, controlado } = req.query;
      const resultado = await ReactivoModel.findAll({
        pagina: parseInt(pagina) || 1,
        limite: parseInt(limite) || 20,
        busqueda: busqueda || null,
        estado: estado || null,
        esControlado: controlado !== undefined
          ? controlado === 'true'
          : undefined,
      });
      res.json(resultado);
    } catch (err) {
      console.error('Error al listar reactivos:', err);
      res.status(500).json({ error: 'Error al obtener reactivos' });
    }
  },

  // GET /api/reactivos/:id
  async obtenerUno(req, res) {
    try {
      const reactivo = await ReactivoModel.findById(req.params.id);
      if (!reactivo) {
        return res.status(404).json({ error: 'Reactivo no encontrado' });
      }
      res.json(reactivo);
    } catch (err) {
      console.error('Error al obtener reactivo:', err);
      res.status(500).json({ error: 'Error al obtener reactivo' });
    }
  },

  // POST /api/reactivos
  async crear(req, res) {
    try {
      // El body viene como texto cuando hay archivo (multipart/form-data)
      // Joi lo valida igual
      const body = { ...req.body };

      // Convertir campos que llegan como string desde multipart
      if (body.es_controlado !== undefined)
        body.es_controlado = body.es_controlado === 'true';
      if (body.cantidad_inicial !== undefined)
        body.cantidad_inicial = parseFloat(body.cantidad_inicial);
      if (body.precio !== undefined)
        body.precio = body.precio ? parseFloat(body.precio) : null;
      if (body.pictograma_ids && typeof body.pictograma_ids === 'string')
        body.pictograma_ids = JSON.parse(body.pictograma_ids);

      // Validar con Joi
      const { error, value } = schemaReactivo.validate(body, { abortEarly: false });
      if (error) {
        // Si se subió un PDF pero los datos son inválidos, eliminarlo
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          error: 'Datos inválidos',
          detalles: error.details.map(d => d.message),
        });
      }

      // Verificar código interno único
      const codigoDuplicado = await ReactivoModel.existeCodigo(value.codigo_interno);
      if (codigoDuplicado) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(409).json({ error: 'El código interno ya existe' });
      }

      // Si se subió PDF, construir la URL
      if (req.file) {
        value.ficha_seguridad_url = construirUrlPDF(req, req.file.filename);
      }

      const { pictograma_ids, ...datosReactivo } = value;
      const reactivo = await ReactivoModel.create(datosReactivo, pictograma_ids);

      res.status(201).json({
        message: 'Reactivo creado correctamente',
        reactivo,
      });

    } catch (err) {
      if (req.file) fs.unlinkSync(req.file.path);
      console.error('Error al crear reactivo:', err);
      res.status(500).json({ error: 'Error al crear reactivo' });
    }
  },

  // PUT /api/reactivos/:id
  async actualizar(req, res) {
    try {
      const { id } = req.params;

      // Verificar que el reactivo existe
      const reactivoActual = await ReactivoModel.findById(id);
      if (!reactivoActual) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Reactivo no encontrado' });
      }

      const body = { ...req.body };
      if (body.es_controlado !== undefined) {
        // Si ya es un booleano, lo deja como está. Si es el string 'true', lo vuelve true.
        body.es_controlado = String(body.es_controlado).toLowerCase() === 'true';
      }
      if (body.cantidad_inicial !== undefined)
        body.cantidad_inicial = parseFloat(body.cantidad_inicial);
      if (body.precio !== undefined)
        body.precio = body.precio ? parseFloat(body.precio) : null;
      if (body.pictograma_ids && typeof body.pictograma_ids === 'string')
        body.pictograma_ids = JSON.parse(body.pictograma_ids);

      // Validación parcial — en PUT no exigimos todos los campos
      const { error, value } = schemaReactivo
        .fork(Object.keys(schemaReactivo.describe().keys), (f) => f.optional())
        .validate(body, { abortEarly: false });

      if (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          error: 'Datos inválidos',
          detalles: error.details.map(d => d.message),
        });
      }

      // Verificar código único si se cambió
      if (value.codigo_interno) {
        const duplicado = await ReactivoModel.existeCodigo(value.codigo_interno, id);
        if (duplicado) {
          if (req.file) fs.unlinkSync(req.file.path);
          return res.status(409).json({ error: 'El código interno ya existe' });
        }
      }

      // Si se subió PDF nuevo, eliminar el anterior y actualizar URL
      if (req.file) {
        eliminarPDFAnterior(reactivoActual.ficha_seguridad_url);
        value.ficha_seguridad_url = construirUrlPDF(req, req.file.filename);
      }

      const { pictograma_ids, ...datosActualizar } = value;
      await ReactivoModel.update(id, datosActualizar, pictograma_ids);

      // Retornar el reactivo actualizado completo
      const reactivoActualizado = await ReactivoModel.findById(id);
      res.json({
        message: 'Reactivo actualizado correctamente',
        reactivo: reactivoActualizado,
      });

    } catch (err) {
      if (req.file) fs.unlinkSync(req.file.path);
      console.error('Error al actualizar reactivo:', err);
      res.status(500).json({ error: 'Error al actualizar reactivo' });
    }
  },

  // DELETE /api/reactivos/:id  (solo admin)
  async eliminar(req, res) {
  try {
    // Verificar que existe
    const reactivo = await ReactivoModel.findById(req.params.id);
    if (!reactivo) {
      return res.status(404).json({ error: 'Reactivo no encontrado' });
    }

    const eliminado = await ReactivoModel.delete(req.params.id);

    if (eliminado.tipo_eliminacion === 'logico') {
      // Se desactivó — conserva historial
      return res.json({
        message: `El reactivo "${eliminado.nombre}" fue retirado del inventario.
                  Sus registros históricos se conservan para trazabilidad.`,
        reactivo:         eliminado,
        tipo_eliminacion: 'logico',
        razon:            eliminado.razon,
      });
    }

    // Borrado físico — también eliminar PDF si tenía
    eliminarPDFAnterior(reactivo.ficha_seguridad_url);

    return res.json({
      message:          `Reactivo "${eliminado.nombre}" eliminado permanentemente.`,
      reactivo:         eliminado,
      tipo_eliminacion: 'fisico',
    });

  } catch (err) {
    // Manejar errores con código personalizado del modelo
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Reactivo no encontrado' });
    }
    console.error('Error al eliminar reactivo:', err);
    res.status(500).json({
      error:   'Error al eliminar reactivo',
      detalle: process.env.NODE_ENV !== 'production' ? err.message : undefined,
    });
  }
},

  // GET /api/reactivos/proximos-vencer?dias=90
  async proximosVencer(req, res) {
    try {
      const dias = parseInt(req.query.dias) || 90;
      const reactivos = await ReactivoModel.proximosVencer(dias);
      res.json({ reactivos, total: reactivos.length, dias });
    } catch (err) {
      console.error('Error al obtener próximos a vencer:', err);
      res.status(500).json({ error: 'Error al obtener reactivos por vencer' });
    }
  },
};

module.exports = ReactivoController;