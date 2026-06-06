/**
 * @requirement RF-31, RF-32
 * @use_case CU-31, CU-32
 * @description Pruebas unitarias del controlador de dashboard.
 */
const DashboardController = require('../controllers/dashboardController');

describe('DashboardController', () => {
  let controller;
  let mockService;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockService = {
      obtenerEstadisticas: jest.fn().mockResolvedValue({
        totalMateriales: 100,
        prestamosActivos: 15,
        disponibles: 80,
        vencidos: 3,
        topMateriales: [],
        materialesPorTipo: [],
        prestamosPorMes: [],
        periodo: '1mes'
      })
    };

    controller = new DashboardController(mockService);

    req = { query: {} };

    res = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };

    next = jest.fn();
  });

  describe('mostrarDashboard', () => {
    it('debe renderizar admin/dashboard con estadísticas', async () => {
      await controller.mostrarDashboard(req, res, next);

      expect(mockService.obtenerEstadisticas).toHaveBeenCalledWith('1mes');
      expect(res.render).toHaveBeenCalledWith('admin/dashboard', {
        page: 'dashboard',
        totalMateriales: 100, prestamosActivos: 15,
        disponibles: 80, vencidos: 3,
        topMateriales: [], materialesPorTipo: [],
        prestamosPorMes: [], periodo: '1mes'
      });
    });

    it('debe usar periodo desde query string', async () => {
      req.query = { periodo: '12meses' };

      await controller.mostrarDashboard(req, res, next);

      expect(mockService.obtenerEstadisticas).toHaveBeenCalledWith('12meses');
    });

    it('debe pasar next si el servicio falla', async () => {
      mockService.obtenerEstadisticas.mockRejectedValue(new Error('DB error'));

      await controller.mostrarDashboard(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
