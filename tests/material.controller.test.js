/**
 * @requirement RF-01 (Catalogar Material)
 * @use_case CU-01
 * @description Pruebas unitarias del controlador de materiales con mocks de servicios.
 */
const MaterialController = require('../controllers/materialController');

describe('MaterialController', () => {
  let controller;
  let mockMaterialService;
  let mockCategoriaService;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockMaterialService = {
      listar: jest.fn(),
      obtener: jest.fn(),
      crear: jest.fn(),
      actualizar: jest.fn(),
      eliminar: jest.fn(),
      agregarEjemplares: jest.fn()
    };

    mockCategoriaService = {
      listar: jest.fn().mockResolvedValue([]),
      listarActivas: jest.fn().mockResolvedValue([])
    };

    controller = new MaterialController(mockMaterialService, mockCategoriaService);

    req = {
      query: {},
      params: {},
      body: {},
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
    it('debe renderizar admin/materiales con datos paginados', async () => {
      mockMaterialService.listar.mockResolvedValue({
        materiales: [], total: 0, pagina: 1, totalPaginas: 0
      });

      await controller.listar(req, res, next);

      expect(res.render).toHaveBeenCalledWith('admin/materiales', expect.objectContaining({
        page: 'materiales',
        pagina: 1
      }));
    });

    it('debe llamar a next con error si el servicio falla', async () => {
      const error = new Error('DB error');
      mockMaterialService.listar.mockRejectedValue(error);

      await controller.listar(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('mostrarFormulario', () => {
    it('debe renderizar formulario vacío para nuevo material', async () => {
      await controller.mostrarFormulario(req, res, next);

      expect(res.render).toHaveBeenCalledWith('admin/material_form', expect.objectContaining({
        material: null
      }));
    });

    it('debe cargar material existente si hay params.id', async () => {
      req.params.id = '1';
      mockMaterialService.obtener.mockResolvedValue({ idMaterial: 1, titulo: 'Test' });

      await controller.mostrarFormulario(req, res, next);

      expect(mockMaterialService.obtener).toHaveBeenCalledWith('1');
      expect(res.render).toHaveBeenCalledWith('admin/material_form', expect.objectContaining({
        material: expect.objectContaining({ idMaterial: 1 })
      }));
    });

    it('debe retornar 404 si material no existe', async () => {
      req.params.id = '999';
      mockMaterialService.obtener.mockResolvedValue(null);

      await controller.mostrarFormulario(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debe llamar a next si listarActivas falla', async () => {
      const error = new Error('DB error');
      mockCategoriaService.listarActivas.mockRejectedValue(error);

      await controller.mostrarFormulario(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('guardar', () => {
    it('debe crear material y redirigir', async () => {
      req.body = { titulo: 'Nuevo', tipo: 'libro', autores: [] };
      mockMaterialService.crear.mockResolvedValue({ idMaterial: 1, titulo: 'Nuevo' });

      await controller.guardar(req, res, next);

      expect(mockMaterialService.crear).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/admin/materiales?success=creado'));
    });

    it('debe actualizar material existente si hay params.id', async () => {
      req.params.id = '1';
      req.body = { titulo: 'Editado', tipo: 'libro', autores: [] };
      mockMaterialService.actualizar.mockResolvedValue({ idMaterial: 1 });

      await controller.guardar(req, res, next);

      expect(mockMaterialService.actualizar).toHaveBeenCalledWith('1', expect.any(Object), 1);
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/admin/materiales?success=actualizado'));
    });

    it('debe redirigir con error si actualizar falla', async () => {
      req.params.id = '1';
      req.body = { titulo: 'Fallo' };
      mockMaterialService.actualizar.mockRejectedValue(new Error('Error al actualizar'));

      await controller.guardar(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error='));
    });

    it('debe renderizar formulario con error si crear falla', async () => {
      req.body = { titulo: 'Fallo', tipo: 'libro' };
      mockMaterialService.crear.mockRejectedValue(new Error('Datos inválidos'));

      await controller.guardar(req, res, next);

      expect(res.render).toHaveBeenCalledWith('admin/material_form', expect.objectContaining({
        error: 'Datos inválidos',
        formData: req.body
      }));
    });
  });

  describe('agregarEjemplares', () => {
    it('debe agregar ejemplares y redirigir', async () => {
      req.params.id = '1';
      req.body.identificadores = ['EJ-001', 'EJ-002'];
      mockMaterialService.agregarEjemplares.mockResolvedValue(undefined);

      await controller.agregarEjemplares(req, res, next);

      expect(mockMaterialService.agregarEjemplares).toHaveBeenCalledWith('1', ['EJ-001', 'EJ-002'], 1);
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/admin/materiales/1/ejemplares/gestion?success=creado'));
    });

    it('debe redirigir con error si identificadores está vacío', async () => {
      req.params.id = '1';
      req.body.identificadores = [];

      await controller.agregarEjemplares(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error='));
    });

    it('debe redirigir con error si identificadores es string vacío', async () => {
      req.params.id = '1';
      req.body.identificadores = '';

      await controller.agregarEjemplares(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error='));
    });

    it('debe redirigir con error si el servicio falla', async () => {
      req.params.id = '1';
      req.body.identificadores = ['ID'];
      mockMaterialService.agregarEjemplares.mockRejectedValue(new Error('Error al agregar'));

      await controller.agregarEjemplares(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('Error%20al%20agregar'));
    });
  });

  describe('eliminar', () => {
    it('debe eliminar material y redirigir', async () => {
      req.params.id = '1';
      mockMaterialService.eliminar.mockResolvedValue(undefined);

      await controller.eliminar(req, res, next);

      expect(mockMaterialService.eliminar).toHaveBeenCalledWith('1', 1);
      expect(res.redirect).toHaveBeenCalledWith('/admin/materiales?success=baja');
    });

    it('debe redirigir con error si el servicio falla', async () => {
      req.params.id = '1';
      mockMaterialService.eliminar.mockRejectedValue(new Error('Error al eliminar'));

      await controller.eliminar(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error='));
    });
  });
});
