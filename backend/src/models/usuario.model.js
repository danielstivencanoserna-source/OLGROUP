// models/usuario.model.js
// Este archivo contiene SOLO las consultas SQL relacionadas con usuarios.
// El controller llamará estas funciones — nunca escribiremos SQL en los controllers.

const pool = require('../config/db');

const UsuarioModel = {

  // Buscar un usuario por email (para login)
  async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND activo = true',
      [email]
    );
    return result.rows[0]; // retorna el usuario o undefined
  },

  // Buscar un usuario por ID (para el middleware JWT)
  async findById(id) {
    const result = await pool.query(
      'SELECT id, nombre, email, rol FROM usuarios WHERE id = $1 AND activo = true',
      [id]
    );
    return result.rows[0];
  },

  // Crear un nuevo usuario (registro)
  async create({ nombre, email, passwordHash, rol = 'analista' }) {
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol, created_at`,
      [nombre, email, passwordHash, rol]
    );
    return result.rows[0];
  },

  // Listar todos los usuarios (solo para admin)
  async findAll() {
    const result = await pool.query(
      'SELECT id, nombre, email, rol, activo, created_at FROM usuarios ORDER BY created_at DESC'
    );
    return result.rows;
  },

  // Desactivar un usuario (no borramos, solo desactivamos)
  async deactivate(id) {
    const result = await pool.query(
      'UPDATE usuarios SET activo = false WHERE id = $1 RETURNING id, nombre, email',
      [id]
    );
    return result.rows[0];
  },
};

module.exports = UsuarioModel;