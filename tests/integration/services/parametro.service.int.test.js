require('../setup');

const models = require('../../../models');
const ParametroService = require('../../../services/parametro.service');
const { registrarAuditoria } = require('../../../middleware/auditoria');
const { limpiarDatosTransaccionales } = require('../../../tests/e2e/helpers/clean');

describe('ParametroService - integración con BD real', () => {
  const service = new ParametroService(models, registrarAuditoria);

  afterAll(async () => {
    await limpiarDatosTransaccionales();
  });

  test('debe obtener un parámetro existente', async () => {
    const valor = await service.obtener('dias_prestamo', 7);
    expect(valor).toBeDefined();
    expect(Number(valor)).toBeGreaterThan(0);
  });

  test('debe retornar valor por defecto si el parámetro no existe', async () => {
    const valor = await service.obtener('parametro_inexistente', 42);
    expect(valor).toBe(42);
  });

  test('debe listar todos los parámetros', async () => {
    const params = await service.obtenerTodos();
    expect(Array.isArray(params)).toBe(true);
    expect(params.length).toBeGreaterThan(0);
  });

  test('debe actualizar un parámetro existente', async () => {
    await service.actualizar({ dias_prestamo: '10' }, 1);

    const valor = await service.obtener('dias_prestamo', 7);
    expect(Number(valor)).toBe(10);
  });
});
