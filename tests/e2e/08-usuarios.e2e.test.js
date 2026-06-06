/**
 * @requirement RF-12
 * @use_case CU-12
 * @description Pruebas E2E de gestión de usuarios del sistema.
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

  // Crear un usuario bibliotecario para probar permisos
  const biblioUser = await crearUsuario({
    nombreUsuario: 'biblio_e2e',
    rol: 'Bibliotecario',
    cedula: '87654321',
  });
  biblioAgent = await loginComo(app, 'biblio_e2e', 'test123');
});

afterAll(async () => {
  await limpiarDatosTransaccionales();
});

describe('Usuarios E2E', () => {
  describe('GET /admin/usuarios', () => {
    it('admin puede listar usuarios', async () => {
      const res = await adminAgent.get('/admin/usuarios');
      expect(res.status).toBe(200);
      expect(res.text).toContain('admin');
    });

    it('bibliotecario recibe 403', async () => {
      const res = await biblioAgent.get('/admin/usuarios');
      expect(res.status).toBe(403);
    });
  });

  describe('GET /admin/usuarios/nuevo', () => {
    it('admin puede ver formulario de creación', async () => {
      const res = await adminAgent.get('/admin/usuarios/nuevo');
      expect(res.status).toBe(200);
    });

    it('bibliotecario recibe 403', async () => {
      const res = await biblioAgent.get('/admin/usuarios/nuevo');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /admin/usuarios — Crear', () => {
    it('admin crea un usuario bibliotecario', async () => {
      const res = await adminAgent
        .post('/admin/usuarios')
        .send({
          nombreUsuario: 'nuevo_user_' + Date.now(),
          password: 'test123',
          nombre: 'Nuevo',
          apellido: 'Usuario',
          cedula: String(Date.now()).slice(-10),
          rol: 'Bibliotecario',
        });
      expect(res.status).toBe(302);
    });

    it('rechaza nombre de usuario duplicado', async () => {
      const res = await adminAgent
        .post('/admin/usuarios')
        .send({
          nombreUsuario: 'admin',
          password: 'test123',
          nombre: 'Duplicado',
          apellido: 'User',
          cedula: '99999999',
          rol: 'Bibliotecario',
        });
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('error');
    });

    it('bibliotecario recibe 403 al crear', async () => {
      const res = await biblioAgent
        .post('/admin/usuarios')
        .send({
          nombreUsuario: 'no_permiso',
          password: 'test123',
          nombre: 'Sin',
          apellido: 'Permiso',
          cedula: '11111111',
          rol: 'Bibliotecario',
        });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /admin/usuarios/:id/desactivar', () => {
    it('admin desactiva otro usuario', async () => {
      const user = await crearUsuario({ nombreUsuario: 'a_desactivar_' + Date.now() });
      const res = await adminAgent.post('/admin/usuarios/' + user.idUsuario + '/desactivar');
      expect(res.status).toBe(302);
    });

    it('bibliotecario recibe 403 al desactivar', async () => {
      const res = await biblioAgent.post('/admin/usuarios/2/desactivar');
      expect(res.status).toBe(403);
    });
  });
});
