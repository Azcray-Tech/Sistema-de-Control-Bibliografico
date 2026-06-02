/**
 * @requirement RF-13 (Iniciar sesión)
 * @use_case CU-13 (Iniciar sesión y manejo de inactividad)
 * @description Rutas de autenticación: login, logout.
 */
const router = require('express').Router();
const models = require('../models');
const { registrarAuditoria } = require('../middleware/auditoria');
const AuthService = require('../services/auth.service');
const AuthController = require('../controllers/authController');
const { redirigirSiAutenticado, requiereAuth } = require('../middleware/auth');

const authService = new AuthService(models, registrarAuditoria);
const authController = new AuthController(authService);

router.get('/login', redirigirSiAutenticado, authController.mostrarLogin);
router.post('/login', authController.iniciarSesion);
router.get('/logout', requiereAuth, authController.cerrarSesion);

module.exports = router;
