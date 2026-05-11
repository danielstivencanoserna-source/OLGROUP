// middlewares/auth.middleware.js
// Este middleware se ejecuta ANTES de cada controller protegido.
// Si el token no es válido, la petición se detiene aquí.

const jwt = require('jsonwebtoken');
const UsuarioModel = require('../models/usuario.model');

// ── Middleware de autenticación ───────────────────────────────────
// Uso: router.get('/ruta', autenticar, controller)

const autenticar = async (req, res, next) => {
  try {
    // El token viene en el header: Authorization: Bearer <token>
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // extraer el token

    if (!token) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    // Verificar el token — si está vencido o manipulado, lanza un error
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Obtener el usuario fresco de la BD (por si fue desactivado)
    const usuario = await UsuarioModel.findById(decoded.id);
    if (!usuario) {
      return res.status(401).json({ error: 'Usuario no autorizado' });
    }

    // Inyectar el usuario en req para que los controllers lo usen
    req.usuario = usuario;
    next(); // continuar al siguiente middleware o controller

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
      // El frontend detecta 'TOKEN_EXPIRED' y llama al endpoint /refresh
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// ── Middleware de roles ───────────────────────────────────────────
// Uso: router.delete('/ruta', autenticar, autorizar('admin'), controller)
// Se encadena DESPUÉS de autenticar, porque necesita req.usuario

const autorizar = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere rol: ${rolesPermitidos.join(' o ')}`,
      });
    }
    next();
  };
};

module.exports = { autenticar, autorizar };