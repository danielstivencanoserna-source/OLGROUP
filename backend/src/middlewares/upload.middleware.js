// middlewares/upload.middleware.js
// Multer maneja la recepción de archivos multipart/form-data.
// Configuramos dónde guardar, cómo nombrar y qué tipos aceptar.

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Asegurarse de que la carpeta uploads existe
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento en disco
const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    cb(null, uploadDir); // carpeta donde se guardan los archivos
  },

  filename: (req, file, cb) => {
    // Nombre del archivo: timestamp + nombre original sin espacios
    // Ejemplo: 1711234567890-ficha-acido-clorhidrico.pdf
    const timestamp  = Date.now();
    const nombreLimpio = file.originalname
      .toLowerCase()
      .replace(/\s+/g, '-')       // espacios → guiones
      .replace(/[^a-z0-9.\-]/g, ''); // eliminar caracteres raros
    cb(null, `${timestamp}-${nombreLimpio}`);
  },
});

// Filtro: solo aceptar PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);  // aceptar
  } else {
    cb(new Error('Solo se permiten archivos PDF'), false); // rechazar
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (parseInt(process.env.UPLOAD_MAX_SIZE_MB) || 10) * 1024 * 1024,
  },
});

// Exportamos el middleware listo para usar en las rutas
// upload.single('ficha_seguridad') espera un campo llamado así en el form
module.exports = upload;