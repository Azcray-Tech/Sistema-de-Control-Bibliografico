/**
 * @requirement RF-15, RF-16, RF-17, RF-18, RF-20
 * @use_case CU-15, CU-16, CU-17, CU-18, CU-20
 * @description Pruebas E2E de préstamos: registrar, renovar, devolver, sanciones.
 */
const request = require('supertest');
const { app, iniciar } = require('../../app');
const { limpiarDatosTransaccionales } = require('./helpers/clean');
const { loginComoAdmin } = require('./helpers/login');
const {
  crearMaterialCompleto,
  crearSolicitante,
  crearEjemplar,
  crearSancion,
} = require('./helpers/seed');
const db = require('../../models');

let agent;
let adminId = 1;

beforeAll(async () => {
  await iniciar();
  agent = await loginComoAdmin(app);
});

afterAll(async () => {
  await limpiarDatosTransaccionales();
});

describe('Préstamos E2E', () => {
  describe('GET /admin/prestamos', () => {
    it('lista préstamos activos (vacío si no hay)', async () => {
      const res = await agent.get('/admin/prestamos');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /admin/prestamos — Registrar', () => {
    it('registra un préstamo exitosamente', async () => {
      const sol = await crearSolicitante();
      const { ejemplar } = await crearMaterialCompleto('libro', {
        titulo: 'Prestamo Exitoso',
      });
      const res = await agent
        .post('/admin/prestamos')
        .send({ solicitanteCedula: sol.cedula, ejemplarId: ejemplar.idEjemplar });
      expect(res.status).toBe(302);
    });

    it('rechaza solicitante inexistente', async () => {
      const { ejemplar } = await crearMaterialCompleto('libro', {
        titulo: 'Prestamo SolInexistente',
      });
      await crearEjemplar(ejemplar.materialId, { estado: 'Disponible' });
      const res = await agent
        .post('/admin/prestamos')
        .send({ solicitanteCedula: 'NOEXISTE99', ejemplarId: ejemplar.idEjemplar });
      expect(res.status).toBe(200);
      expect(res.text).toContain('no encontrado');
    });

    it('rechaza ejemplar no disponible', async () => {
      const sol = await crearSolicitante();
      const { ejemplar } = await crearMaterialCompleto('libro', {
        titulo: 'Prestamo EjNoDisp',
      });
      // Mark as Prestado
      await ejemplar.update({ estado: 'Prestado' });
      const res = await agent
        .post('/admin/prestamos')
        .send({ solicitanteCedula: sol.cedula, ejemplarId: ejemplar.idEjemplar });
      expect(res.status).toBe(200);
      expect(res.text).toContain('disponible');
    });

    it('rechaza solicitante suspendido', async () => {
      const sol = await crearSolicitante({
        estado: 'Suspendido permanente',
        fechaFinSuspension: null,
      });
      const { ejemplar } = await crearMaterialCompleto('libro', {
        titulo: 'Prestamo SolSuspendido',
      });
      const res = await agent
        .post('/admin/prestamos')
        .send({ solicitanteCedula: sol.cedula, ejemplarId: ejemplar.idEjemplar });
      expect(res.status).toBe(200);
      expect(res.text).toContain('suspendido');
    });
  });

  describe('POST /admin/prestamos/:id/renovar', () => {
    it('renueva un préstamo activo', async () => {
      const sol = await crearSolicitante();
      const { ejemplar } = await crearMaterialCompleto('libro', {
        titulo: 'Renovar Prestamo',
      });
      const prestamo = await db.Prestamo.create({
        solicitanteCedula: sol.cedula,
        ejemplarId: ejemplar.idEjemplar,
        usuarioPrestamistaId: 1,
        fechaPrestamo: new Date(),
        fechaDevolucionPrevista: new Date(Date.now() + 7 * 86400000),
        estado: 'Activo',
        renovaciones: 0,
      });
      await ejemplar.update({ estado: 'Prestado' });
      const res = await agent.post('/admin/prestamos/' + prestamo.idPrestamo + '/renovar');
      expect(res.status).toBe(302);
    });
  });

  describe('POST /admin/prestamos/:id/devolver', () => {
    it('devuelve un préstamo activo en fecha (sin sanción)', async () => {
      const sol = await crearSolicitante();
      const { ejemplar } = await crearMaterialCompleto('libro', {
        titulo: 'Devolver Normal',
      });
      const prestamo = await db.Prestamo.create({
        solicitanteCedula: sol.cedula,
        ejemplarId: ejemplar.idEjemplar,
        usuarioPrestamistaId: 1,
        fechaPrestamo: new Date(),
        fechaDevolucionPrevista: new Date(Date.now() + 7 * 86400000),
        estado: 'Activo',
        renovaciones: 0,
      });
      await ejemplar.update({ estado: 'Prestado' });
      const res = await agent
        .post('/admin/prestamos/' + prestamo.idPrestamo + '/devolver')
        .send({});
      expect(res.status).toBe(302);
    });

    it('devuelve con ejemplar dañado (requiere motivo)', async () => {
      const sol = await crearSolicitante();
      const { ejemplar } = await crearMaterialCompleto('libro', {
        titulo: 'Devolver Danado',
      });
      const prestamo = await db.Prestamo.create({
        solicitanteCedula: sol.cedula,
        ejemplarId: ejemplar.idEjemplar,
        usuarioPrestamistaId: 1,
        fechaPrestamo: new Date(),
        fechaDevolucionPrevista: new Date(Date.now() + 7 * 86400000),
        estado: 'Activo',
        renovaciones: 0,
      });
      await ejemplar.update({ estado: 'Prestado' });
      const res = await agent
        .post('/admin/prestamos/' + prestamo.idPrestamo + '/devolver')
        .send({ estadoEjemplar: 'Dañado', motivo: 'Hoja rota' });
      expect(res.status).toBe(302);
    });
  });

  describe('GET /admin/prestamos/historial', () => {
    it('carga el historial de préstamos', async () => {
      const res = await agent.get('/admin/prestamos/historial');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /admin/prestamos/sanciones', () => {
    it('lista sanciones activas', async () => {
      const res = await agent.get('/admin/prestamos/sanciones');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /admin/prestamos/sanciones/levantar', () => {
    it('levanta una sanción como administrador', async () => {
      const sol = await crearSolicitante({ estado: 'Suspendido temporal' });
      const res = await agent
        .post('/admin/prestamos/sanciones/levantar')
        .send({ cedula: sol.cedula, motivo: 'Prueba E2E' });
      expect(res.status).toBe(302);
    });

    it('rechaza levantar sanción sin motivo', async () => {
      const sol = await crearSolicitante({ estado: 'Suspendido temporal' });
      const res = await agent
        .post('/admin/prestamos/sanciones/levantar')
        .send({ cedula: sol.cedula, motivo: '' });
      expect(res.status).toBe(302);
      expect(res.text).toContain('Redirect');
    });
  });
});
