/**
 * @requirement RF-07 (Cambiar estado de ejemplar manualmente)
 * @use_case CU-07
 * @description Pruebas unitarias del controlador de ejemplares.
 */
const EjemplarController = require('../controllers/ejemplarController');

describe('EjemplarController', () => {
  let controller;
  let mockService;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockService = {
      listarPorMaterial: jest.fn().mockResolvedValue({
        material: { idMaterial: 1, titulo: 'Libro' },
        ejemplares: [{ idEjemplar: 1, identificadorUnico: 'EJ-001', estado: 'Disponible' }]
      }),
      cambiarEstado: jest.fn().mockResolvedValue(undefined)
    };

    controller = new EjemplarController(mockService);

    req = {
      query: {}, params: {}, body: {},
      session: { usuarioId: 1, rol: 'Bibliotecario' }
    };

    res = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };

    next = jest.fn();
  });

  describe('listarPorMaterial', () => {
    it('debe renderizar gestion_ejemplares con material y ejemplares', async () => {
      req.params.materialId = '1';

      await controller.listarPorMaterial(req, res, next);

      expect(mockService.listarPorMaterial).toHaveBeenCalledWith('1');
      expect(next).not.toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith('admin/gestion_ejemplares', {
        page: 'materiales', material: expect.any(Object),
        ejemplares: expect.any(Array), error: null, success: null
      });
    });

    it('debe retornar 404 si el material no existe', async () => {
      mockService.listarPorMaterial.mockResolvedValue({ material: null, ejemplares: [] });

      await controller.listarPorMaterial(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith('Material no encontrado');
    });

    it('debe pasar next si el servicio falla', async () => {
      mockService.listarPorMaterial.mockRejectedValue(new Error('DB error'));

      await controller.listarPorMaterial(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('cambiarEstado', () => {
    it('debe cambiar estado y redirigir con éxito', async () => {
      req.params = { ejemplarId: '1' };
      req.body = { estado: 'Dañado', motivo: 'Roto', materialId: '5' };

      await controller.cambiarEstado(req, res, next);

      expect(mockService.cambiarEstado).toHaveBeenCalledWith('1', 'Dañado', 1, 'Roto', false);
      expect(res.redirect).toHaveBeenCalledWith('/admin/materiales/5/ejemplares/gestion?success=1');
    });

    it('debe pasar esAdmin=true si el rol es Administrador', async () => {
      req.session.rol = 'Administrador';
      req.params = { ejemplarId: '1' };
      req.body = { estado: 'Disponible', motivo: 'Recuperado', materialId: '5' };

      await controller.cambiarEstado(req, res, next);

      expect(mockService.cambiarEstado).toHaveBeenCalledWith('1', 'Disponible', 1, 'Recuperado', true);
    });

    it('debe redirigir con error si el servicio falla', async () => {
      mockService.cambiarEstado.mockRejectedValue(new Error('No permitido'));
      req.params = { ejemplarId: '1' };
      req.body = { materialId: '5' };

      await controller.cambiarEstado(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=No%20permitido'));
    });
  });
});
