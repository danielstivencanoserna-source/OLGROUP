// routes/reactivo.routes.js

const express = require('express');
const router = express.Router();
const ReactivoController = require('../controllers/reactivo.controller');
const { autenticar, autorizar } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

// Todos los endpoints de reactivos requieren estar autenticado
// autenticar va primero en TODOS

// Ruta especial — debe ir ANTES de /:id para que no lo confunda con un ID
router.get('/proximos-vencer',
    autenticar,
    ReactivoController.proximosVencer
);

// CRUD principal
router.get('/',
    autenticar,
    ReactivoController.listar
);

router.get('/:id',
    autenticar,
    ReactivoController.obtenerUno
);

router.post('/',
    autenticar,
    upload.single('ficha_seguridad'),  // procesar PDF si viene
    ReactivoController.crear
);

router.put('/:id',
    autenticar,
    upload.single('ficha_seguridad'),  // PDF opcional en actualización
    ReactivoController.actualizar
);

router.delete('/:id',
    autenticar,
    autorizar('admin'),     // solo admins pueden eliminar
    ReactivoController.eliminar
);

module.exports = router;