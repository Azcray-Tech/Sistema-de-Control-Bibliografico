const errorHandler = require('../middleware/errorHandler');

describe('errorHandler middleware', () => {
  let err, req, res;

  beforeEach(() => {
    err = new Error('Test error');
    err.stack = 'Error: Test error\n    at test.js:1:1';
    req = { xhr: false, headers: { accept: '' } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      render: jest.fn()
    };
  });

  it('responde con JSON si req.xhr es true', () => {
    req.xhr = true;
    errorHandler(err, req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Test error' });
    expect(res.render).not.toHaveBeenCalled();
  });

  it('responde con JSON si accept incluye json', () => {
    req.headers.accept = 'application/json';
    errorHandler(err, req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Test error' });
  });

  it('renderiza página de error para solicitudes HTML', () => {
    errorHandler(err, req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.render).toHaveBeenCalledWith('admin/error', { mensaje: 'Test error' });
    expect(res.json).not.toHaveBeenCalled();
  });

  it('oculta mensaje en production', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    errorHandler(err, req, res, () => {});
    expect(res.render).toHaveBeenCalledWith('admin/error', { mensaje: 'Error interno del servidor' });
    process.env.NODE_ENV = origEnv;
  });

  it('usa status del error si está definido', () => {
    err.status = 403;
    errorHandler(err, req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('usa 500 por defecto si error no tiene status', () => {
    errorHandler(err, req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('usa err.message si no hay stack', () => {
    delete err.stack;
    errorHandler(err, req, res, () => {});
    expect(res.render).toHaveBeenCalledWith('admin/error', { mensaje: 'Test error' });
  });

  it('usa fallback por defecto si error no tiene message', () => {
    const rawErr = 'Falló todo';
    errorHandler(rawErr, req, res, () => {});
    expect(res.render).toHaveBeenCalledWith('admin/error', { mensaje: 'Error interno del servidor' });
  });
});
