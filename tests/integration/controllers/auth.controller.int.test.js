require('../setup');

const models = require('../../../models');
const AuthService = require('../../../services/auth.service');
const AuthController = require('../../../controllers/authController');
const { registrarAuditoria } = require('../../../middleware/auditoria');
const { limpiarDatosTransaccionales } = require('../../../tests/e2e/helpers/clean');

describe('AuthController - integración con servicios reales', () => {
  const authService = new AuthService(models, registrarAuditoria);
  const controller = new AuthController(authService);

  afterAll(async () => {
    await limpiarDatosTransaccionales();
  });

  function mockRes() {
    const res = {};
    res.render = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    res.status = jest.fn().mockReturnValue(res);
    return res;
  }

  test('mostrarLogin debe renderizar la vista login', () => {
    const req = { query: {} };
    const res = mockRes();
    controller.mostrarLogin(req, res);
    expect(res.render).toHaveBeenCalledWith('login', { error: null });
  });

  test('iniciarSesion debe redirigir al dashboard con credenciales correctas', async () => {
    const req = {
      body: { username: 'admin', password: 'admin123' },
      session: {},
    };
    const res = mockRes();
    const next = jest.fn();

    await controller.iniciarSesion(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/admin/dashboard');
    expect(req.session.usuarioId).toBeDefined();
    expect(req.session.rol).toBe('Administrador');
  });

  test('iniciarSesion debe mostrar error con credenciales incorrectas', async () => {
    const req = {
      body: { username: 'admin', password: 'wrong' },
      session: {},
    };
    const res = mockRes();
    const next = jest.fn();

    await controller.iniciarSesion(req, res, next);
    expect(res.render).toHaveBeenCalledWith('login', expect.objectContaining({
      error: expect.any(String),
    }));
  });

  test('cerrarSesion debe destruir la sesión y redirigir', async () => {
    const req = {
      session: { usuario: { idUsuario: 1 } },
      sessionID: 'test-session',
    };
    const res = mockRes();
    const next = jest.fn();

    req.session.destroy = jest.fn(cb => cb());
    await controller.cerrarSesion(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/admin/login');
  });
});
