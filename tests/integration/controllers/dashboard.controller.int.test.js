require('../setup');

const models = require('../../../models');
const DashboardService = require('../../../services/dashboard.service');
const DashboardController = require('../../../controllers/dashboardController');
const { limpiarDatosTransaccionales } = require('../../../tests/e2e/helpers/clean');

describe('DashboardController - integración con servicios reales', () => {
  const dashboardService = new DashboardService(models);
  const controller = new DashboardController(dashboardService);

  afterAll(async () => {
    await limpiarDatosTransaccionales();
  });

  function mockRes() {
    const res = {};
    res.render = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    return res;
  }

  test('mostrarDashboard debe renderizar el dashboard con estadísticas reales', async () => {
    const req = { query: {} };
    const res = mockRes();
    const next = jest.fn();

    await controller.mostrarDashboard(req, res, next);
    expect(res.render).toHaveBeenCalledWith('admin/dashboard', expect.objectContaining({
      page: 'dashboard',
      totalMateriales: expect.any(Number),
      prestamosActivos: expect.any(Number),
      disponibles: expect.any(Number),
      vencidos: expect.any(Number),
      topMateriales: expect.any(Array),
      prestamosPorMes: expect.any(Array),
    }));
  });
});
