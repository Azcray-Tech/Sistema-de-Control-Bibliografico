/**
 * @requirement RF-01, RF-02, RF-03, RF-04, RF-05, RF-08
 * @use_case CU-01, CU-02, CU-03, CU-04, CU-05, CU-08
 * @description Pruebas E2E de gestión de materiales: CRUD, subtipos, validaciones.
 */
const request = require('supertest');
const path = require('path');
const { app, iniciar } = require('../../app');
const { limpiarDatosTransaccionales } = require('./helpers/clean');
const { loginComoAdmin } = require('./helpers/login');
const { crearMaterialCompleto, crearMaterialBase, crearEjemplar } = require('./helpers/seed');
const db = require('../../models');

let agent;

beforeAll(async () => {
  await iniciar();
  agent = await loginComoAdmin(app);
});

afterAll(async () => {
  await limpiarDatosTransaccionales();
});

describe('Materiales E2E', () => {
  describe('GET /admin/materiales', () => {
    it('lista materiales vacía si no hay datos', async () => {
      const res = await agent.get('/admin/materiales');
      expect(res.status).toBe(200);
    });

    it('lista materiales existentes', async () => {
      await crearMaterialCompleto('libro', { titulo: 'ListTest Libro' });
      const res = await agent.get('/admin/materiales');
      expect(res.status).toBe(200);
      expect(res.text).toContain('ListTest Libro');
    });

    it('filtra por tipo', async () => {
      await crearMaterialCompleto('tesis', { titulo: 'FiltroTesis' });
      const res = await agent.get('/admin/materiales?tipo=tesis');
      expect(res.status).toBe(200);
      expect(res.text).toContain('FiltroTesis');
    });

    it('filtra por búsqueda', async () => {
      await crearMaterialCompleto('libro', { titulo: 'BusquedaUnica12345' });
      const res = await agent.get('/admin/materiales?search=BusquedaUnica12345');
      expect(res.status).toBe(200);
      expect(res.text).toContain('BusquedaUnica12345');
    });
  });

  describe('GET /admin/materiales/nuevo', () => {
    it('muestra el formulario de creación', async () => {
      const res = await agent.get('/admin/materiales/nuevo');
      expect(res.status).toBe(200);
      expect(res.text).toContain('material');
    });
  });

  describe('POST /admin/materiales — Crear', () => {
    it('crea un libro con ISBN, autores y ejemplares', async () => {
      const res = await agent
        .post('/admin/materiales')
        .send({
          titulo: 'Nuevo Libro E2E',
          anioPublicacion: '2024',
          signatura: 'SIG-NL-001',
          sinopsis: 'Sinopsis del libro E2E',
          tipo: 'libro',
          categoriaId: '1',
          isbn: '9781234567897',
          editorial: 'Editorial E2E',
          autores: [{ nombre: 'Autor', apellido: 'E2E' }],
          ejemplaresNuevos: [{ identificadorUnico: 'EJE-NL-001' }],
        });
      expect(res.status).toBe(302);
    });

    it('crea una revista con ISSN, volumen, número', async () => {
      const issn = '1111-2222';
      const res = await agent
        .post('/admin/materiales')
        .send({
          titulo: 'Nueva Revista E2E',
          anioPublicacion: '2023',
          signatura: 'SIG-NR-001',
          tipo: 'revista',
          categoriaId: '1',
          issn,
          volumen: 'Vol. 5',
          numero: 'No. 2',
        });
      expect(res.status).toBe(302);
    });

    it('crea una tesis con tutor, grado e institución', async () => {
      const res = await agent
        .post('/admin/materiales')
        .send({
          titulo: 'Nueva Tesis E2E',
          anioPublicacion: '2024',
          signatura: 'SIG-NT-001',
          tipo: 'tesis',
          categoriaId: '1',
          tutor: 'Dr. Prueba',
          gradoAcademico: 'Maestría',
          institucion: 'Universidad E2E',
        });
      expect(res.status).toBe(302);
    });

    it('crea un anuario', async () => {
      const res = await agent
        .post('/admin/materiales')
        .send({
          titulo: 'Nuevo Anuario E2E',
          anioPublicacion: '2024',
          signatura: 'SIG-NA-001',
          tipo: 'anuario',
          categoriaId: '1',
          anioEdicion: '2024',
        });
      expect(res.status).toBe(302);
    });

    it('rechaza material sin título', async () => {
      const res = await agent
        .post('/admin/materiales')
        .send({
          titulo: '',
          tipo: 'libro',
          categoriaId: '1',
        });
      expect(res.status).toBe(200);
      expect(res.text).toContain('título');
    });

    it('rechaza ISBN inválido', async () => {
      const res = await agent
        .post('/admin/materiales')
        .send({
          titulo: 'Mal ISBN',
          tipo: 'libro',
          categoriaId: '1',
          isbn: '123',
        });
      expect(res.status).toBe(200);
      expect(res.text).toContain('ISBN');
    });

    it('rechaza ISSN duplicado', async () => {
      const issn = '9999-8888';
      // Create first revista with this ISSN
      const { material: m } = await crearMaterialCompleto('revista', { titulo: 'RevBase' });
      // Manually set the ISSN
      await db.Revista.update({ issn }, { where: { materialId: m.idMaterial } });

      const res = await agent
        .post('/admin/materiales')
        .send({
          titulo: 'Revista ISSN Dupe',
          tipo: 'revista',
          categoriaId: '1',
          issn,
        });
      expect(res.status).toBe(200);
      expect(res.text).toContain('ISSN');
    });
  });

  describe('GET /admin/materiales/:id/editar', () => {
    it('carga el formulario con datos del material', async () => {
      const { material } = await crearMaterialCompleto('libro', { titulo: 'EditarTest' });
      const res = await agent.get('/admin/materiales/' + material.idMaterial + '/editar');
      expect(res.status).toBe(200);
      expect(res.text).toContain('EditarTest');
    });
  });

  describe('POST /admin/materiales/:id — Actualizar', () => {
    it('actualiza título y signatura', async () => {
      const { material } = await crearMaterialCompleto('libro', {
        titulo: 'AntesActualizar',
        signatura: 'SIG-ANTES',
      });
      const res = await agent
        .post('/admin/materiales/' + material.idMaterial)
        .send({
          titulo: 'DespuesActualizar',
          signatura: 'SIG-DESPUES',
          tipo: 'libro',
          categoriaId: '1',
        });
      expect(res.status).toBe(302);
    });
  });

  describe('POST /admin/materiales/:id/ejemplares', () => {
    it('agrega ejemplares a un material', async () => {
      const { material } = await crearMaterialCompleto('libro', { titulo: 'AddEjemplares' });
      const res = await agent
        .post('/admin/materiales/' + material.idMaterial + '/ejemplares')
        .send({ identificadores: ['EJE-ADD-001', 'EJE-ADD-002'] });
      expect(res.status).toBe(302);
    });
  });

  describe('POST /admin/materiales/:id/eliminar', () => {
    it('elimina material sin préstamos activos', async () => {
      const { material } = await crearMaterialCompleto('libro', { titulo: 'ParaEliminar' });
      const res = await agent.post('/admin/materiales/' + material.idMaterial + '/eliminar');
      expect(res.status).toBe(302);
    });

    it('rechaza eliminar material con préstamos activos', async () => {
      const { material, ejemplar } = await crearMaterialCompleto('libro', {
        titulo: 'NoEliminarConPrestamo',
      });
      const sol = await require('./helpers/seed').crearSolicitante();
      await db.Prestamo.create({
        solicitanteCedula: sol.cedula,
        ejemplarId: ejemplar.idEjemplar,
        usuarioPrestamistaId: 1,
        fechaPrestamo: new Date(),
        fechaDevolucionPrevista: new Date(Date.now() + 7 * 86400000),
        estado: 'Activo',
      });
      const res = await agent.post('/admin/materiales/' + material.idMaterial + '/eliminar');
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('error');
    });
  });
});
