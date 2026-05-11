// config/db.js
// Este módulo crea un pool de conexiones a PostgreSQL.
// Un pool mantiene varias conexiones abiertas y las reutiliza,
// lo que es mucho más eficiente que abrir/cerrar por cada petición.

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 10,    // máximo 10 conexiones simultáneas
    idleTimeoutMillis: 30000,  // cerrar conexiones inactivas tras 30s
    connectionTimeoutMillis: 2000, // error si no conecta en 2s
});

// Verificar la conexión al arrancar
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error conectando a PostgreSQL:', err.message);
        process.exit(1); // detener el servidor si no hay BD
    }
    release();
    console.log('✅ PostgreSQL conectado correctamente');
});

module.exports = pool;