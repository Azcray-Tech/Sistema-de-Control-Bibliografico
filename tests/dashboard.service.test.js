/**
 * @requirement RF-31, RF-32
 * @use_case CU-31, CU-32
 * @description Pruebas unitarias del servicio de dashboard.
 */
const DashboardService = require('../services/dashboard.service');
const { crearMocksModelos } = require('./mocks/models');

describe('DashboardService', () => {
  let dashboardService;
  let mocks;

  beforeEach(() => {
    mocks = crearMocksModelos();
    dashboardService = new DashboardService(mocks);
  });

  describe('obtenerEstadisticas', () => {
    it('debe retornar todas las estadísticas con valores por defecto', async () => {
      mocks.Material.count.mockResolvedValue(100);
      mocks.Prestamo.count.mockResolvedValueOnce(15).mockResolvedValueOnce(3);
      mocks.Ejemplar.count.mockResolvedValue(80);
      mocks.Prestamo.findAll
        .mockResolvedValueOnce([{ ejemplarId: 1, total_prestamos: '5' }])
        .mockResolvedValueOnce([{ periodo: '2024-01', total: '10' }, { periodo: '2024-02', total: '8' }]);
      mocks.Ejemplar.findByPk.mockResolvedValue({
        Material: { titulo: 'Libro Popular' }
      });
      mocks.Material.findAll.mockResolvedValue([
        { tipo: 'Libro', total: 50 }, { tipo: 'Revista', total: 30 }
      ]);

      const resultado = await dashboardService.obtenerEstadisticas('12meses');

      expect(resultado.totalMateriales).toBe(100);
      expect(resultado.prestamosActivos).toBe(15);
      expect(resultado.disponibles).toBe(80);
      expect(resultado.vencidos).toBe(3);
      expect(resultado.topMateriales).toHaveLength(1);
      expect(resultado.topMateriales[0].titulo).toBe('Libro Popular');
      expect(resultado.materialesPorTipo).toHaveLength(2);
      expect(resultado.prestamosPorMes).toHaveLength(12);
      expect(resultado.periodo).toBe('12meses');
    });

    it('debe retornar estadísticas para período hoy', async () => {
      mocks.Material.count.mockResolvedValue(0);
      mocks.Prestamo.count.mockResolvedValue(0);
      mocks.Ejemplar.count.mockResolvedValue(0);
      mocks.Prestamo.findAll.mockResolvedValue([]);
      mocks.Material.findAll.mockResolvedValue([]);

      const resultado = await dashboardService.obtenerEstadisticas('hoy');

      expect(resultado.prestamosPorMes).toHaveLength(24);
      expect(resultado.periodo).toBe('hoy');
    });

    it('debe retornar estadísticas para período 1 semana', async () => {
      mocks.Material.count.mockResolvedValue(0);
      mocks.Prestamo.count.mockResolvedValue(0);
      mocks.Ejemplar.count.mockResolvedValue(0);
      mocks.Prestamo.findAll.mockResolvedValue([]);
      mocks.Material.findAll.mockResolvedValue([]);

      const resultado = await dashboardService.obtenerEstadisticas('1semana');

      expect(resultado.prestamosPorMes).toHaveLength(7);
      expect(resultado.periodo).toBe('1semana');
    });

    it('debe retornar estadísticas para período 1 mes', async () => {
      mocks.Material.count.mockResolvedValue(0);
      mocks.Prestamo.count.mockResolvedValue(0);
      mocks.Ejemplar.count.mockResolvedValue(0);
      mocks.Prestamo.findAll.mockResolvedValue([]);
      mocks.Material.findAll.mockResolvedValue([]);

      const resultado = await dashboardService.obtenerEstadisticas('1mes');

      expect(resultado.periodo).toBe('1mes');
    });
  });
});
