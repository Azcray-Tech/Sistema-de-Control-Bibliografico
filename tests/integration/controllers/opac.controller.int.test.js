require('../setup');

const models = require('../../../models');
const OpacService = require('../../../services/opac.service');
const OpacController = require('../../../controllers/opacController');
const { limpiarDatosTransaccionales } = require('../../../tests/e2e/helpers/clean');
const { crearMaterialCompleto } = require('../../../tests/e2e/helpers/seed');

describe('OpacController - integración con servicios reales', () => {
  const opacService = new OpacService(models);
  const controller = new OpacController(opacService);

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

  test('index debe renderizar la página principal del OPAC', async () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    await controller.index(req, res, next);
    expect(res.render).toHaveBeenCalledWith('public/index', expect.objectContaining({
      titulo: 'Catálogo',
    }));
  });

  test('buscar debe renderizar el catálogo con resultados', async () => {
    const req = { query: { q: 'programacion' } };
    const res = mockRes();
    const next = jest.fn();

    await controller.buscar(req, res, next);
    expect(res.render).toHaveBeenCalledWith('public/catalogo', expect.objectContaining({
      titulo: 'Resultados de búsqueda',
      materiales: expect.any(Array),
    }));
  });

  test('ficha debe renderizar detalle de material existente', async () => {
    const { material } = await crearMaterialCompleto('libro');

    const req = { params: { id: String(material.idMaterial) } };
    const res = mockRes();
    const next = jest.fn();

    await controller.ficha(req, res, next);
    expect(res.render).toHaveBeenCalledWith('public/ficha_material', expect.objectContaining({
      material: expect.objectContaining({ idMaterial: material.idMaterial }),
    }));
  });

  test('ficha debe retornar 404 para material inexistente', async () => {
    const req = { params: { id: '999999' } };
    const res = mockRes();
    const next = jest.fn();

    await controller.ficha(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('buscar debe funcionar sin query parameters', async () => {
    const req = { query: {} };
    const res = mockRes();
    const next = jest.fn();

    await controller.buscar(req, res, next);
    expect(res.render).toHaveBeenCalledWith('public/catalogo', expect.any(Object));
  });
});
