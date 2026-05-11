const express  = require('express');
const router   = express.Router();
const pool     = require('../config/db');
const { autenticar } = require('../middlewares/auth.middleware');

// GET /api/pictogramas
// Retorna todos los pictogramas GHS para usar en el formulario de reactivos
router.get('/', autenticar, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM pictogramas ORDER BY codigo_ghs'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener pictogramas:', err);
    res.status(500).json({ error: 'Error al obtener pictogramas' });
  }
});

module.exports = router;