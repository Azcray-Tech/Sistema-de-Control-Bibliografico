/**
 * @requirement RF-07 (Cambiar estado de ejemplar manualmente)
 * @use_case CU-07
 * @description Pruebas unitarias del controlador de ejemplares con mocks.
 */
const EjemplarController = require('../controllers/ejemplarController');

describe('EjemplarController', () => {
  let controller;
  let mockEjemplarService;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockEjemplarService = {
      listarPorMaterial: jest.fn(),
      cambiarEstado: jest.fn()
    };
    controller = new EjemplarController(mockEjemplarService);

    req = { params: {}, body: {}, query: {}, session: { usuarioId: 1, rol: 'Bibliotecario' } };
    res = { render: jest.fn(), redirect: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
    next = jest.fn();
  });

  describe('listarPorMaterial', () => {
    it('debe renderizar ejemplares del material', async () => {
      req.params.materialId = '1';
      mockEjemplarService.listarPorMaterial.mockResolvedValue({
        material: { idMaterial: 1, titulo: 'Test' },
        ejemplares: [{ idEjemplar: 1, identificadorUnico: 'E-001' }]
      });

      await controller.listarPorMaterial(req, res, next);

      expect(res.render).toHaveBeenCalledWith('admin/gestion_ejemplares', expect.objectContaining({
        page: 'materiales', material: expect.objectContaining({ idMaterial: 1 })
      }));
    });

    it('debe retornar 404 si material no existe', async () => {
      req.params.materialId = '999';
      mockEjemplarService.listarPorMaterial.mockResolvedValue({ material: null, ejemplares: [] });

      await controller.listarPorMaterial(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith('Material no encontrado');
    });

    it('debe pasar error a next si el servicio falla', async () => {
      mockEjemplarService.listarPorMaterial.mockRejectedValue(new Error('Error'));

      await controller.listarPorMaterial(req, res, next);

      expect(next).toHaveBeenCalledWith(new Error('Error'));
    });
  });

  describe('cambiarEstado', () => {
    it('debe cambiar estado y redirigir', async () => {
      req.params.ejemplarId = '2';
      req.body = { estado: 'Dañado', motivo: 'Golpe', materialId: '1' };
      mockEjemplarService.cambiarEstado.mockResolvedValue(undefined);

      await controller.cambiarEstado(req, res, next);

      expect(mockEjemplarService.cambiarEstado).toHaveBeenCalledWith('2', 'Dañado', 1, 'Golpe', false);
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('success=1'));
    });

    it('debe enviar esAdmin=true si el rol es Administrador', async () => {
      req.session.rol = 'Administrador';
      req.params.ejemplarId = '2';
      req.body = { estado: 'Disponible', motivo: '', materialId: '1' };
      mockEjemplarService.cambiarEstado.mockResolvedValue(undefined);

      await controller.cambiarEstado(req, res, next);

      expect(mockEjemplarService.cambiarEstado).toHaveBeenCalledWith('2', 'Disponible', 1, '', true);
    });

    it('debe redirigir con error si cambia estado falla', async () => {
      req.params.ejemplarId = '2';
      req.body = { estado: 'Perdido', motivo: '', materialId: '1' };
      mockEjemplarService.cambiarEstado.mockRejectedValue(new Error('Motivo requerido'));

      await controller.cambiarEstado(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('Motivo%20requerido'));
    });
  });
});
