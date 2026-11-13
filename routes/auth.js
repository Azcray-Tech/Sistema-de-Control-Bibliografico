/**
 * @requirement RF-13 (Iniciar sesión), RF-39 (Aviso de expiración de sesión por inactividad)
 * @use_case CU-13 (Iniciar sesión y manejo de inactividad), CU-39 (Aviso de expiración de sesión)
 * @description Rutas de autenticación: login, logout y renovación de sesión.
 */
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const models = require('../models');
const { registrarAuditoria } = require('../middleware/auditoria');
const AuthService = require('../services/auth.service');
const AuthController = require('../controllers/authController');
const { redirigirSiAutenticado, requiereAuth } = require('../middleware/auth');

const authService = new AuthService(models, registrarAuditoria);
const authController = new AuthController(authService);

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    error: 'Demasiados intentos de inicio de sesión. Intente nuevamente en 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: rateLimit.ipKeyGenerator
});

router.get('/login', redirigirSiAutenticado, authController.mostrarLogin);
router.post('/login', loginLimiter, authController.iniciarSesion);
router.get('/logout', requiereAuth, authController.cerrarSesion);
/**
 * @requirement RF-39 (Aviso de expiración de sesión por inactividad)
 * @use_case CU-39 (Aviso de expiración de sesión)
 * @description Renueva la sesión cuando el usuario pulsa "Continuar sesión".
 */
router.get('/sesion/ping', requiereAuth, authController.pingSesion);

module.exports = router;
