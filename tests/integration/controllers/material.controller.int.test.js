require('../setup');

const models = require('../../../models');
const MaterialService = require('../../../services/material.service');
const CategoriaService = require('../../../services/categoria.service');
const MaterialController = require('../../../controllers/materialController');
const { registrarAuditoria } = require('../../../middleware/auditoria');
const { limpiarDatosTransaccionales } = require('../../../tests/e2e/helpers/clean');

describe('MaterialController - integración con servicios reales', () => {
  const materialService = new MaterialService(models, registrarAuditoria);
  const categoriaService = new CategoriaService(models, registrarAuditoria);
  const controller = new MaterialController(materialService, categoriaService);

  afterAll(async () => {
    await limpiarDatosTransaccionales();
  });

  function mockRes() {
    const res = {};
    res.render = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  }

  test('listar debe renderizar la vista de materiales', async () => {
    const req = { query: {} };
    const res = mockRes();
    const next = jest.fn();

    await controller.listar(req, res, next);
    expect(res.render).toHaveBeenCalledWith('admin/materiales', expect.objectContaining({
      page: 'materiales',
      materiales: expect.any(Array),
    }));
  });

  test('listar debe filtrar por tipo', async () => {
    const req = { query: { tipo: 'libro' } };
    const res = mockRes();
    const next = jest.fn();

    await controller.listar(req, res, next);
    expect(res.render).toHaveBeenCalledWith('admin/materiales', expect.objectContaining({
      tipo: 'libro',
    }));
  });

  test('mostrarFormulario sin id debe renderizar formulario vacío', async () => {
    const req = { params: {}, query: {} };
    const res = mockRes();
    const next = jest.fn();

    await controller.mostrarFormulario(req, res, next);
    expect(res.render).toHaveBeenCalledWith('admin/material_form', expect.objectContaining({
      material: null,
      categorias: expect.any(Array),
    }));
  });

  test('mostrarFormulario con id válido debe cargar el material', async () => {
    const admin = await models.UsuarioSistema.findOne({ where: { nombreUsuario: 'admin' } });
    const adminId = admin ? admin.idUsuario : 1;
    const data = {
      titulo: 'Material Ctrl Test',
      tipo: 'libro',
      anioPublicacion: 2024,
      categoriaId: 1,
      isbn: '9780306406157',
      editorial: 'Test',
      autores: [],
    };
    const creado = await materialService.crear(data, adminId);

    const req = { params: { id: creado.idMaterial }, query: {} };
    const res = mockRes();
    const next = jest.fn();

    await controller.mostrarFormulario(req, res, next);
    expect(res.render).toHaveBeenCalledWith('admin/material_form', expect.objectContaining({
      material: expect.objectContaining({ idMaterial: creado.idMaterial }),
    }));
  });

  test('mostrarFormulario con id inexistente debe retornar 404', async () => {
    const req = { params: { id: 999999 }, query: {} };
    const res = mockRes();
    const next = jest.fn();

    await controller.mostrarFormulario(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
