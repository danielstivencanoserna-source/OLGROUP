// server.js — punto de entrada de la aplicación
require('dotenv').config();
const cookieParser = require('cookie-parser');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();

// ── Middlewares de seguridad ─────────────────────────────────────
// helmet agrega cabeceras HTTP que protegen contra ataques comunes
app.use(helmet());

// cors permite peticiones desde el frontend en desarrollo
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://tu-dominio.com'      // en producción, solo tu dominio
    : 'http://localhost:5173',       // en desarrollo, Vite
  credentials: true,                 // necesario para cookies httpOnly
}));

// ── Middlewares de parseo ─────────────────────────────────────────
app.use(express.json());             // leer JSON en el body
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // necesario para leer req.cookies

// ── Logger de peticiones ─────────────────────────────────────────
// morgan 'dev' muestra en consola: método, URL, status, tiempo
app.use(morgan('dev'));

// ── Archivos estáticos (fichas PDF) ──────────────────────────────
// Las fichas subidas serán accesibles en: /uploads/nombre-archivo.pdf
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Rutas de la API ───────────────────────────────────────────────
// Por ahora solo un endpoint de prueba. Iremos agregando rutas aquí.
// ── Rutas de la API ───────────────────────────────────────────────
const authRoutes     = require('./routes/auth.routes');
const reactivoRoutes = require('./routes/reactivo.routes');
const pictogramaRoutes  = require('./routes/pictograma.routes');
const sicoqRoutes      = require('./routes/sicoq.routes'); 
const preparacionRoutes = require('./routes/preparacion.routes');

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth',        authRoutes);
app.use('/api/reactivos',   reactivoRoutes);
app.use('/api/pictogramas', pictogramaRoutes);
app.use('/api/sicoq',       sicoqRoutes);
app.use('/api/preparaciones', preparacionRoutes);

// ── Manejo de rutas no encontradas ───────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ── Manejo de errores global ─────────────────────────────────────
// Este middleware captura cualquier error no manejado en los controllers
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'  // en producción, no revelar detalles
      : err.message,                  // en desarrollo, mostrar el error real
  });
});

// ── Iniciar servidor ─────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto: ${PORT}`);
});