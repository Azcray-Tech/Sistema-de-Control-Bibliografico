/**
 * @requirement RF-13
 * @use_case CU-13
 * @description Pruebas E2E de autenticación: login, logout, protección de rutas.
 */
const request = require('supertest');
const { app, iniciar } = require('../../app');
const { limpiarDatosTransaccionales } = require('./helpers/clean');

beforeAll(async () => {
  await iniciar();
});

afterAll(async () => {
  await limpiarDatosTransaccionales();
});

describe('Autenticación E2E', () => {
  describe('GET /admin/login', () => {
    it('muestra el formulario de login', async () => {
      const res = await request(app).get('/admin/login');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Iniciar');
    });

    it('redirige a dashboard si ya autenticado', async () => {
      const agent = request.agent(app);
      await agent
        .post('/admin/login')
        .send({ username: 'admin', password: 'admin123' });
      const res = await agent.get('/admin/login');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/dashboard');
    });
  });

  describe('POST /admin/login', () => {
    it('inicia sesión con credenciales correctas', async () => {
      const res = await request(app)
        .post('/admin/login')
        .send({ username: 'admin', password: 'admin123' });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/dashboard');
    });

    it('rechaza credenciales incorrectas', async () => {
      const res = await request(app)
        .post('/admin/login')
        .send({ username: 'admin', password: 'wrongpass' });
      expect(res.status).toBe(200);
      expect(res.text).toContain('Credenciales inválidas');
    });

    it('rechaza usuario inexistente', async () => {
      const res = await request(app)
        .post('/admin/login')
        .send({ username: 'nobody', password: 'x' });
      expect(res.status).toBe(200);
      expect(res.text).toContain('Credenciales inválidas');
    });

    it('rechaza campos vacíos', async () => {
      const res = await request(app)
        .post('/admin/login')
        .send({ username: '', password: '' });
      expect(res.status).toBe(200);
      expect(res.text).toContain('obligatorios');
    });
  });

  describe('GET /admin/logout', () => {
    it('cierra sesión y redirige al login', async () => {
      const agent = request.agent(app);
      await agent
        .post('/admin/login')
        .send({ username: 'admin', password: 'admin123' });
      const res = await agent.get('/admin/logout');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/login');
    });

    it('redirige a login si no hay sesión activa', async () => {
      const res = await request(app).get('/admin/logout');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/login');
    });
  });

  describe('Protección de rutas admin', () => {
    it('redirige a login sin autenticar [GET]', async () => {
      const res = await request(app).get('/admin/dashboard');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/login');
    });

    it('redirige a login sin autenticar [POST]', async () => {
      const res = await request(app)
        .post('/admin/materiales')
        .send({ titulo: 'x' });
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/login');
    });
  });
});
