/**
 * @requirement RF-01 (Catalogar Material), RF-13 (Iniciar sesión)
 * @use_case CU-01 (Registrar material), CU-13 (Iniciar sesión)
 * @description Punto de entrada de la aplicación Express. Configura middlewares, rutas y sincronización BD.
 */
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const models = require('./models');
const { sequelize } = models;
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const sequelizeSessionStore = new SequelizeStore({
  db: sequelize,
  tableName: 'sesiones',
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 15 * 60 * 1000
});
const sessionStore = process.env.SESSION_STORE === 'memory'
  ? new session.MemoryStore()
  : sequelizeSessionStore;
const errorHandler = require('./middleware/errorHandler');
const { cargarUsuarioSession } = require('./middleware/auth');
const fs = require('fs');
const os = require('os');

function maintenanceMode(req, res, next) {
  if (req.path === '/admin/login') {return next();}
  const flag = path.join(os.tmpdir(), 'ceela_MAINTENANCE_MODE');
  if (fs.existsSync(flag)) {
    return res.status(503).render('maintenance');
  }
  next();
}
const { registrarAuditoria } = require('./middleware/auditoria');
const ParametroService = require('./services/parametro.service');
const BackupService = require('./services/backup.service');
const CronService = require('./services/cron.service');

const app = express();
const _PORT = process.env.PORT || 3000;

// Configuración de sesión
app.use(session({
  secret: process.env.SESSION_SECRET || 'ceela-secret-key',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
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

// Servicios para tareas programadas
const parametroService = new ParametroService(models, registrarAuditoria);
const backupService = new BackupService(models, registrarAuditoria);
const cronService = new CronService(models, registrarAuditoria, backupService, parametroService);

// Middleware de modo mantenimiento
app.use(maintenanceMode);

// Rutas
const adminRouter = require('./routes/admin');
if (typeof adminRouter.injectCronService === 'function') {
  adminRouter.injectCronService(cronService);
}
app.use('/admin', require('./routes/auth'));
app.use('/', require('./routes/public'));
app.use('/admin', adminRouter);
app.use('/api', require('./routes/api'));

// Manejo de errores
app.use(errorHandler);

// Sincronizar BD e iniciar servidor
async function iniciar() {
  try {
    await sequelize.authenticate();
    console.log('Conexión a base de datos establecida correctamente.');
    await sequelize.sync({ alter: false });
    if (process.env.SESSION_STORE !== 'memory') {
      await sequelizeSessionStore.sync();
    }
    if (process.env.NODE_ENV !== 'test') {
      cronService.iniciar();
    }
  } catch (err) {
    console.error('Error al iniciar el servidor:', err);
    process.exit(1);
  }
}

module.exports = { app, iniciar };
