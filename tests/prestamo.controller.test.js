/**
 * @requirement RF-15 (Registrar préstamo), RF-17 (Renovar), RF-18 (Devolver), RF-20 (Sanciones)
 * @use_case CU-15, CU-17, CU-18, CU-20
 * @description Pruebas unitarias del controlador de préstamos.
 */
const PrestamoController = require('../controllers/prestamoController');

describe('PrestamoController', () => {
  let controller;
  let mockService;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockService = {
      listarActivos: jest.fn().mockResolvedValue([]),
      registrar: jest.fn().mockResolvedValue(undefined),
      renovar: jest.fn().mockResolvedValue(undefined),
      devolver: jest.fn().mockResolvedValue(undefined),
      historial: jest.fn().mockResolvedValue([]),
      obtenerVencidos: jest.fn().mockResolvedValue([]),
      listarSancionesActivas: jest.fn().mockResolvedValue([]),
      levantarSancion: jest.fn().mockResolvedValue(undefined)
    };

    controller = new PrestamoController(mockService);

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
    it('debe renderizar admin/prestamos con la lista activa', async () => {
      await controller.listar(req, res, next);

      expect(mockService.listarActivos).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith('admin/prestamos', {
        page: 'prestamos', prestamos: [], error: null, success: undefined
      });
    });

    it('debe pasar next si el servicio falla', async () => {
      mockService.listarActivos.mockRejectedValue(new Error('DB error'));

      await controller.listar(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('registrar', () => {
    it('debe registrar préstamo y redirigir', async () => {
      req.body = { solicitanteCedula: '123', ejemplarId: '1' };

      await controller.registrar(req, res, next);

      expect(mockService.registrar).toHaveBeenCalledWith('123', '1', 1);
      expect(res.redirect).toHaveBeenCalledWith('/admin/prestamos?success=1');
    });

    it('debe re-renderizar con error si falla', async () => {
      mockService.registrar.mockRejectedValue(new Error('Sin ejemplares disponibles'));
      req.body = { solicitanteCedula: '123', ejemplarId: '1' };

      await controller.registrar(req, res, next);

      expect(mockService.listarActivos).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith('admin/prestamos', {
        page: 'prestamos', prestamos: [], error: 'Sin ejemplares disponibles', success: null
      });
    });
  });

  describe('renovar', () => {
    it('debe renovar y redirigir', async () => {
      req.params = { id: '5' };

      await controller.renovar(req, res, next);

      expect(mockService.renovar).toHaveBeenCalledWith('5');
      expect(res.redirect).toHaveBeenCalledWith('/admin/prestamos?success=2');
    });

    it('debe redirigir con error si falla', async () => {
      mockService.renovar.mockRejectedValue(new Error('Límite alcanzado'));
      req.params = { id: '5' };

      await controller.renovar(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=L%C3%ADmite%20alcanzado'));
    });
  });

  describe('devolver', () => {
    it('debe devolver y redirigir', async () => {
      req.params = { id: '1' };
      req.body = { estadoEjemplar: 'Disponible', motivo: '' };

      await controller.devolver(req, res, next);

      expect(mockService.devolver).toHaveBeenCalledWith('1', 1);
      expect(res.redirect).toHaveBeenCalledWith('/admin/prestamos?success=3');
    });

    it('debe redirigir con error si falla', async () => {
      mockService.devolver.mockRejectedValue(new Error('Préstamo no encontrado'));
      req.params = { id: '999' };
      req.body = {};

      await controller.devolver(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=Pr%C3%A9stamo%20no%20encontrado'));
    });
  });

  describe('historial', () => {
    it('debe renderizar admin/historial', async () => {
      await controller.historial(req, res, next);

      expect(mockService.historial).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith('admin/historial', { page: 'historial', prestamos: [] });
    });

    it('debe pasar next si el servicio falla', async () => {
      mockService.historial.mockRejectedValue(new Error('DB error'));

      await controller.historial(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('sanciones', () => {
    it('debe renderizar admin/sanciones con vencidos y activas', async () => {
      await controller.sanciones(req, res, next);

      expect(mockService.obtenerVencidos).toHaveBeenCalled();
      expect(mockService.listarSancionesActivas).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith('admin/sanciones', {
        page: 'sanciones', prestamosVencidos: [], sancionesActivas: [],
        error: null, success: undefined
      });
    });

    it('debe pasar next si el servicio falla', async () => {
      mockService.obtenerVencidos.mockRejectedValue(new Error('DB error'));

      await controller.sanciones(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('levantarSancion', () => {
    it('debe levantar sanción y redirigir', async () => {
      req.body = { cedula: '123', motivo: 'Pago de multa' };

      await controller.levantarSancion(req, res, next);

      expect(mockService.levantarSancion).toHaveBeenCalledWith('123', 1, 'Pago de multa');
      expect(res.redirect).toHaveBeenCalledWith('/admin/prestamos/sanciones?success=levantado');
    });

    it('debe redirigir con error si falla', async () => {
      mockService.levantarSancion.mockRejectedValue(new Error('Solicitante no encontrado'));
      req.body = { cedula: '999', motivo: 'Motivo' };

      await controller.levantarSancion(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=Solicitante%20no%20encontrado'));
    });
  });
});
