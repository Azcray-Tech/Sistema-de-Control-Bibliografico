require('../setup');

const models = require('../../../models');
const OpacService = require('../../../services/opac.service');
const { limpiarDatosTransaccionales } = require('../../../tests/e2e/helpers/clean');
const { crearMaterialCompleto } = require('../../../tests/e2e/helpers/seed');

describe('OpacService - integración con BD real', () => {
  const service = new OpacService(models);

  afterAll(async () => {
    await limpiarDatosTransaccionales();
  });

  test('debe retornar destacados (incorporaciones recientes)', async () => {
    await crearMaterialCompleto('libro');
    const resultado = await service.obtenerDestacados();
    expect(Array.isArray(resultado)).toBe(true);
  });

  test('debe buscar por palabra clave', async () => {
    const resultado = await service.buscar({ q: 'programacion' });
    expect(resultado).toBeDefined();
    expect(Array.isArray(resultado.materiales)).toBe(true);
  });

  test('debe buscar sin palabra clave (todos)', async () => {
    const resultado = await service.buscar({});
    expect(Array.isArray(resultado.materiales)).toBe(true);
  });

  test('debe filtrar por tipo', async () => {
    const resultado = await service.buscar({ tipo: 'libro' });
    resultado.materiales.forEach(m => {
      expect(m.tipo).toBe('libro');
    });
  });

  test('debe filtrar por categoría', async () => {
    const cat = await models.Categoria.findOne({ where: { activa: true } });
    if (cat) {
      const resultado = await service.buscar({ categoriaId: cat.idCategoria });
      expect(Array.isArray(resultado.materiales)).toBe(true);
    }
  });

  test('debe obtener la ficha de un material existente', async () => {
    const { material } = await crearMaterialCompleto('libro');
    const ficha = await service.obtenerFicha(material.idMaterial);
    expect(ficha).toBeDefined();
    expect(ficha.idMaterial).toBe(material.idMaterial);
  });

  test('debe retornar null para ficha de material inexistente', async () => {
    const ficha = await service.obtenerFicha(999999);
    expect(ficha).toBeNull();
  });
});
