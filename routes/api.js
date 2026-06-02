/**
 * @requirement RF-14 (Solicitantes), RF-06 (Ejemplares)
 * @use_case CU-14 (Registrar solicitante), CU-06 (Añadir ejemplares)
 * @description Rutas API JSON para búsqueda/ajax de solicitantes y ejemplares.
 */
const router = require('express').Router();
const models = require('../models');
const SolicitanteService = require('../services/solicitante.service');
const MaterialService = require('../services/material.service');
const ApiController = require('../controllers/apiController');

const solicitanteService = new SolicitanteService(models);
const materialService = new MaterialService(models);
const apiController = new ApiController(solicitanteService, materialService);

router.get('/solicitantes', apiController.buscarSolicitante);
router.get('/solicitantes/prestamo', apiController.buscarSolicitantePrestamo);
router.post('/solicitantes', apiController.crearSolicitante);
router.get('/ejemplares', apiController.buscarEjemplar);
router.get('/ejemplares/disponibles', apiController.buscarEjemplaresDisponibles);

module.exports = router;
