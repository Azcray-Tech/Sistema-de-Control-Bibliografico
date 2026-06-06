require('../setup');

const models = require('../../../models');
const CategoriaService = require('../../../services/categoria.service');
const { registrarAuditoria } = require('../../../middleware/auditoria');
const { limpiarDatosTransaccionales } = require('../../../tests/e2e/helpers/clean');

describe('CategoriaService - integración con BD real', () => {
  const service = new CategoriaService(models, registrarAuditoria);

  afterAll(async () => {
    await limpiarDatosTransaccionales();
  });

  test('debe listar todas las categorías', async () => {
    const categorias = await service.listar();
    expect(Array.isArray(categorias)).toBe(true);
    expect(categorias.length).toBeGreaterThan(0);
  });

  test('debe listar solo categorías activas', async () => {
    const activas = await service.listarActivas();
    activas.forEach(c => {
      expect(c.activa).toBe(true);
    });
  });

  test('debe crear una categoría', async () => {
    const nombre = 'CatTest_' + Date.now();
    const resultado = await service.guardar(null, { nombre, descripcion: 'Test integración' }, null);
    expect(resultado.nombre).toBe(nombre);
    expect(resultado.activa).toBe(true);
  });

  test('debe rechazar nombre duplicado', async () => {
    const nombre = 'CatDupe_' + Date.now();
    await service.guardar(null, { nombre, descripcion: 'Primera' }, null);
    await expect(service.guardar(null, { nombre, descripcion: 'Duplicada' }, null)).rejects.toThrow();
  });

  test('debe obtener una categoría por ID', async () => {
    const nombre = 'CatGet_' + Date.now();
    const creada = await service.guardar(null, { nombre, descripcion: 'Test' }, null);
    const obtenida = await models.Categoria.findByPk(creada.idCategoria);
    expect(obtenida.idCategoria).toBe(creada.idCategoria);
  });
});
