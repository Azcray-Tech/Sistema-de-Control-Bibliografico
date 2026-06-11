require('../setup');

const models = require('../../../models');
const PrestamoService = require('../../../services/prestamo.service');
const ParametroService = require('../../../services/parametro.service');
const PrestamoController = require('../../../controllers/prestamoController');
const { registrarAuditoria } = require('../../../middleware/auditoria');
const { limpiarDatosTransaccionales } = require('../../../tests/e2e/helpers/clean');
const { crearSolicitante, crearMaterialCompleto } = require('../../../tests/e2e/helpers/seed');

describe('PrestamoController - integración con servicios reales', () => {
  const parametroService = new ParametroService(models, registrarAuditoria);
  const prestamoService = new PrestamoService(models, registrarAuditoria, parametroService);
  const controller = new PrestamoController(prestamoService);

  afterAll(async () => {
    await limpiarDatosTransaccionales();
  });

  function mockRes() {
    const res = {};
    res.render = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    return res;
  }

  test('listar debe renderizar la vista de préstamos', async () => {
    const req = { query: {} };
    const res = mockRes();
    const next = jest.fn();

    await controller.listar(req, res, next);
    expect(res.render).toHaveBeenCalledWith('admin/prestamos', expect.objectContaining({
      page: 'prestamos',
    }));
  });

  test('registrar debe redirigir al listado tras crear un préstamo', async () => {
    const solicitante = await crearSolicitante();
    const { material, ejemplar } = await crearMaterialCompleto('libro');
    const userAdmin = await models.UsuarioSistema.findOne({ where: { nombreUsuario: 'admin' } });

    const req = {
      body: {
        solicitanteCedula: solicitante.cedula,
        ejemplarId: ejemplar.idEjemplar,
      },
      session: { usuarioId: userAdmin.idUsuario },
    };
    const res = mockRes();
    const next = jest.fn();

    await controller.registrar(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/admin/prestamos?success=1');
  });

  test('registrar debe renderizar error si faltan datos', async () => {
    const req = {
      query: {},
      body: {},
      session: { usuarioId: 1 },
    };
    const res = mockRes();
    const next = jest.fn();

    await controller.registrar(req, res, next);
    expect(res.render).toHaveBeenCalledWith('admin/prestamos', expect.objectContaining({
      error: expect.any(String),
    }));
  });

  test('devolver debe redirigir tras procesar devolución', async () => {
    const solicitante = await crearSolicitante();
    const { material, ejemplar } = await crearMaterialCompleto('libro');
    const userAdmin = await models.UsuarioSistema.findOne({ where: { nombreUsuario: 'admin' } });

    const prestamo = await prestamoService.registrar(solicitante.cedula, ejemplar.idEjemplar, userAdmin.idUsuario);
    const req = {
      params: { id: prestamo.idPrestamo },
      body: { estadoEjemplar: 'Bueno', motivo: 'Devolución normal' },
      session: { usuarioId: userAdmin.idUsuario },
    };
    const res = mockRes();
    const next = jest.fn();

    await controller.devolver(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/admin/prestamos?success=3');
  });

  test('historial debe renderizar la vista de historial', async () => {
    const req = { query: {} };
    const res = mockRes();
    const next = jest.fn();

    await controller.historial(req, res, next);
    expect(res.render).toHaveBeenCalledWith('admin/historial', expect.objectContaining({
      page: 'historial',
    }));
  });

  test('sanciones debe renderizar la vista de sanciones', async () => {
    const req = { query: {} };
    const res = mockRes();
    const next = jest.fn();

    await controller.sanciones(req, res, next);
    expect(res.render).toHaveBeenCalledWith('admin/sanciones', expect.objectContaining({
      page: 'sanciones',
    }));
  });
});
