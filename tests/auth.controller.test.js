/**
 * @requirement RF-13 (Iniciar sesión)
 * @use_case CU-13
 * @description Pruebas unitarias del controlador de autenticación con mocks.
 */
const AuthController = require('../controllers/authController');

describe('AuthController', () => {
  let controller;
  let mockAuthService;
  let req;
  let res;

  beforeEach(() => {
    mockAuthService = {
      iniciarSesion: jest.fn(),
      registrarSalida: jest.fn()
    };
    controller = new AuthController(mockAuthService);

    req = {
      body: {},
      query: {},
      session: {
        destroy: jest.fn(cb => cb()),
        regenerate: jest.fn(cb => cb(null))
      }
    };
    res = {
      render: jest.fn(),
      redirect: jest.fn()
    };
  });

  describe('mostrarLogin', () => {
    it('debe renderizar login sin error', () => {
      controller.mostrarLogin(req, res);
      expect(res.render).toHaveBeenCalledWith('login', { error: null });
    });

    it('debe renderizar login con error si está en query', () => {
      req.query.error = 'Credenciales inválidas';
      controller.mostrarLogin(req, res);
      expect(res.render).toHaveBeenCalledWith('login', { error: 'Credenciales inválidas' });
    });
  });

  describe('iniciarSesion', () => {
    it('debe regenerar sesión, autenticar y redirigir al dashboard', async () => {
      req.body = { username: 'admin', password: 'admin123' };
      mockAuthService.iniciarSesion.mockResolvedValue({
        idUsuario: 1, nombreUsuario: 'admin', rol: 'Administrador', nombre: 'Admin'
      });

      await controller.iniciarSesion(req, res);

      expect(req.session.regenerate).toHaveBeenCalled();
      expect(req.session.usuarioId).toBe(1);
      expect(req.session.rol).toBe('Administrador');
      expect(res.redirect).toHaveBeenCalledWith('/admin/dashboard');
    });

    it('debe renderizar login con error si falla autenticación', async () => {
      req.body = { username: 'admin', password: 'wrong' };
      mockAuthService.iniciarSesion.mockRejectedValue(new Error('Credenciales inválidas'));

      await controller.iniciarSesion(req, res);

      expect(res.render).toHaveBeenCalledWith('login', { error: 'Credenciales inválidas' });
    });
  });

  describe('cerrarSesion', () => {
    it('debe cerrar sesión y redirigir al login', async () => {
      req.session.usuarioId = 1;

      await controller.cerrarSesion(req, res);

      expect(mockAuthService.registrarSalida).toHaveBeenCalledWith(1);
      expect(req.session.destroy).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('/admin/login');
    });

    it('debe destruir sesión incluso si registro de salida falla', async () => {
      mockAuthService.registrarSalida.mockRejectedValue(new Error('Error DB'));
      req.session.usuarioId = 1;

      await expect(controller.cerrarSesion(req, res)).rejects.toThrow('Error DB');
      expect(req.session.destroy).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('/admin/login');
    });
  });
});
