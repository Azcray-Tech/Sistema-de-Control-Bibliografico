/**
 * @requirement RF-13 (Iniciar sesión)
 * @use_case CU-13
 * @description Pruebas unitarias del controlador de autenticación.
 */
const AuthController = require('../controllers/authController');

describe('AuthController', () => {
  let controller;
  let mockAuthService;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockAuthService = {
      iniciarSesion: jest.fn(),
      registrarSalida: jest.fn().mockResolvedValue(undefined)
    };

    controller = new AuthController(mockAuthService);

    req = {
      query: {}, body: {},
      session: {
        usuarioId: 1,
        destroy: jest.fn().mockImplementation(cb => cb())
      }
    };

    res = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };

    next = jest.fn();
  });

  describe('mostrarLogin', () => {
    it('debe renderizar login sin error', async () => {
      controller.mostrarLogin(req, res);

      expect(res.render).toHaveBeenCalledWith('login', { error: null });
    });

    it('debe renderizar login con error si query error existe', async () => {
      req.query = { error: 'Sesión expirada' };
      controller.mostrarLogin(req, res);

      expect(res.render).toHaveBeenCalledWith('login', { error: 'Sesión expirada' });
    });
  });

  describe('iniciarSesion', () => {
    it('debe iniciar sesión y redirigir al dashboard', async () => {
      mockAuthService.iniciarSesion.mockResolvedValue({
        idUsuario: 1, nombreUsuario: 'admin', rol: 'Administrador', nombre: 'Admin'
      });
      req.body = { username: 'admin', password: 'admin123' };

      await controller.iniciarSesion(req, res, next);

      expect(mockAuthService.iniciarSesion).toHaveBeenCalledWith('admin', 'admin123');
      expect(req.session.usuarioId).toBe(1);
      expect(req.session.nombreUsuario).toBe('admin');
      expect(req.session.rol).toBe('Administrador');
      expect(res.redirect).toHaveBeenCalledWith('/admin/dashboard');
    });

    it('debe re-renderizar login con error si credenciales inválidas', async () => {
      mockAuthService.iniciarSesion.mockRejectedValue(new Error('Credenciales inválidas'));
      req.body = { username: 'bad', password: 'wrong' };

      await controller.iniciarSesion(req, res, next);

      expect(res.render).toHaveBeenCalledWith('login', { error: 'Credenciales inválidas' });
    });
  });

  describe('cerrarSesion', () => {
    it('debe registrar salida y redirigir al login', async () => {
      await controller.cerrarSesion(req, res, next);

      expect(mockAuthService.registrarSalida).toHaveBeenCalledWith(1);
      expect(req.session.destroy).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('/admin/login');
    });
  });
});
