require('../setup');

const models = require('../../../models');
const DashboardService = require('../../../services/dashboard.service');
const { limpiarDatosTransaccionales } = require('../../../tests/e2e/helpers/clean');

describe('DashboardService - integración con BD real', () => {
  const service = new DashboardService(models);
  let stats;

  beforeAll(async () => {
    stats = await service.obtenerEstadisticas();
  });

  afterAll(async () => {
    await limpiarDatosTransaccionales();
  });

  test('debe retornar totalMateriales como número', () => {
    expect(typeof stats.totalMateriales).toBe('number');
    expect(stats.totalMateriales).toBeGreaterThanOrEqual(0);
  });

  test('debe retornar prestamosActivos como número', () => {
    expect(typeof stats.prestamosActivos).toBe('number');
    expect(stats.prestamosActivos).toBeGreaterThanOrEqual(0);
  });

  test('debe retornar disponibles como número', () => {
    expect(typeof stats.disponibles).toBe('number');
    expect(stats.disponibles).toBeGreaterThanOrEqual(0);
  });

  test('debe retornar vencidos como número', () => {
    expect(typeof stats.vencidos).toBe('number');
    expect(stats.vencidos).toBeGreaterThanOrEqual(0);
  });

  test('debe retornar materialesPorTipo con datos', () => {
    expect(Array.isArray(stats.materialesPorTipo)).toBe(true);
  });

  test('debe retornar topMateriales como array', () => {
    expect(Array.isArray(stats.topMateriales)).toBe(true);
  });

  test('debe retornar prestamosPorMes como array', () => {
    expect(Array.isArray(stats.prestamosPorMes)).toBe(true);
  });
});
