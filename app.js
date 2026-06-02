/**
 * @requirement RF-01 (Catalogar Material), RF-13 (Iniciar sesión)
 * @use_case CU-01 (Registrar material), CU-13 (Iniciar sesión)
 * @description Punto de entrada de la aplicación Express. Configura middlewares, rutas y sincronización BD.
 */
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { sequelize } = require('./models');
const errorHandler = require('./middleware/errorHandler');
const { cargarUsuarioSession } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de sesión
app.use(session({
  secret: process.env.SESSION_SECRET || 'ceela-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 15 * 60 * 1000 // 15 minutos por defecto
  }
}));

// Middleware global
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Variables globales para vistas
app.use(cargarUsuarioSession);
app.use((req, res, next) => {
  res.locals.rutaActual = req.path;
  res.locals.mensajeExito = req.query.success || null;
  res.locals.mensajeError = req.query.error || null;
  res.locals.successId = req.query.successId || null;
  res.locals.successTitulo = req.query.successTitulo || null;
  next();
});

// Configurar EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Rutas
app.use('/admin', require('./routes/auth'));
app.use('/', require('./routes/public'));
app.use('/admin', require('./routes/admin'));
app.use('/api', require('./routes/api'));

// Manejo de errores
app.use(errorHandler);

// Sincronizar BD e iniciar servidor
async function iniciar() {
  try {
    await sequelize.authenticate();
    console.log('Conexión a base de datos establecida correctamente.');
    await sequelize.sync({ alter: false });
    app.listen(PORT, () => {
      console.log(`Servidor iniciado en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Error al iniciar el servidor:', err);
    process.exit(1);
  }
}

iniciar();

module.exports = app;
