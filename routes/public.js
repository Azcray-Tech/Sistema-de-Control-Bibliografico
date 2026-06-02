/**
 * @requirement RF-22 (OPAC), RF-23 (Búsqueda simple), RF-24 (Búsqueda avanzada), RF-26 (Ficha completa)
 * @use_case CU-22 (OPAC), CU-23 (Búsqueda simple), CU-24 (Búsqueda avanzada), CU-26 (Ficha completa)
 * @description Rutas públicas del catálogo OPAC sin autenticación.
 */
const router = require('express').Router();
const models = require('../models');
const OpacService = require('../services/opac.service');
const OpacController = require('../controllers/opacController');

const opacService = new OpacService(models);
const opacController = new OpacController(opacService);

router.get('/', opacController.index);
router.get('/buscar', opacController.buscar);
router.get('/material/:id', opacController.ficha);
router.get('/ficha/:id', opacController.ficha);

module.exports = router;
