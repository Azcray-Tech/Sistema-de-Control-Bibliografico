/**
 * @requirement RF-09
 * @use_case CU-09
 * @description Pruebas E2E de gestión de categorías.
 */
const request = require('supertest');
const { app, iniciar } = require('../../app');
const { limpiarDatosTransaccionales } = require('./helpers/clean');
const { loginComoAdmin } = require('./helpers/login');
const { crearCategoria, crearMaterialBase } = require('./helpers/seed');
const db = require('../../models');

let agent;

beforeAll(async () => {
  await iniciar();
  agent = await loginComoAdmin(app);
});

afterAll(async () => {
  await limpiarDatosTransaccionales();
});

describe('Categorías E2E', () => {
  describe('GET /admin/categorias', () => {
    it('lista las categorías existentes', async () => {
      const res = await agent.get('/admin/categorias');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Literatura');
      expect(res.text).toContain('Ciencia');
    });
  });

  describe('POST /admin/categorias — Crear', () => {
    it('crea una categoría nueva', async () => {
      const res = await agent
        .post('/admin/categorias')
        .send({ nombre: 'Categoría E2E ' + Date.now(), descripcion: 'Descripción E2E' });
      expect(res.status).toBe(302);
    });

    it('rechaza nombre duplicado', async () => {
      const nombre = 'CatUnica_' + Date.now();
      await crearCategoria({ nombre });
      const res = await agent
        .post('/admin/categorias')
        .send({ nombre, descripcion: 'Duplicada' });
      expect(res.status).toBe(200);
    });
  });

  describe('POST /admin/categorias/:id — Actualizar', () => {
    it('actualiza nombre y descripción', async () => {
      const cat = await crearCategoria({ nombre: 'CatAntes_' + Date.now() });
      const res = await agent
        .post('/admin/categorias/' + cat.idCategoria)
        .send({ nombre: 'CatDespues_' + Date.now(), descripcion: 'Actualizada E2E' });
      expect(res.status).toBe(302);
    });
  });

  describe('POST /admin/categorias/:id/desactivar', () => {
    it('desactiva una categoría', async () => {
      const cat = await crearCategoria({ nombre: 'CatADesactivar_' + Date.now(), activa: true });
      const res = await agent.post('/admin/categorias/' + cat.idCategoria + '/desactivar');
      expect(res.status).toBe(302);
    });
  });
});
