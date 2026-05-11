// routes/auth.routes.js
// Solo define las URLs y qué controller las maneja.
// No tiene lógica de negocio.

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { autenticar } = require('../middlewares/auth.middleware');

// Rutas públicas (no requieren token)
router.post('/registro', AuthController.registro);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);

// Ruta protegida (requiere token válido)
router.get('/me', autenticar, AuthController.me);

module.exports = router;