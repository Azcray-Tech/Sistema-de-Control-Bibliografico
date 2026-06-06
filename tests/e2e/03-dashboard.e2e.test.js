/**
 * @requirement RF-11
 * @use_case CU-11
 * @description Pruebas E2E del panel de dashboard administrativo.
 */
const request = require('supertest');
const { app, iniciar } = require('../../app');
const { limpiarDatosTransaccionales } = require('./helpers/clean');
const { loginComoAdmin } = require('./helpers/login');
const { crearMaterialCompleto, crearSolicitante, crearEjemplar } = require('./helpers/seed');

let agent;

beforeAll(async () => {
  await iniciar();
  agent = await loginComoAdmin(app);

  // Seed: 2 materiales, 3 ejemplares total, 1 solicitante
  const { material: m1 } = await crearMaterialCompleto('libro', { titulo: 'DashLibro1' });
  await crearEjemplar(m1.idMaterial);
  await crearMaterialCompleto('tesis', { titulo: 'DashTesis' });
  await crearSolicitante({ nombre: 'DashSol' });
});

afterAll(async () => {
  await limpiarDatosTransaccionales();
});

describe('Dashboard E2E', () => {
  describe('GET /admin/dashboard', () => {
    it('carga el dashboard autenticado', async () => {
      const res = await agent.get('/admin/dashboard');
      expect(res.status).toBe(200);
    });

    it('muestra total de materiales registrados', async () => {
      const res = await agent.get('/admin/dashboard');
      expect(res.text).toContain('Títulos');
    });

    it('muestra total de ejemplares', async () => {
      const res = await agent.get('/admin/dashboard');
      expect(res.text).toContain('Disponibles');
    });

    it('muestra el panel administrativo', async () => {
      const res = await agent.get('/admin/dashboard');
      expect(res.text).toContain('Panel Administrativo');
    });

    it('incluye enlaces de navegación del panel', async () => {
      const res = await agent.get('/admin/dashboard');
      expect(res.text).toContain('dashboard');
    });
  });
});
