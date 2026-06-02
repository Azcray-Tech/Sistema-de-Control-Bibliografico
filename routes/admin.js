/**
 * @requirement RF-01 (Catalogar Material), RF-09 (Categorías), RF-15 (Préstamos)
 * @use_case CU-01 (Registrar material), CU-09 (Gestionar categorías), CU-15 (Préstamos)
 * @description Rutas protegidas del panel de administración: materiales, categorías, préstamos.
 */
const router = require('express').Router();
const models = require('../models');
const { registrarAuditoria } = require('../middleware/auditoria');
const { requiereAuth, requiereRol } = require('../middleware/auth');
const upload = require('../middleware/upload');

const DashboardService = require('../services/dashboard.service');
const MaterialService = require('../services/material.service');
const CategoriaService = require('../services/categoria.service');
const PrestamoService = require('../services/prestamo.service');
const ParametroService = require('../services/parametro.service');
const ArticuloService = require('../services/articulo.service');
const EjemplarService = require('../services/ejemplar.service');
const UsuarioService = require('../services/usuario.service');

const DashboardController = require('../controllers/dashboardController');
const MaterialController = require('../controllers/materialController');
const CategoriaController = require('../controllers/categoriaController');
const PrestamoController = require('../controllers/prestamoController');
const EjemplarController = require('../controllers/ejemplarController');
const UsuarioController = require('../controllers/usuarioController');

const parametroService = new ParametroService(models);
const dashboardService = new DashboardService(models);
const categoriaService = new CategoriaService(models, registrarAuditoria);
const articuloService = new ArticuloService(models, registrarAuditoria);
const materialService = new MaterialService(models, registrarAuditoria, articuloService);
const prestamoService = new PrestamoService(models, registrarAuditoria, parametroService);
const ejemplarService = new EjemplarService(models, registrarAuditoria);
const usuarioService = new UsuarioService(models, registrarAuditoria);

const dashboardController = new DashboardController(dashboardService);
const materialController = new MaterialController(materialService, categoriaService);
const categoriaController = new CategoriaController(categoriaService);
const prestamoController = new PrestamoController(prestamoService);
const ejemplarController = new EjemplarController(ejemplarService);
const usuarioController = new UsuarioController(usuarioService);

router.get('/dashboard', requiereAuth, dashboardController.mostrarDashboard);

router.get('/materiales', requiereAuth, materialController.listar);
router.get('/materiales/nuevo', requiereAuth, materialController.mostrarFormulario);
router.get('/materiales/:id/editar', requiereAuth, materialController.mostrarFormulario);
router.post('/materiales', requiereAuth, upload.single('portada'), materialController.guardar);
router.post('/materiales/:id', requiereAuth, upload.single('portada'), materialController.guardar);
router.get('/materiales/:id/ejemplares', requiereAuth, materialController.mostrarFormEjemplares);
router.post('/materiales/:id/ejemplares', requiereAuth, materialController.agregarEjemplares);
router.post('/materiales/:id/eliminar', requiereAuth, materialController.eliminar);

router.get('/categorias', requiereAuth, categoriaController.listar);
router.post('/categorias', requiereAuth, categoriaController.guardar);
router.post('/categorias/:id', requiereAuth, categoriaController.guardar);
router.post('/categorias/:id/desactivar', requiereAuth, categoriaController.desactivar);

router.get('/prestamos', requiereAuth, prestamoController.listar);
router.post('/prestamos', requiereAuth, prestamoController.registrar);
router.post('/prestamos/:id/renovar', requiereAuth, prestamoController.renovar);
router.post('/prestamos/:id/devolver', requiereAuth, prestamoController.devolver);
router.get('/prestamos/historial', requiereAuth, prestamoController.historial);
router.get('/prestamos/sanciones', requiereAuth, prestamoController.sanciones);

router.get('/materiales/:materialId/ejemplares/gestion', requiereAuth, ejemplarController.listarPorMaterial);
router.post('/materiales/:materialId/ejemplares/:ejemplarId/cambiar-estado', requiereAuth, ejemplarController.cambiarEstado);

router.get('/usuarios', requiereAuth, requiereRol('Administrador'), usuarioController.listar);
router.get('/usuarios/nuevo', requiereAuth, requiereRol('Administrador'), usuarioController.mostrarFormulario);
router.post('/usuarios', requiereAuth, requiereRol('Administrador'), usuarioController.guardar);
router.post('/usuarios/:id/desactivar', requiereAuth, requiereRol('Administrador'), usuarioController.desactivar);

module.exports = router;
