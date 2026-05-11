// routes/sicoq.routes.js
//
// Este archivo solo define las URLs y qué controller maneja cada una.
// No tiene lógica de negocio — solo conecta URLs con controllers.
//
// Nota sobre el orden de las rutas:
// Las rutas más específicas deben ir ANTES que las genéricas.
// Si /reactivos fuera después de /:id, Express trataría
// la palabra "reactivos" como si fuera un ID, lo que causaría errores.

const express = require('express');
const router = express.Router();
const SicoqController = require('../controllers/sicoq.controller');
const { autenticar, autorizar } = require('../middlewares/auth.middleware');

// LECTURA — todos pueden ver
router.get('/reactivos', autenticar, SicoqController.listarReactivosControlados);
router.get('/consumos', autenticar, SicoqController.listarConsumos);
router.get('/consumos/:id', autenticar, SicoqController.obtenerConsumo);

// ESCRITURA — admin y analista pueden registrar consumos
router.post('/consumos',
  autenticar,
  autorizar('admin', 'analista'),
  SicoqController.registrarConsumo
);

// ELIMINAR consumo — solo admin
router.delete('/consumos/:id',
  autenticar,
  autorizar('admin'),
  SicoqController.eliminarConsumo     // lo agregamos abajo
);

// ── Rutas específicas PRIMERO ────────────────────────────────────
// Lista reactivos controlados disponibles (para el buscador)
router.get('/reactivos',
  autenticar,
  SicoqController.listarReactivosControlados
);

// ── Rutas de consumos ────────────────────────────────────────────
// Registrar un nuevo consumo
router.post('/consumos',
  autenticar,
  SicoqController.registrarConsumo
);

// Listar historial de consumos con filtros
router.get('/consumos',
  autenticar,
  SicoqController.listarConsumos
);

// Ver detalle de un consumo específico
router.get('/consumos/:id',
  autenticar,
  SicoqController.obtenerConsumo
);

module.exports = router;