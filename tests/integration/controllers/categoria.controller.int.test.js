require('../setup');

const models = require('../../../models');
const CategoriaService = require('../../../services/categoria.service');
const CategoriaController = require('../../../controllers/categoriaController');
const { registrarAuditoria } = require('../../../middleware/auditoria');
const { limpiarDatosTransaccionales } = require('../../../tests/e2e/helpers/clean');

describe('CategoriaController - integración con servicios reales', () => {
  const categoriaService = new CategoriaService(models, registrarAuditoria);
  const controller = new CategoriaController(categoriaService);

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

  test('listar debe renderizar la vista de categorías', async () => {
    const req = { query: {} };
    const res = mockRes();
    const next = jest.fn();

    await controller.listar(req, res, next);
    expect(res.render).toHaveBeenCalledWith('admin/categorias', expect.objectContaining({
      page: 'categorias',
      categorias: expect.any(Array),
    }));
  });

  test('guardar debe redirigir al listado tras crear', async () => {
    const req = {
      query: {},
      body: {
        nombre: 'CatCtrl_' + Date.now(),
        descripcion: 'Creada desde controlador',
      },
      session: { usuarioId: 1 },
      params: {},
    };
    const res = mockRes();
    const next = jest.fn();

    await controller.guardar(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/admin/categorias?success=creado');
  });

  test('guardar debe renderizar con error si falla', async () => {
    const req = {
      query: {},
      body: {},
      session: { usuarioId: 1 },
      params: {},
    };
    const res = mockRes();
    const next = jest.fn();

    await controller.guardar(req, res, next);
    expect(res.render).toHaveBeenCalledWith('admin/categorias', expect.objectContaining({
      error: expect.any(String),
    }));
  });
});
