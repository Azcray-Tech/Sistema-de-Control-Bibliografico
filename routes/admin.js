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
const uploadBackup = require('multer')({ dest: require('os').tmpdir() });

const DashboardService = require('../services/dashboard.service');
const MaterialService = require('../services/material.service');
const CategoriaService = require('../services/categoria.service');
const PrestamoService = require('../services/prestamo.service');
const ParametroService = require('../services/parametro.service');
const ArticuloService = require('../services/articulo.service');
const EjemplarService = require('../services/ejemplar.service');
const UsuarioService = require('../services/usuario.service');
const BackupService = require('../services/backup.service');

const DashboardController = require('../controllers/dashboardController');
const MaterialController = require('../controllers/materialController');
const CategoriaController = require('../controllers/categoriaController');
const PrestamoController = require('../controllers/prestamoController');
const EjemplarController = require('../controllers/ejemplarController');
const UsuarioController = require('../controllers/usuarioController');
const ParametroController = require('../controllers/parametroController');
const BackupController = require('../controllers/backupController');
const ReporteService = require('../services/reporte.service');
const ReporteController = require('../controllers/reporteController');

const parametroService = new ParametroService(models, registrarAuditoria);
const backupService = new BackupService(models, registrarAuditoria);
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
const parametroController = new ParametroController(parametroService);
const backupController = new BackupController(backupService);
const reporteService = new ReporteService(models);
const reporteController = new ReporteController(reporteService);

router.get('/dashboard', requiereAuth, dashboardController.mostrarDashboard);

router.get('/materiales', requiereAuth, materialController.listar);
router.get('/materiales/nuevo', requiereAuth, materialController.mostrarFormulario);
router.get('/materiales/:id/editar', requiereAuth, materialController.mostrarFormulario);
router.post('/materiales', requiereAuth, upload.single('portada'), materialController.guardar);
router.post('/materiales/:id', requiereAuth, upload.single('portada'), materialController.guardar);
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
router.post('/prestamos/sanciones/levantar', requiereAuth, requiereRol('Administrador'), prestamoController.levantarSancion);

router.get('/materiales/:materialId/ejemplares/gestion', requiereAuth, ejemplarController.listarPorMaterial);
router.post('/materiales/:materialId/ejemplares/:ejemplarId/cambiar-estado', requiereAuth, ejemplarController.cambiarEstado);

router.get('/usuarios', requiereAuth, requiereRol('Administrador'), usuarioController.listar);
router.get('/usuarios/nuevo', requiereAuth, requiereRol('Administrador'), usuarioController.mostrarFormulario);
router.post('/usuarios', requiereAuth, requiereRol('Administrador'), usuarioController.guardar);
router.post('/usuarios/:id/desactivar', requiereAuth, requiereRol('Administrador'), usuarioController.desactivar);

router.get('/configuracion', requiereAuth, requiereRol('Administrador'), parametroController.mostrarFormulario);
router.post('/configuracion', requiereAuth, requiereRol('Administrador'), parametroController.guardar);

router.get('/backup', requiereAuth, requiereRol('Administrador'), backupController.mostrarPanel);
router.post('/backup/generar', requiereAuth, requiereRol('Administrador'), backupController.generar);

router.get('/restaurar', requiereAuth, requiereRol('Administrador'), backupController.mostrarRestaurar);
router.post('/restaurar/ejecutar', requiereAuth, requiereRol('Administrador'), uploadBackup.single('archivoBackup'), backupController.restaurar);

router.get('/reportes', requiereAuth, reporteController.mostrarPanel);
router.post('/reportes/inventario', requiereAuth, reporteController.generarInventario);
router.post('/reportes/prestamos-activos', requiereAuth, reporteController.generarPrestamosActivos);
router.post('/reportes/historial-solicitante', requiereAuth, reporteController.generarHistorialSolicitante);
router.post('/reportes/ranking', requiereAuth, reporteController.generarRanking);
router.post('/reportes/vencidos-contacto', requiereAuth, reporteController.generarVencidosContacto);
router.post('/reportes/estadisticas', requiereAuth, reporteController.generarEstadisticas);
router.post('/reportes/suspendidos', requiereAuth, reporteController.generarSuspendidos);

router.injectCronService = (cronService) => {
  if (parametroController) {parametroController.setCronService(cronService);}
  if (backupController) {backupController.setCronService(cronService);}
};
module.exports = router;
