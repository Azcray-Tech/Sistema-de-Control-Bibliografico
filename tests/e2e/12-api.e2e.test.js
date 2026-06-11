/**
 * @requirement RF-06, RF-14
 * @use_case CU-06, CU-14
 * @description Pruebas E2E de los endpoints JSON API.
 */
const request = require('supertest');
const { app, iniciar } = require('../../app');
const { limpiarDatosTransaccionales } = require('./helpers/clean');
const {
  crearSolicitante,
  crearMaterialCompleto,
  crearEjemplar,
} = require('./helpers/seed');

beforeAll(async () => {
  await iniciar();

  // Seed data for API tests
  await crearSolicitante({
    cedula: 'API-SOL-001',
    nombre: 'ApiSol',
    apellido: 'Uno',
    correoElectronico: 'apisolu@test.com',
  });
  await crearSolicitante({
    cedula: 'API-SOL-002',
    nombre: 'ApiSol',
    apellido: 'Dos',
    correoElectronico: 'apisold@test.com',
  });

  const { material } = await crearMaterialCompleto('libro', { titulo: 'APIMaterial' });
  await crearEjemplar(material.idMaterial, {
    identificadorUnico: 'API-EJE-001',
    estado: 'Disponible',
  });
  await crearEjemplar(material.idMaterial, {
    identificadorUnico: 'API-EJE-002',
    estado: 'Disponible',
  });
});

afterAll(async () => {
  await limpiarDatosTransaccionales();
});

describe('API E2E', () => {
  describe('GET /api/solicitantes', () => {
    it('busca solicitante por cédula existente', async () => {
      const res = await request(app).get('/api/solicitantes?cedula=API-SOL-001');
      expect(res.status).toBe(200);
      const body = typeof res.body === 'object' ? res.body : JSON.parse(res.text);
      expect(body.existe).toBe(true);
      expect(body.solicitante.cedula).toBe('API-SOL-001');
    });

    it('retorna existe=false para cédula inexistente', async () => {
      const res = await request(app).get('/api/solicitantes?cedula=ZZZZNOEXISTE');
      expect(res.status).toBe(200);
      const body = typeof res.body === 'object' ? res.body : JSON.parse(res.text);
      expect(body.existe).toBe(false);
    });
  });

  describe('GET /api/solicitantes/prestamo', () => {
    it('busca solicitante con datos de préstamo', async () => {
      const res = await request(app).get('/api/solicitantes/prestamo?cedula=API-SOL-001');
      expect(res.status).toBe(200);
      const body = typeof res.body === 'object' ? res.body : JSON.parse(res.text);
      expect(body.encontrado).toBe(true);
    });

    it('retorna encontrado=false para cédula inexistente', async () => {
      const res = await request(app).get('/api/solicitantes/prestamo');
      expect(res.status).toBe(200);
      const body = typeof res.body === 'object' ? res.body : JSON.parse(res.text);
      expect(body.encontrado).toBe(false);
    });
  });

  describe('POST /api/solicitantes', () => {
    it('crea un nuevo solicitante', async () => {
      const res = await request(app)
        .post('/api/solicitantes')
        .send({
          cedula: 'API-NEW-' + Date.now(),
          nombre: 'Nuevo',
          apellido: 'Api',
          correoElectronico: 'nuevo@api.com',
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rechaza cédula duplicada', async () => {
      const res = await request(app)
        .post('/api/solicitantes')
        .send({
          cedula: 'API-SOL-001',
          nombre: 'Duplicado',
          apellido: 'Api',
          correoElectronico: 'dupe@api.com',
        });
      expect(res.status).toBe(500);
      expect(res.body.error).toContain('cédula');
    });
  });

  describe('GET /api/ejemplares', () => {
    it('busca ejemplares por identificador', async () => {
      const res = await request(app).get('/api/ejemplares?identificador=API-EJE-001');
      expect(res.status).toBe(200);
      const body = typeof res.body === 'object' ? res.body : JSON.parse(res.text);
      expect(Array.isArray(body.ejemplares)).toBe(true);
      expect(body.ejemplares.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/ejemplares/disponibles', () => {
    it('busca ejemplares disponibles por título', async () => {
      const res = await request(app).get('/api/ejemplares/disponibles?titulo=APIMaterial');
      expect(res.status).toBe(200);
      const body = typeof res.body === 'object' ? res.body : JSON.parse(res.text);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
    });

    it('retorna arreglo vacío sin título', async () => {
      const res = await request(app).get('/api/ejemplares/disponibles');
      expect(res.status).toBe(200);
      const body = typeof res.body === 'object' ? res.body : JSON.parse(res.text);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });
  });
});
