/**
 * @requirement RF-22 (OPAC), RF-23 (Búsqueda simple), RF-24 (Búsqueda avanzada), RF-26 (Ficha completa)
 * @use_case CU-22, CU-23, CU-24, CU-26
 * @description Pruebas unitarias del controlador OPAC con mocks.
 */
const OpacController = require('../controllers/opacController');

describe('OpacController', () => {
  let controller;
  let mockOpacService;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockOpacService = {
      obtenerCategorias: jest.fn(),
      obtenerDestacados: jest.fn(),
      buscar: jest.fn(),
      obtenerFicha: jest.fn()
    };
    controller = new OpacController(mockOpacService);

    req = { query: {}, params: {} };
    res = { render: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
    next = jest.fn();
  });

  describe('index', () => {
    it('debe renderizar página principal con categorías y destacados', async () => {
      mockOpacService.obtenerCategorias.mockResolvedValue([{ id: 1, nombre: 'Ciencia' }]);
      mockOpacService.obtenerDestacados.mockResolvedValue([{ idMaterial: 1, titulo: 'Libro A' }]);

      await controller.index(req, res, next);

      expect(res.render).toHaveBeenCalledWith('public/index', expect.objectContaining({
        titulo: 'Catálogo',
        categorias: expect.arrayContaining([{ id: 1, nombre: 'Ciencia' }]),
        destacados: expect.arrayContaining([{ idMaterial: 1, titulo: 'Libro A' }])
      }));
    });

    it('debe pasar error a next si falla', async () => {
      mockOpacService.obtenerCategorias.mockRejectedValue(new Error('Error'));

      await controller.index(req, res, next);

      expect(next).toHaveBeenCalledWith(new Error('Error'));
    });
  });

  describe('buscar', () => {
    it('debe renderizar resultados de búsqueda', async () => {
      req.query = { q: 'test', pagina: '1' };
      mockOpacService.obtenerCategorias.mockResolvedValue([]);
      mockOpacService.buscar.mockResolvedValue({
        materiales: [{ idMaterial: 1, titulo: 'Test' }],
        total: 1, pagina: 1, totalPaginas: 1
      });

      await controller.buscar(req, res, next);

      expect(res.render).toHaveBeenCalledWith('public/catalogo', expect.objectContaining({
        titulo: 'Resultados de búsqueda'
      }));
    });

    it('debe pasar error a next si falla', async () => {
      mockOpacService.obtenerCategorias.mockResolvedValue([]);
      mockOpacService.buscar.mockRejectedValue(new Error('Error búsqueda'));

      await controller.buscar(req, res, next);

      expect(next).toHaveBeenCalledWith(new Error('Error búsqueda'));
    });
  });

  describe('ficha', () => {
    it('debe renderizar ficha del material', async () => {
      req.params.id = '1';
      mockOpacService.obtenerFicha.mockResolvedValue({ idMaterial: 1, titulo: 'Test' });

      await controller.ficha(req, res, next);

      expect(res.render).toHaveBeenCalledWith('public/ficha_material', {
        material: { idMaterial: 1, titulo: 'Test' }
      });
    });

    it('debe retornar 404 si material no existe', async () => {
      req.params.id = '999';
      mockOpacService.obtenerFicha.mockResolvedValue(null);

      await controller.ficha(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith('Material no encontrado');
    });

    it('debe pasar error a next si falla', async () => {
      mockOpacService.obtenerFicha.mockRejectedValue(new Error('Error'));

      await controller.ficha(req, res, next);

      expect(next).toHaveBeenCalledWith(new Error('Error'));
    });
  });
});
