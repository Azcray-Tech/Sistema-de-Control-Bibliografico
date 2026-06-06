/**
 * @requirement RF-09 (Gestionar categorías de materiales)
 * @use_case CU-09
 * @description Pruebas unitarias del controlador de categorías.
 */
const CategoriaController = require('../controllers/categoriaController');

describe('CategoriaController', () => {
  let controller;
  let mockService;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockService = {
      listarPaginado: jest.fn().mockResolvedValue({
        categorias: [{ idCategoria: 1, nombre: 'Ciencia', activa: true }],
        total: 1, pagina: 1, totalPaginas: 1
      }),
      guardar: jest.fn().mockResolvedValue(undefined),
      desactivar: jest.fn().mockResolvedValue(undefined)
    };

    controller = new CategoriaController(mockService);

    req = {
      query: {}, params: {}, body: {},
      session: { usuarioId: 1 }
    };

    res = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };

    next = jest.fn();
  });

  describe('listar', () => {
    it('debe renderizar admin/categorias con la lista paginada', async () => {
      req.query = { page: '2', q: 'ciencia' };

      await controller.listar(req, res, next);

      expect(mockService.listarPaginado).toHaveBeenCalledWith('2', 'ciencia');
      expect(res.render).toHaveBeenCalledWith('admin/categorias', {
        page: 'categorias', categorias: expect.any(Array),
        total: 1, pagina: 1, totalPaginas: 1,
        q: 'ciencia', error: null, success: undefined
      });
    });

    it('debe usar string vacío si no se pasa q', async () => {
      req.query = {};

      await controller.listar(req, res, next);

      expect(res.render).toHaveBeenCalledWith('admin/categorias', expect.objectContaining({
        q: ''
      }));
    });

    it('debe pasar next si el servicio falla', async () => {
      const error = new Error('DB error');
      mockService.listarPaginado.mockRejectedValue(error);

      await controller.listar(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('guardar', () => {
    it('debe crear y redirigir cuando no hay id', async () => {
      req.body = { nombre: 'Nueva', descripcion: 'Desc' };

      await controller.guardar(req, res, next);

      expect(mockService.guardar).toHaveBeenCalledWith(undefined, { nombre: 'Nueva', descripcion: 'Desc' }, 1);
      expect(res.redirect).toHaveBeenCalledWith('/admin/categorias?success=creado');
    });

    it('debe actualizar y redirigir cuando hay id', async () => {
      req.params = { id: '5' };
      req.body = { nombre: 'Editada', descripcion: 'Desc' };

      await controller.guardar(req, res, next);

      expect(mockService.guardar).toHaveBeenCalledWith('5', { nombre: 'Editada', descripcion: 'Desc' }, 1);
      expect(res.redirect).toHaveBeenCalledWith('/admin/categorias?success=actualizado');
    });

    it('debe re-renderizar con error si el servicio falla', async () => {
      mockService.guardar.mockRejectedValue(new Error('Nombre duplicado'));

      await controller.guardar(req, res, next);

      expect(mockService.listarPaginado).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith('admin/categorias', expect.objectContaining({
        error: 'Nombre duplicado', success: null
      }));
    });
  });

  describe('desactivar', () => {
    it('debe desactivar y redirigir', async () => {
      req.params = { id: '1' };

      await controller.desactivar(req, res, next);

      expect(mockService.desactivar).toHaveBeenCalledWith('1', 1);
      expect(res.redirect).toHaveBeenCalledWith('/admin/categorias?success=desactivado');
    });

    it('debe re-renderizar con error si el servicio falla', async () => {
      req.params = { id: '1' };
      mockService.desactivar.mockRejectedValue(new Error('Tiene materiales'));

      await controller.desactivar(req, res, next);

      expect(res.render).toHaveBeenCalledWith('admin/categorias', expect.objectContaining({
        error: 'Tiene materiales', success: null
      }));
    });
  });
});
