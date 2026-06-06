/**
 * @requirement RF-27
 * @use_case CU-27
 * @description Pruebas E2E de configuración del sistema (parámetros).
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
    nombreUsuario: 'biblio_conf_' + Date.now(),
    rol: 'Bibliotecario',
    cedula: 'ConfUser',
  });
  biblioAgent = await loginComo(app, biblioUser.nombreUsuario, 'test123');
});

afterAll(async () => {
  await limpiarDatosTransaccionales();
});

describe('Configuración E2E', () => {
  describe('GET /admin/configuracion', () => {
    it('admin puede ver el formulario de configuración', async () => {
      const res = await adminAgent.get('/admin/configuracion');
      expect(res.status).toBe(200);
      expect(res.text).toContain('dias_prestamo');
    });

    it('bibliotecario recibe 403', async () => {
      const res = await biblioAgent.get('/admin/configuracion');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /admin/configuracion', () => {
    it('admin actualiza parámetros del sistema', async () => {
      const res = await adminAgent
        .post('/admin/configuracion')
        .send({ dias_prestamo: '14', max_prestamos_simultaneos: '5' });
      expect(res.status).toBe(302);
    });

    it('bibliotecario recibe 403 al actualizar', async () => {
      const res = await biblioAgent
        .post('/admin/configuracion')
        .send({ dias_prestamo: '21' });
      expect(res.status).toBe(403);
    });
  });
});
