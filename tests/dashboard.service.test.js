/**
 * @requirement RF-31, RF-32
 * @use_case CU-31, CU-32
 * @description Pruebas unitarias del servicio de dashboard con mocks de modelos Sequelize.
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

  describe('_obtenerContadores', () => {
    it('debe retornar totales de materiales, préstamos activos, disponibles y vencidos', async () => {
      mocks.Material.count.mockResolvedValue(50);
      mocks.Prestamo.count.mockResolvedValueOnce(15).mockResolvedValueOnce(3);
      mocks.Ejemplar.count.mockResolvedValue(120);

      const result = await dashboardService._obtenerContadores();

      expect(result.totalMateriales).toBe(50);
      expect(result.prestamosActivos).toBe(15);
      expect(result.disponibles).toBe(120);
      expect(result.vencidos).toBe(3);
    });
  });

  describe('_obtenerMaterialesPorTipo', () => {
    it('debe retornar agrupación por tipo de material', async () => {
      mocks.Material.findAll.mockResolvedValue([
        { tipo: 'libro', total: 30 },
        { tipo: 'revista', total: 10 }
      ]);

      const result = await dashboardService._obtenerMaterialesPorTipo();

      expect(result).toHaveLength(2);
      expect(result[0].tipo).toBe('libro');
      expect(mocks.Material.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ group: ['tipo'], raw: true })
      );
    });
  });

  describe('periodic methods', () => {
    it('_periodoHoy debe generar 24 segmentos horarios', () => {
      const ahora = new Date(2024, 0, 15, 10, 30);
      const result = dashboardService._periodoHoy(ahora);
      expect(result.allPeriods).toHaveLength(24);
      expect(result.dateFormat).toBe('%Y-%m-%d %H:00');
      expect(result.allPeriods[0].label).toBe('00:00');
      expect(result.allPeriods[23].label).toBe('23:00');
    });

    it('_periodoSemana debe generar 7 días', () => {
      const ahora = new Date(2024, 0, 15);
      const result = dashboardService._periodoSemana(ahora);
      expect(result.allPeriods).toHaveLength(7);
      expect(result.dateFormat).toBe('%Y-%m-%d');
    });

    it('_periodoMes debe generar todos los días del mes', () => {
      const ahora = new Date(2024, 0, 15);
      const result = dashboardService._periodoMes(ahora);
      expect(result.allPeriods).toHaveLength(31);
      expect(result.dateFormat).toBe('%Y-%m-%d');
      expect(result.fechaInicio.getDate()).toBe(1);
    });

    it('_periodoAnio debe generar 12 meses', () => {
      const ahora = new Date(2024, 5, 15);
      const result = dashboardService._periodoAnio(ahora);
      expect(result.allPeriods).toHaveLength(12);
      expect(result.dateFormat).toBe('%Y-%m');
      expect(result.allPeriods[0].label).toMatch(/^[A-Z][a-z]{2} \d{4}$/);
    });
  });

  describe('_configurarPeriodo', () => {
    it('debe retornar periodo hoy', () => {
      const result = dashboardService._configurarPeriodo('hoy');
      expect(result.allPeriods).toHaveLength(24);
    });

    it('debe retornar periodo 1semana', () => {
      const result = dashboardService._configurarPeriodo('1semana');
      expect(result.allPeriods).toHaveLength(7);
    });

    it('debe retornar periodo 1mes', () => {
      const result = dashboardService._configurarPeriodo('1mes');
      expect(result.allPeriods.length).toBeGreaterThanOrEqual(28);
    });

    it('debe retornar periodo 12 meses por defecto', () => {
      const result = dashboardService._configurarPeriodo('12meses');
      expect(result.allPeriods).toHaveLength(12);
    });
  });

  describe('_obtenerTopMateriales', () => {
    it('debe retornar materiales ordenados por préstamos', async () => {
      mocks.Prestamo.findAll.mockResolvedValue([
        { ejemplarId: 1, total_prestamos: '10' }
      ]);
      mocks.Ejemplar.findByPk.mockResolvedValue({
        Material: { titulo: 'El Quijote' }
      });

      const result = await dashboardService._obtenerTopMateriales();

      expect(result).toHaveLength(1);
      expect(result[0].titulo).toBe('El Quijote');
      expect(result[0].total_prestamos).toBe(10);
    });

    it('debe manejar ejemplar sin material', async () => {
      mocks.Prestamo.findAll.mockResolvedValue([
        { ejemplarId: 1, total_prestamos: '5' }
      ]);
      mocks.Ejemplar.findByPk.mockResolvedValue(null);

      const result = await dashboardService._obtenerTopMateriales();

      expect(result[0].titulo).toBe('Sin título');
    });
  });

  describe('_obtenerTendenciasPrestamos', () => {
    it('debe retornar tendencias con ceros para periodos sin datos', async () => {
      mocks.Prestamo.findAll.mockResolvedValue([]);

      const result = await dashboardService._obtenerTendenciasPrestamos('1mes');

      expect(result.length).toBeGreaterThan(0);
      expect(result.every(r => r.total === 0)).toBe(true);
    });
  });

  describe('obtenerEstadisticas', () => {
    it('debe integrar todos los sub-métodos', async () => {
      mocks.Material.count.mockResolvedValue(100);
      mocks.Prestamo.count.mockResolvedValue(10);
      mocks.Ejemplar.count.mockResolvedValue(200);
      mocks.Prestamo.findAll.mockResolvedValue([]);
      mocks.Material.findAll.mockResolvedValue([]);
      mocks.Ejemplar.findByPk.mockResolvedValue(null);

      const result = await dashboardService.obtenerEstadisticas('12meses');

      expect(result.totalMateriales).toBe(100);
      expect(result.periodo).toBe('12meses');
      expect(Array.isArray(result.topMateriales)).toBe(true);
      expect(Array.isArray(result.materialesPorTipo)).toBe(true);
      expect(Array.isArray(result.prestamosPorMes)).toBe(true);
    });
  });
});
