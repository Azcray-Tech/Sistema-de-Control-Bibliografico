/**
 * @requirement RF-22 (OPAC), RF-23 (Búsqueda simple), RF-24 (Búsqueda avanzada), RF-26 (Ficha completa)
 * @use_case CU-22, CU-23, CU-24, CU-26
 * @description Pruebas unitarias del servicio OPAC.
 */
const OpacService = require('../services/opac.service');
const { crearMocksModelos, mockAuditoria } = require('./mocks/models');

const crearMaterialMock = (id = 1, overrides = {}) => ({
  idMaterial: id,
  titulo: 'Material ' + id,
  tipo: 'Libro',
  sinopsis: 'Sinopsis',
  anioPublicacion: 2024,
  categoriaId: 1,
  toJSON: jest.fn().mockReturnThis(),
  Categoria: { idCategoria: 1, nombre: 'Ciencia' },
  autores: [],
  ejemplares: [],
  ...overrides
});

describe('OpacService', () => {
  let opacService;
  let mocks;

  beforeEach(() => {
    mocks = crearMocksModelos();
    opacService = new OpacService(mocks);
  });

  describe('obtenerCategorias', () => {
    it('debe retornar categorías activas', async () => {
      mocks.Categoria.findAll.mockResolvedValue([{ idCategoria: 1, nombre: 'Ciencia' }]);

      const resultado = await opacService.obtenerCategorias();

      expect(mocks.Categoria.findAll).toHaveBeenCalledWith({
        where: { activa: true },
        order: [['nombre', 'ASC']]
      });
      expect(resultado).toHaveLength(1);
    });
  });

  describe('obtenerDestacados', () => {
    it('debe retornar hasta 12 materiales recientes', async () => {
      const mockMateriales = [crearMaterialMock(1)];
      mocks.Material.findAll.mockResolvedValue(mockMateriales);

      const resultado = await opacService.obtenerDestacados();

      expect(mocks.Material.findAll).toHaveBeenCalledWith({
        include: [
          { model: mocks.Categoria },
          { model: mocks.Autor, as: 'autores', attributes: ['nombre', 'apellido'] }
        ],
        order: [['createdAt', 'DESC']],
        limit: 12
      });
      expect(resultado).toHaveLength(1);
    });
  });

  describe('buscar', () => {
    it('debe retornar materiales paginados con conteo', async () => {
      const mockMaterial = crearMaterialMock(1, { ejemplares: [{ estado: 'Disponible' }, { estado: 'Prestado' }] });
      mocks.Material.findAndCountAll.mockResolvedValue({ rows: [mockMaterial], count: 1 });

      const resultado = await opacService.buscar({ q: 'test', page: 1 });

      expect(resultado.materiales).toHaveLength(1);
      expect(resultado.total).toBe(1);
      expect(resultado.materiales[0].ejemplaresDisponibles).toBe(1);
    });

    it('debe aplicar filtro por tipo', async () => {
      mocks.Material.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await opacService.buscar({ tipo: 'Revista' });

      const args = mocks.Material.findAndCountAll.mock.calls[0][0];
      expect(args.where.tipo).toBe('Revista');
    });

    it('debe aplicar filtro por año', async () => {
      mocks.Material.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await opacService.buscar({ anioDesde: 2020, anioHasta: 2024 });

      const args = mocks.Material.findAndCountAll.mock.calls[0][0];
      expect(args.where.anioPublicacion).toBeDefined();
    });

    it('debe retornar array vacío si no hay resultados', async () => {
      mocks.Material.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      const resultado = await opacService.buscar({ q: 'noexiste' });

      expect(resultado.materiales).toEqual([]);
      expect(resultado.total).toBe(0);
    });
  });

  describe('obtenerFicha', () => {
    it('debe retornar ficha completa con todas las relaciones', async () => {
      const mockMaterial = crearMaterialMock(1, {
        ejemplares: [{ estado: 'Disponible' }],
        libro: { idLibro: 1, isbn: '123' },
        revista: null,
        tesis: null,
        anuario: null
      });
      mocks.Material.findByPk.mockResolvedValue(mockMaterial);

      const resultado = await opacService.obtenerFicha(1);

      expect(mocks.Material.findByPk).toHaveBeenCalledWith(1, {
        include: [
          { model: mocks.Libro, as: 'libro' },
          { model: mocks.Revista, as: 'revista', include: [
            { model: mocks.Articulo, as: 'articulos', include: [
              { model: mocks.Autor, as: 'autores', through: { attributes: [] }, attributes: ['nombre', 'apellido'] }
            ]}
          ]},
          { model: mocks.Tesis, as: 'tesis' },
          { model: mocks.Anuario, as: 'anuario' },
          { model: mocks.Autor, as: 'autores', through: { attributes: [] } },
          { model: mocks.Categoria },
          { model: mocks.Ejemplar, as: 'ejemplares' }
        ]
      });
      expect(resultado.ejemplaresDisponibles).toBe(1);
    });

    it('debe retornar null si no existe', async () => {
      mocks.Material.findByPk.mockResolvedValue(null);

      const resultado = await opacService.obtenerFicha(999);
      expect(resultado).toBeNull();
    });
  });
});
