/**
 * @requirement RF-09 (Gestionar categorías de materiales)
 * @use_case CU-09
 * @description Pruebas unitarias del controlador de categorías con mocks.
 */
const CategoriaController = require('../controllers/categoriaController');

describe('CategoriaController', () => {
  let controller;
  let mockCategoriaService;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockCategoriaService = {
      listarPaginado: jest.fn(),
      guardar: jest.fn(),
      desactivar: jest.fn()
    };
    controller = new CategoriaController(mockCategoriaService);

    req = { query: {}, params: {}, body: {}, session: { usuarioId: 1 } };
    res = { render: jest.fn(), redirect: jest.fn() };
    next = jest.fn();
  });

  describe('listar', () => {
    it('debe renderizar categorías paginadas', async () => {
      mockCategoriaService.listarPaginado.mockResolvedValue({
        categorias: [{ id: 1, nombre: 'Ciencia' }], total: 1, pagina: 1, totalPaginas: 1
      });

      await controller.listar(req, res, next);

      expect(res.render).toHaveBeenCalledWith('admin/categorias', expect.objectContaining({
        page: 'categorias', total: 1
      }));
    });

    it('debe pasar error a next si el servicio falla', async () => {
      mockCategoriaService.listarPaginado.mockRejectedValue(new Error('Error DB'));

      await controller.listar(req, res, next);

      expect(next).toHaveBeenCalledWith(new Error('Error DB'));
    });
  });

  describe('guardar', () => {
    it('debe crear y redirigir', async () => {
      req.body = { nombre: 'Nueva', descripcion: 'Desc' };
      mockCategoriaService.guardar.mockResolvedValue(undefined);

      await controller.guardar(req, res, next);

      expect(mockCategoriaService.guardar).toHaveBeenCalledWith(undefined, { nombre: 'Nueva', descripcion: 'Desc' }, 1);
      expect(res.redirect).toHaveBeenCalledWith('/admin/categorias?success=creado');
    });

    it('debe actualizar si hay id en params', async () => {
      req.body = { nombre: 'Editada', descripcion: '' };
      req.params.id = '5';
      mockCategoriaService.guardar.mockResolvedValue(undefined);

      await controller.guardar(req, res, next);

      expect(mockCategoriaService.guardar).toHaveBeenCalledWith('5', { nombre: 'Editada', descripcion: '' }, 1);
      expect(res.redirect).toHaveBeenCalledWith('/admin/categorias?success=actualizado');
    });

    it('debe renderizar con error si guardar falla', async () => {
      req.body = { nombre: '', descripcion: '' };
      mockCategoriaService.guardar.mockRejectedValue(new Error('Nombre requerido'));
      mockCategoriaService.listarPaginado.mockResolvedValue({
        categorias: [], total: 0, pagina: 1, totalPaginas: 1
      });

      await controller.guardar(req, res, next);

      expect(res.render).toHaveBeenCalledWith('admin/categorias', expect.objectContaining({
        error: 'Nombre requerido'
      }));
    });
  });

  describe('desactivar', () => {
    it('debe desactivar y redirigir', async () => {
      req.params.id = '3';
      mockCategoriaService.desactivar.mockResolvedValue(undefined);

      await controller.desactivar(req, res, next);

      expect(mockCategoriaService.desactivar).toHaveBeenCalledWith('3', 1);
      expect(res.redirect).toHaveBeenCalledWith('/admin/categorias?success=desactivado');
    });

    it('debe renderizar con error si desactivar falla', async () => {
      req.params.id = '99';
      mockCategoriaService.desactivar.mockRejectedValue(new Error('Categoría no encontrada'));
      mockCategoriaService.listarPaginado.mockResolvedValue({
        categorias: [], total: 0, pagina: 1, totalPaginas: 1
      });

      await controller.desactivar(req, res, next);

      expect(res.render).toHaveBeenCalledWith('admin/categorias', expect.objectContaining({
        error: 'Categoría no encontrada'
      }));
    });
  });
});
