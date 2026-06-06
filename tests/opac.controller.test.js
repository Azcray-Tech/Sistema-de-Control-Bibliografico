/**
 * @requirement RF-22 (OPAC), RF-23 (Búsqueda simple), RF-24 (Búsqueda avanzada), RF-26 (Ficha completa)
 * @use_case CU-22, CU-23, CU-24, CU-26
 * @description Pruebas unitarias del controlador OPAC.
 */
const OpacController = require('../controllers/opacController');

describe('OpacController', () => {
  let controller;
  let mockService;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockService = {
      obtenerCategorias: jest.fn().mockResolvedValue([]),
      obtenerDestacados: jest.fn().mockResolvedValue([]),
      buscar: jest.fn().mockResolvedValue({
        materiales: [], total: 0, page: 1, totalPaginas: 1
      }),
      obtenerFicha: jest.fn().mockResolvedValue(null)
    };

    controller = new OpacController(mockService);

    req = { query: {}, params: {} };

    res = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };

    next = jest.fn();
  });

  describe('index', () => {
    it('debe renderizar public/index con categorías y destacados', async () => {
      mockService.obtenerCategorias.mockResolvedValue([{ idCategoria: 1, nombre: 'Ciencia' }]);
      mockService.obtenerDestacados.mockResolvedValue([{ idMaterial: 1, titulo: 'Libro' }]);

      await controller.index(req, res, next);

      expect(mockService.obtenerCategorias).toHaveBeenCalled();
      expect(mockService.obtenerDestacados).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith('public/index', {
        titulo: 'Catálogo', categorias: expect.any(Array),
        destacados: expect.any(Array),
        q: '', autor: '', categoriaId: null, anioDesde: '', anioHasta: '',
        tipo: '', queryTitulo: '', isbn: ''
      });
    });

    it('debe retornar 500 si el servicio falla', async () => {
      mockService.obtenerCategorias.mockRejectedValue(new Error('DB error'));

      await controller.index(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Error al cargar el catálogo');
    });
  });

  describe('buscar', () => {
    it('debe renderizar public/catalogo con resultados', async () => {
      mockService.obtenerCategorias.mockResolvedValue([{ idCategoria: 1, nombre: 'Ciencia' }]);
      mockService.buscar.mockResolvedValue({
        materiales: [{ idMaterial: 1, titulo: 'Resultado' }],
        total: 1, page: 1, totalPaginas: 1
      });
      req.query = { q: 'test', page: '1' };

      await controller.buscar(req, res, next);

      expect(mockService.buscar).toHaveBeenCalledWith({
        q: 'test', autor: undefined, categoriaId: undefined,
        anioDesde: undefined, anioHasta: undefined, tipo: undefined, page: '1'
      });
      expect(res.render).toHaveBeenCalledWith('public/catalogo', expect.objectContaining({
        titulo: 'Resultados de búsqueda', materiales: expect.any(Array)
      }));
    });

    it('debe retornar 500 si el servicio falla', async () => {
      mockService.buscar.mockRejectedValue(new Error('DB error'));

      await controller.buscar(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Error al realizar la búsqueda');
    });

    it('debe manejar valores vacíos en query params', async () => {
      mockService.obtenerCategorias.mockResolvedValue([]);
      mockService.buscar.mockResolvedValue({
        materiales: [], total: 0, page: 1, totalPaginas: 1
      });
      req.query = {};

      await controller.buscar(req, res, next);

      expect(res.render).toHaveBeenCalledWith('public/catalogo', expect.objectContaining({
        q: '', autor: '', categoriaId: '', anioDesde: '', anioHasta: '', tipo: ''
      }));
    });
  });

  describe('ficha', () => {
    it('debe renderizar public/ficha_material', async () => {
      const mockMaterial = { idMaterial: 1, titulo: 'Ficha' };
      mockService.obtenerFicha.mockResolvedValue(mockMaterial);
      req.params = { id: '1' };

      await controller.ficha(req, res, next);

      expect(mockService.obtenerFicha).toHaveBeenCalledWith('1');
      expect(res.render).toHaveBeenCalledWith('public/ficha_material', { material: mockMaterial });
    });

    it('debe retornar 404 si no existe', async () => {
      req.params = { id: '999' };

      await controller.ficha(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith('Material no encontrado');
    });

    it('debe retornar 500 si el servicio falla', async () => {
      mockService.obtenerFicha.mockRejectedValue(new Error('DB error'));
      req.params = { id: '1' };

      await controller.ficha(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Error al cargar la ficha del material');
    });
  });
});
