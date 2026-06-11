/**
 * @requirement RF-01
 * @use_case CU-01
 * @description Middleware multer para subida de portadas (imágenes) en formulario de materiales.
 */
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'public', 'images', 'covers'));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

function fileFilter(req, file, cb) {
  const allowed = /\.(jpg|jpeg|png|webp)$/i;
  if (allowed.test(path.extname(file.originalname))) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes JPG, PNG o WebP'));
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter
});

module.exports = upload;
module.exports.fileFilter = fileFilter;
module.exports.storage = storage;
