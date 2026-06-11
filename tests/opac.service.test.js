/**
 * @requirement RF-22 (OPAC), RF-23 (Búsqueda simple), RF-24 (Búsqueda avanzada), RF-26 (Ficha completa)
 * @use_case CU-22, CU-23, CU-24, CU-26
 * @description Pruebas unitarias del servicio OPAC con mocks Sequelize.
 */
const OpacService = require('../services/opac.service');
const { crearMocksModelos } = require('./mocks/models');

describe('OpacService', () => {
  let opacService;
  let mocks;

  beforeEach(() => {
    mocks = crearMocksModelos();
    opacService = new OpacService(mocks);
  });

  describe('obtenerCategorias', () => {
    it('debe retornar categorías activas ordenadas', async () => {
      mocks.Categoria.findAll.mockResolvedValue([
        { id: 1, nombre: 'Ciencia' },
        { id: 2, nombre: 'Historia' }
      ]);

      const result = await opacService.obtenerCategorias();

      expect(mocks.Categoria.findAll).toHaveBeenCalledWith({
        where: { activa: true },
        order: [['nombre', 'ASC']]
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('obtenerDestacados', () => {
    it('debe retornar últimos materiales con autores y categoría', async () => {
      const mockMateriales = [
        { idMaterial: 1, titulo: 'Libro A', Categorium: { nombre: 'Ciencia' }, autores: [] }
      ];
      mocks.Material.findAll.mockResolvedValue(mockMateriales);

      const result = await opacService.obtenerDestacados();

      expect(mocks.Material.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 8, order: [['createdAt', 'DESC']] })
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('buscar', () => {
    it('debe retornar resultados paginados', async () => {
      const mockMaterial = {
        idMaterial: 1, titulo: 'Test',
        toJSON: () => ({ idMaterial: 1, titulo: 'Test', ejemplares: [{ estado: 'Disponible' }] })
      };
      mocks.Material.findAndCountAll.mockResolvedValue({ rows: [mockMaterial], count: 1 });

      const result = await opacService.buscar({ q: 'test', pagina: 1 });

      expect(result.total).toBe(1);
      expect(result.materiales).toHaveLength(1);
      expect(result.materiales[0].ejemplaresDisponibles).toBe(1);
    });

    it('debe aplicar filtro por tipo', async () => {
      const mockMaterial = {
        toJSON: () => ({ idMaterial: 1, titulo: 'Test', ejemplares: [] })
      };
      mocks.Material.findAndCountAll.mockResolvedValue({ rows: [mockMaterial], count: 1 });

      await opacService.buscar({ tipo: 'libro' });

      expect(mocks.Material.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tipo: 'libro' })
        })
      );
    });

    it('debe aplicar filtro por categoría', async () => {
      const mockMaterial = {
        toJSON: () => ({ idMaterial: 1, titulo: 'Test', ejemplares: [] })
      };
      mocks.Material.findAndCountAll.mockResolvedValue({ rows: [mockMaterial], count: 1 });

      await opacService.buscar({ categoriaId: '2' });

      expect(mocks.Material.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoriaId: 2 })
        })
      );
    });

    it('debe aplicar filtro por rango de años', async () => {
      const mockMaterial = {
        toJSON: () => ({ idMaterial: 1, titulo: 'Test', ejemplares: [] })
      };
      mocks.Material.findAndCountAll.mockResolvedValue({ rows: [mockMaterial], count: 1 });

      await opacService.buscar({ anioDesde: '2000', anioHasta: '2020' });

      const where = mocks.Material.findAndCountAll.mock.calls[0][0].where;
      expect(where.anioPublicacion).toBeDefined();
    });

    it('debe retornar página mínima 1 si pagina es inválida', async () => {
      const mockMaterial = {
        toJSON: () => ({ idMaterial: 1, titulo: 'Test', ejemplares: [] })
      };
      mocks.Material.findAndCountAll.mockResolvedValue({ rows: [mockMaterial], count: 1 });

      const result = await opacService.buscar({ q: 'test', pagina: -5 });

      expect(result.pagina).toBe(1);
    });

    it('debe manejar 0 resultados', async () => {
      mocks.Material.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      const result = await opacService.buscar({ q: 'zzzz' });

      expect(result.total).toBe(0);
      expect(result.materiales).toHaveLength(0);
    });
  });

  describe('obtenerFicha', () => {
    it('debe retornar ficha completa del material', async () => {
      const mockMaterial = {
        idMaterial: 1, titulo: 'Test', tipo: 'libro',
        toJSON: () => ({
          idMaterial: 1, titulo: 'Test', tipo: 'libro',
          ejemplares: [{ estado: 'Disponible' }, { estado: 'Prestado' }],
          libro: {}, revista: null, tesis: null, anuario: null,
          autores: [], Categorium: {}
        })
      };
      mocks.Material.findByPk.mockResolvedValue(mockMaterial);

      const result = await opacService.obtenerFicha(1);

      expect(result.idMaterial).toBe(1);
      expect(result.ejemplaresDisponibles).toBe(1);
      expect(result.totalEjemplares).toBe(2);
    });

    it('debe retornar null si material no existe', async () => {
      mocks.Material.findByPk.mockResolvedValue(null);

      const result = await opacService.obtenerFicha(999);

      expect(result).toBeNull();
    });
  });
});
