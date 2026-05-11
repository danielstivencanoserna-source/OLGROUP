// routes/preparacion.routes.js

const express                 = require('express');
const router                  = express.Router();
const PreparacionController   = require('../controllers/preparacion.controller');
const { autenticar, autorizar } = require('../middlewares/auth.middleware');

// LECTURA — todos los roles autenticados
router.get('/',    autenticar, PreparacionController.listar);
router.get('/:id', autenticar, PreparacionController.obtenerUna);

// ESCRITURA — admin y analista (soloLectura bloquea auditores)
router.post('/',
  autenticar,
  autorizar('admin', 'analista'),
  PreparacionController.crear
);

router.put('/:id',
  autenticar,
  autorizar('admin', 'analista'),
  PreparacionController.actualizar
);

// ELIMINAR — solo admin
router.delete('/:id',
  autenticar,
  autorizar('admin'),
  PreparacionController.eliminar
);

module.exports = router;