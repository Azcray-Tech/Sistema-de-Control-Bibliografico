/**
 * @requirement RF-22, RF-23, RF-24, RF-26
 * @use_case CU-22, CU-23, CU-24, CU-26
 * @description Pruebas E2E del catálogo público OPAC: homepage, búsqueda, ficha.
 */
const request = require('supertest');
const { app, iniciar } = require('../../app');
const { limpiarDatosTransaccionales } = require('./helpers/clean');
const {
  crearMaterialCompleto,
  crearCategoria,
  crearAutor,
  crearMaterialBase,
  crearLibro,
  crearEjemplar,
} = require('./helpers/seed');

const materialIds = {};

beforeAll(async () => {
  await iniciar();
  // Seed data for OPAC tests
  const { material: m1 } = await crearMaterialCompleto('libro', {
    titulo: 'Historia del Arte Universal',
    anioPublicacion: 2020,
  });
  const { material: m2 } = await crearMaterialCompleto('libro', {
    titulo: 'Física Cuántica para Principiantes',
    anioPublicacion: 2022,
  });
  const { material: m3 } = await crearMaterialCompleto('revista', {
    titulo: 'National Geographic España',
    anioPublicacion: 2023,
  });

  materialIds.m1 = m1.idMaterial;
  materialIds.m2 = m2.idMaterial;
  materialIds.m3 = m3.idMaterial;

  // Additional ejemplar for m1 to have multiple copies
  await crearEjemplar(m1.idMaterial);

  // An inactive category — should NOT appear
  await crearCategoria({ nombre: 'CatOculta', activa: false, descripcion: 'Test' });
});

afterAll(async () => {
  await limpiarDatosTransaccionales();
});

describe('OPAC E2E', () => {
  describe('GET / — Homepage', () => {
    it('carga correctamente con código 200', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
    });

    it('incluye categorías activas en la navegación', async () => {
      const res = await request(app).get('/');
      expect(res.text).toContain('Literatura');
      expect(res.text).toContain('Historia');
      expect(res.text).toContain('Ciencia');
    });

    it('NO incluye categorías inactivas', async () => {
      const res = await request(app).get('/');
      expect(res.text).not.toContain('CatOculta');
    });

    it('incluye materiales destacados', async () => {
      const res = await request(app).get('/');
      expect(res.text).toContain('Incorporaciones Recientes');
      expect(res.text).toContain('/material/' + materialIds.m1);
    });
  });

  describe('GET /buscar — Búsqueda', () => {
    it('encuentra materiales por palabra clave', async () => {
      const res = await request(app).get('/buscar?q=Historia');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Historia del Arte');
    });

    it('retorna todos los materiales si no hay query', async () => {
      const res = await request(app).get('/buscar');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Historia del Arte');
      expect(res.text).toContain('Física Cuántica');
    });

    it('filtra por tipo', async () => {
      const res = await request(app).get('/buscar?tipo=revista');
      expect(res.status).toBe(200);
      expect(res.text).toContain('National Geographic');
      expect(res.text).not.toContain('Historia del Arte');
    });

    it('filtra por categoría', async () => {
      const res = await request(app).get('/buscar?categoriaId=1');
      expect(res.status).toBe(200);
    });

    it('filtra por rango de años', async () => {
      const res = await request(app).get('/buscar?anioDesde=2021&anioHasta=2024');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Física Cuántica');
      expect(res.text).toContain('National Geographic');
    });

    it('muestra mensaje cuando no hay resultados', async () => {
      const res = await request(app).get('/buscar?q=ZZZZNOEXISTE');
      expect(res.status).toBe(200);
      expect(res.text).toContain('resultados');
    });
  });

  describe('GET /material/:id — Ficha', () => {
    it('muestra la ficha completa de un material existente', async () => {
      const res = await request(app).get('/material/' + materialIds.m1);
      expect(res.status).toBe(200);
    });

    it('devuelve 404 para material inexistente', async () => {
      const res = await request(app).get('/material/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /ficha/:id — Alias de ficha', () => {
    it('funciona igual que /material/:id', async () => {
      const res = await request(app).get('/ficha/' + materialIds.m1);
      expect(res.status).toBe(200);
    });
  });
});
