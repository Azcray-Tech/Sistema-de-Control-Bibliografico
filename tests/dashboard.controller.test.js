/**
 * @requirement RF-31 (Generar reporte de inventario), RF-32 (Préstamos activos)
 * @use_case CU-31, CU-32
 * @description Pruebas unitarias del controlador de dashboard con mocks.
 */
const DashboardController = require('../controllers/dashboardController');

describe('DashboardController', () => {
  let controller;
  let mockDashboardService;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockDashboardService = { obtenerEstadisticas: jest.fn() };
    controller = new DashboardController(mockDashboardService);

    req = { query: {} };
    res = { render: jest.fn() };
    next = jest.fn();
  });

  describe('mostrarDashboard', () => {
    it('debe renderizar dashboard con estadísticas', async () => {
      const stats = {
        totalMateriales: 100, prestamosActivos: 5, disponibles: 80, vencidos: 2,
        topMateriales: [], materialesPorTipo: [], prestamosPorMes: [], periodo: '1mes'
      };
      mockDashboardService.obtenerEstadisticas.mockResolvedValue(stats);

      await controller.mostrarDashboard(req, res, next);

      expect(res.render).toHaveBeenCalledWith('admin/dashboard', {
        page: 'dashboard',
        totalMateriales: 100, prestamosActivos: 5, disponibles: 80, vencidos: 2,
        topMateriales: [], materialesPorTipo: [], prestamosPorMes: [], periodo: '1mes'
      });
    });

    it('debe usar periodo desde query', async () => {
      req.query.periodo = '1semana';
      const stats = { totalMateriales: 0, prestamosActivos: 0, disponibles: 0, vencidos: 0,
        topMateriales: [], materialesPorTipo: [], prestamosPorMes: [], periodo: '1semana' };
      mockDashboardService.obtenerEstadisticas.mockResolvedValue(stats);

      await controller.mostrarDashboard(req, res, next);

      expect(mockDashboardService.obtenerEstadisticas).toHaveBeenCalledWith('1semana');
    });

    it('debe pasar error a next si el servicio falla', async () => {
      mockDashboardService.obtenerEstadisticas.mockRejectedValue(new Error('Error'));

      await controller.mostrarDashboard(req, res, next);

      expect(next).toHaveBeenCalledWith(new Error('Error'));
    });
  });
});
