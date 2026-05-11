// controllers/auth.controller.js
// Aquí vive la lógica de negocio del módulo de autenticación.
// Recibe la petición, valida, llama al modelo, y responde.

const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const Joi       = require('joi');
const UsuarioModel = require('../models/usuario.model');

// ── Esquemas de validación con Joi ────────────────────────────────
// Joi valida que los datos que llegan tengan el formato correcto
// ANTES de tocar la base de datos.

const schemaRegistro = Joi.object({
  nombre: Joi.string().min(3).max(100).required()
    .messages({ 'string.empty': 'El nombre es requerido' }),
  email: Joi.string().email().required()
    .messages({ 'string.email': 'Email inválido' }),
  password: Joi.string().min(8).required()
    .messages({ 'string.min': 'La contraseña debe tener al menos 8 caracteres' }),
  rol: Joi.string().valid('admin', 'analista', 'auditor').default('analista'),
});

const schemaLogin = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

// ── Funciones auxiliares para generar tokens ─────────────────────

function generarAccessToken(usuario) {
  // El payload del token contiene datos no sensibles del usuario.
  // NUNCA incluyas la contraseña aquí.
  return jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES } // '15m'
  );
}

function generarRefreshToken(usuario) {
  return jwt.sign(
    { id: usuario.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES } // '7d'
  );
}

// ── Controllers ───────────────────────────────────────────────────

const AuthController = {

  // POST /api/auth/registro
  async registro(req, res) {
    try {
      // 1. Validar los datos de entrada
      const { error, value } = schemaRegistro.validate(req.body, { abortEarly: false });
      if (error) {
        return res.status(400).json({
          error: 'Datos inválidos',
          detalles: error.details.map(d => d.message),
        });
      }

      // 2. Verificar que el email no esté registrado
      const usuarioExistente = await UsuarioModel.findByEmail(value.email);
      if (usuarioExistente) {
        return res.status(409).json({ error: 'El email ya está registrado' });
      }

      // 3. Hashear la contraseña — el número 12 es el "cost factor"
      // A mayor número, más seguro pero más lento. 12 es un buen balance.
      const passwordHash = await bcrypt.hash(value.password, 12);

      // 4. Crear el usuario en la base de datos
      const nuevoUsuario = await UsuarioModel.create({
        nombre: value.nombre,
        email:  value.email,
        passwordHash,
        rol:    value.rol,
      });

      // 5. Responder con los datos del usuario (sin contraseña)
      res.status(201).json({
        message: 'Usuario creado correctamente',
        usuario: nuevoUsuario,
      });

    } catch (err) {
      console.error('Error en registro:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // POST /api/auth/login
  async login(req, res) {
    try {
      // 1. Validar datos
      const { error, value } = schemaLogin.validate(req.body);
      if (error) {
        return res.status(400).json({ error: 'Email o contraseña inválidos' });
        // Nota: mensaje genérico intencionalmente — no revelamos cuál falló
      }

      // 2. Buscar el usuario
      const usuario = await UsuarioModel.findByEmail(value.email);
      if (!usuario) {
        // Usamos el mismo mensaje que si la contraseña fuera incorrecta.
        // Así no revelamos si el email existe o no en la base de datos.
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      // 3. Verificar la contraseña
      const passwordValida = await bcrypt.compare(value.password, usuario.password_hash);
      if (!passwordValida) {
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }

      // 4. Generar los dos tokens
      const accessToken  = generarAccessToken(usuario);
      const refreshToken = generarRefreshToken(usuario);

      // 5. El refresh token va en una cookie httpOnly
      // httpOnly = JavaScript del navegador NO puede leerla (protege de XSS)
      // secure = solo se envía por HTTPS (en producción)
      // sameSite = protege contra ataques CSRF
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge:   7 * 24 * 60 * 60 * 1000, // 7 días en milisegundos
      });

      // 6. El access token va en el body de la respuesta
      res.json({
        accessToken,
        usuario: {
          id:     usuario.id,
          nombre: usuario.nombre,
          email:  usuario.email,
          rol:    usuario.rol,
        },
      });

    } catch (err) {
      console.error('Error en login:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  // POST /api/auth/refresh
  // El frontend llama esto cuando el access token expira
  async refresh(req, res) {
    try {
      const token = req.cookies?.refreshToken;
      if (!token) {
        return res.status(401).json({ error: 'No hay refresh token' });
      }

      // Verificar y decodificar el refresh token
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

      // Buscar el usuario para asegurarse de que sigue activo
      const usuario = await UsuarioModel.findById(decoded.id);
      if (!usuario) {
        return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
      }

      // Emitir un nuevo access token
      const nuevoAccessToken = generarAccessToken(usuario);
      res.json({ accessToken: nuevoAccessToken });

    } catch (err) {
      // jwt.verify lanza error si el token está vencido o es inválido
      return res.status(401).json({ error: 'Refresh token inválido o expirado' });
    }
  },

  // POST /api/auth/logout
  async logout(req, res) {
    // Eliminar la cookie del refresh token
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.json({ message: 'Sesión cerrada correctamente' });
  },

  // GET /api/auth/me — retorna el usuario autenticado actual
  // Este endpoint requiere el middleware de autenticación (lo creamos a continuación)
  async me(req, res) {
    // req.usuario lo inyecta el middleware JWT
    res.json({ usuario: req.usuario });
  },
};

module.exports = AuthController;