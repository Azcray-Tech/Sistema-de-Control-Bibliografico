const mockFindByPk = jest.fn();
jest.mock('../models', () => ({
  UsuarioSistema: { findByPk: mockFindByPk }
}));

const { requiereAuth, redirigirSiAutenticado, requiereRol, cargarUsuarioSession } = require('../middleware/auth');

describe('auth middleware — requiereAuth', () => {
  let req, res, next;

  beforeEach(() => {
    req = { session: {} };
    res = { redirect: jest.fn() };
    next = jest.fn();
  });

  it('redirige a /admin/login si no hay session', () => {
    req.session = null;
    requiereAuth(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/admin/login');
    expect(next).not.toHaveBeenCalled();
  });

  it('redirige a /admin/login si session no tiene usuarioId', () => {
    req.session = {};
    requiereAuth(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/admin/login');
    expect(next).not.toHaveBeenCalled();
  });

  it('llama next() si session tiene usuarioId', () => {
    req.session.usuarioId = 1;
    requiereAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });
});

describe('auth middleware — redirigirSiAutenticado', () => {
  let req, res, next;

  beforeEach(() => {
    req = { session: {} };
    res = { redirect: jest.fn() };
    next = jest.fn();
  });

  it('redirige a /admin/dashboard si ya está autenticado', () => {
    req.session.usuarioId = 1;
    redirigirSiAutenticado(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/admin/dashboard');
    expect(next).not.toHaveBeenCalled();
  });

  it('llama next() si no está autenticado', () => {
    req.session = {};
    redirigirSiAutenticado(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('llama next() si session es null', () => {
    req.session = null;
    redirigirSiAutenticado(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('auth middleware — requiereRol', () => {
  let req, res, next;

  beforeEach(() => {
    req = { session: { rol: 'Administrador' } };
    res = { status: jest.fn().mockReturnThis(), render: jest.fn() };
    next = jest.fn();
  });

  it('retorna 403 si no hay session', () => {
    req.session = null;
    const middleware = requiereRol('Administrador');
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna 403 si el rol no está incluido', () => {
    const middleware = requiereRol('Bibliotecario');
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('llama next() si el rol coincide', () => {
    const middleware = requiereRol('Administrador', 'Bibliotecario');
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('auth middleware — cargarUsuarioSession', () => {
  let req, res;

  beforeEach(() => {
    mockFindByPk.mockReset();
    req = { session: {} };
    res = { locals: {} };
  });

  it('setea locals con null si no hay session', async () => {
    req.session = null;
    await cargarUsuarioSession(req, res, () => {});
    expect(res.locals.usuario).toBeNull();
    expect(res.locals.estaAutenticado).toBe(false);
  });

  it('setea locals con datos del usuario si existe', async () => {
    const usuario = { idUsuario: 1, nombreUsuario: 'admin', nombre: 'Admin', apellido: 'Test', rol: 'Administrador' };
    mockFindByPk.mockResolvedValue(usuario);
    req.session.usuarioId = 1;
    await cargarUsuarioSession(req, res, () => {});
    expect(res.locals.usuario).toEqual(usuario);
    expect(res.locals.estaAutenticado).toBe(true);
  });

  it('setea locals con null si findByPk falla', async () => {
    mockFindByPk.mockRejectedValue(new Error('DB error'));
    req.session.usuarioId = 1;
    await cargarUsuarioSession(req, res, () => {});
    expect(res.locals.usuario).toBeNull();
    expect(res.locals.estaAutenticado).toBe(false);
  });

  it('setea usuario null pero autenticado true si no se encuentra (comportamiento actual)', async () => {
    mockFindByPk.mockResolvedValue(null);
    req.session.usuarioId = 999;
    await cargarUsuarioSession(req, res, () => {});
    expect(res.locals.usuario).toBeNull();
    expect(res.locals.estaAutenticado).toBe(true);
  });
});
