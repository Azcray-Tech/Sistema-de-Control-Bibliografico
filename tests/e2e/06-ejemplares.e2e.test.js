/**
 * @requirement RF-06, RF-07
 * @use_case CU-06, CU-07
 * @description Pruebas E2E de gestión de ejemplares: listado y cambio de estado.
 */
const request = require('supertest');
const { app, iniciar } = require('../../app');
const { limpiarDatosTransaccionales } = require('./helpers/clean');
const { loginComoAdmin } = require('./helpers/login');
const { crearMaterialCompleto, crearEjemplar } = require('./helpers/seed');
const db = require('../../models');

let agent;

beforeAll(async () => {
  await iniciar();
  agent = await loginComoAdmin(app);
});

afterAll(async () => {
  await limpiarDatosTransaccionales();
});

describe('Ejemplares E2E', () => {
  describe('GET /admin/materiales/:materialId/ejemplares/gestion', () => {
    it('lista ejemplares de un material', async () => {
      const { material, ejemplar } = await crearMaterialCompleto('libro', {
        titulo: 'GestEjemplares',
      });
      const res = await agent.get(
        '/admin/materiales/' + material.idMaterial + '/ejemplares/gestion'
      );
      expect(res.status).toBe(200);
      expect(res.text).toContain(ejemplar.identificadorUnico);
    });

    it('nota: sin ejemplares si no existen', async () => {
      const { material } = await crearMaterialCompleto('libro', { titulo: 'SinEjemplares' });
      const res = await agent.get(
        '/admin/materiales/' + material.idMaterial + '/ejemplares/gestion'
      );
      expect(res.status).toBe(200);
    });
  });

  describe('POST /admin/materiales/:materialId/ejemplares/:ejemplarId/cambiar-estado', () => {
    it('cambia estado a "Dañado"', async () => {
      const { material, ejemplar } = await crearMaterialCompleto('libro', {
        titulo: 'CambioEstadoDaniado',
      });
      const res = await agent
        .post(
          '/admin/materiales/' +
            material.idMaterial +
            '/ejemplares/' +
            ejemplar.idEjemplar +
            '/cambiar-estado'
        )
        .send({ estado: 'Dañado' });
      expect(res.status).toBe(302);
    });

    it('cambia estado a "En restauración"', async () => {
      const { material, ejemplar } = await crearMaterialCompleto('libro', {
        titulo: 'CambioEstadoRestauracion',
      });
      const res = await agent
        .post(
          '/admin/materiales/' +
            material.idMaterial +
            '/ejemplares/' +
            ejemplar.idEjemplar +
            '/cambiar-estado'
        )
        .send({ estado: 'En restauración' });
      expect(res.status).toBe(302);
    });

    it('cambia estado a "Perdido"', async () => {
      const { material, ejemplar } = await crearMaterialCompleto('libro', {
        titulo: 'CambioEstadoPerdido',
      });
      const res = await agent
        .post(
          '/admin/materiales/' +
            material.idMaterial +
            '/ejemplares/' +
            ejemplar.idEjemplar +
            '/cambiar-estado'
        )
        .send({ estado: 'Perdido' });
      expect(res.status).toBe(302);
    });
  });
});
