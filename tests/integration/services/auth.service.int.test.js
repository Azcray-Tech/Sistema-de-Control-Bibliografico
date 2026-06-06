require('../setup');

const models = require('../../../models');
const AuthService = require('../../../services/auth.service');
const { registrarAuditoria } = require('../../../middleware/auditoria');
const { limpiarDatosTransaccionales } = require('../../../tests/e2e/helpers/clean');

describe('AuthService - integración con BD real', () => {
  const service = new AuthService(models, registrarAuditoria);

  afterAll(async () => {
    await limpiarDatosTransaccionales();
  });

  test('debe autenticar al usuario admin con credenciales correctas', async () => {
    const resultado = await service.iniciarSesion('admin', 'admin123');
    expect(resultado).toBeDefined();
    expect(resultado.nombreUsuario).toBe('admin');
    expect(resultado.rol).toBe('Administrador');
    expect(resultado.idUsuario).toBeDefined();
  });

  test('debe rechazar credenciales inválidas', async () => {
    await expect(service.iniciarSesion('admin', 'wrongpass'))
      .rejects
      .toThrow('Credenciales inválidas');
  });

  test('debe rechazar usuario inexistente', async () => {
    await expect(service.iniciarSesion('usuario_inexistente', 'pass123'))
      .rejects
      .toThrow('Credenciales inválidas');
  });

  test('debe rechazar campos vacíos', async () => {
    await expect(service.iniciarSesion('', ''))
      .rejects
      .toThrow('Usuario y contraseña son obligatorios');
  });

  test('debe registrar salida sin errores', async () => {
    await expect(service.registrarSalida(1)).resolves.not.toThrow();
  });

  test('debe ignorar registrarSalida si usuarioId es null', async () => {
    await expect(service.registrarSalida(null)).resolves.not.toThrow();
  });
});
