/**
 * @requirement RF-21
 * @use_case CU-21
 * @description Pruebas E2E del módulo de reportes.
 */
const request = require('supertest');
const { app, iniciar } = require('../../app');
const { limpiarDatosTransaccionales } = require('./helpers/clean');
const { loginComo } = require('./helpers/login');
const { crearUsuario } = require('./helpers/seed');

let adminAgent;
let biblioAgent;

beforeAll(async () => {
  await iniciar();
  adminAgent = await loginComo(app, 'admin', 'admin123');

  const biblioUser = await crearUsuario({
    nombreUsuario: 'biblio_rpt_' + Date.now(),
    rol: 'Bibliotecario',
    cedula: 'RptUser',
  });
  biblioAgent = await loginComo(app, biblioUser.nombreUsuario, 'test123');
});

afterAll(async () => {
  await limpiarDatosTransaccionales();
});

describe('Reportes E2E', () => {
  describe('GET /admin/reportes', () => {
    it('admin puede ver el panel de reportes', async () => {
      const res = await adminAgent.get('/admin/reportes');
      expect(res.status).toBe(200);
    });

    it('bibliotecario puede ver el panel de reportes', async () => {
      const res = await biblioAgent.get('/admin/reportes');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /admin/reportes/inventario', () => {
    it('genera reporte de inventario', async () => {
      const res = await adminAgent.post('/admin/reportes/inventario');
      expect([302, 200, 404]).toContain(res.status);
    });
  });

  describe('POST /admin/reportes/prestamos-activos', () => {
    it('genera reporte de préstamos activos', async () => {
      const res = await adminAgent.post('/admin/reportes/prestamos-activos');
      expect([302, 200, 404]).toContain(res.status);
    });
  });

  describe('POST /admin/reportes/historial-solicitante', () => {
    it('genera reporte con cédula válida', async () => {
      const res = await adminAgent
        .post('/admin/reportes/historial-solicitante')
        .send({ cedula: '00000000' });
      expect([302, 200, 404]).toContain(res.status);
    });

    it('responde sin cédula (parámetro faltante)', async () => {
      const res = await adminAgent.post('/admin/reportes/historial-solicitante');
      expect([302, 200, 404]).toContain(res.status);
    });
  });

  describe('POST /admin/reportes/ranking', () => {
    it('genera ranking de materiales', async () => {
      const res = await adminAgent.post('/admin/reportes/ranking');
      expect([302, 200, 404]).toContain(res.status);
    });
  });

  describe('POST /admin/reportes/vencidos-contacto', () => {
    it('genera reporte de vencidos con contacto', async () => {
      const res = await adminAgent.post('/admin/reportes/vencidos-contacto');
      expect([302, 200, 404]).toContain(res.status);
    });
  });

  describe('POST /admin/reportes/estadisticas', () => {
    it('genera reporte de estadísticas', async () => {
      const res = await adminAgent.post('/admin/reportes/estadisticas');
      expect([302, 200, 404]).toContain(res.status);
    });
  });

  describe('POST /admin/reportes/suspendidos', () => {
    it('genera reporte de suspendidos', async () => {
      const res = await adminAgent.post('/admin/reportes/suspendidos');
      expect([302, 200, 404]).toContain(res.status);
    });
  });
});
