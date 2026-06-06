require('../setup');

const models = require('../../../models');
const UsuarioService = require('../../../services/usuario.service');
const { registrarAuditoria } = require('../../../middleware/auditoria');
const { limpiarDatosTransaccionales } = require('../../../tests/e2e/helpers/clean');

describe('UsuarioService - integración con BD real', () => {
  const service = new UsuarioService(models, registrarAuditoria);

  afterAll(async () => {
    await limpiarDatosTransaccionales();
  });

  test('debe listar usuarios del sistema', async () => {
    const usuarios = await service.listar();
    expect(Array.isArray(usuarios)).toBe(true);
    expect(usuarios.length).toBeGreaterThan(0);
  });

  test('debe crear un usuario Bibliotecario', async () => {
    const data = {
      nombreUsuario: 'biblio_int_' + Date.now(),
      contrasena: 'pass12345',
      nombre: 'Biblio',
      apellido: 'Integración',
      cedula: 'CedInt_' + Date.now(),
      rol: 'Bibliotecario',
    };
    const resultado = await service.crear(data);
    expect(resultado.nombreUsuario).toBe(data.nombreUsuario);
    expect(resultado.rol).toBe('Bibliotecario');
    expect(resultado.activo).toBe(true);
  });

  test('debe rechazar nombre de usuario duplicado', async () => {
    const username = 'dupe_int_' + Date.now();
    await service.crear({
      nombreUsuario: username,
      contrasena: 'pass12345',
      nombre: 'First',
      apellido: 'User',
      cedula: 'Ced1_' + Date.now(),
      rol: 'Bibliotecario',
    });
    await expect(service.crear({
      nombreUsuario: username,
      contrasena: 'pass456',
      nombre: 'Second',
      apellido: 'User',
      cedula: 'Ced2_' + Date.now(),
      rol: 'Bibliotecario',
    })).rejects.toThrow();
  });

  test('debe rechazar cédula duplicada', async () => {
    const cedula = 'CedDupe_' + Date.now();
    await service.crear({
      nombreUsuario: 'user1_' + Date.now(),
      contrasena: 'pass12345',
      nombre: 'First',
      apellido: 'User',
      cedula,
      rol: 'Bibliotecario',
    });
    await expect(service.crear({
      nombreUsuario: 'user2_' + Date.now(),
      contrasena: 'pass456',
      nombre: 'Second',
      apellido: 'User',
      cedula,
      rol: 'Administrador',
    })).rejects.toThrow();
  });

  test('debe desactivar un usuario', async () => {
    const data = {
      nombreUsuario: 'desact_int_' + Date.now(),
      contrasena: 'pass12345',
      nombre: 'Desact',
      apellido: 'Test',
      cedula: 'CedDes_' + Date.now(),
      rol: 'Bibliotecario',
    };
    const creado = await service.crear(data);
    await service.desactivar(creado.idUsuario);
    const actualizado = await models.UsuarioSistema.findByPk(creado.idUsuario);
    expect(actualizado.activo).toBe(false);
  });
});
