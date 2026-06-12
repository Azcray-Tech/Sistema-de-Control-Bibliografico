/**
 * @requirement RF-13 (Iniciar sesión)
 * @use_case CU-13
 * @description Pruebas unitarias del servicio de autenticación con mocks.
 */
const AuthService = require('../services/auth.service');
const { crearMocksModelos, mockAuditoria } = require('./mocks/models');

describe('AuthService', () => {
  let authService;
  let mocks;
  let mockUsuario;

  beforeEach(() => {
    mocks = crearMocksModelos();
    authService = new AuthService(mocks, mockAuditoria);

    mockUsuario = {
      idUsuario: 1,
      nombreUsuario: 'admin',
      rol: 'Administrador',
      nombre: 'Admin',
      apellido: 'Sistema',
      contrasenaHash: '$2a$10$dummyhash'
    };

    mocks.UsuarioSistema.findOne.mockResolvedValue(mockUsuario);
    mockAuditoria.mockClear();
  });

  describe('autenticar', () => {
    it('debe lanzar error si username o password están vacíos', async () => {
      await expect(authService.autenticar('', 'pass')).rejects.toThrow('Usuario y contraseña son obligatorios');
      await expect(authService.autenticar('user', '')).rejects.toThrow('Usuario y contraseña son obligatorios');
    });

    it('debe lanzar error si el usuario no existe', async () => {
      mocks.UsuarioSistema.findOne.mockResolvedValue(null);
      await expect(authService.autenticar('noexiste', 'pass')).rejects.toThrow('Credenciales inválidas');
    });

    it('debe retornar datos del usuario sin contraseña en éxito', async () => {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('admin123', 4);
      mocks.UsuarioSistema.findOne.mockResolvedValue({ ...mockUsuario, contrasenaHash: hash });

      const resultado = await authService.autenticar('admin', 'admin123');
      expect(resultado).toHaveProperty('idUsuario', 1);
      expect(resultado).toHaveProperty('nombreUsuario', 'admin');
      expect(resultado).not.toHaveProperty('contrasenaHash');
    });
  });

  describe('iniciarSesion', () => {
    it('debe autenticar y registrar auditoría con LOGIN', async () => {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('admin123', 4);
      mocks.UsuarioSistema.findOne.mockResolvedValue({ ...mockUsuario, contrasenaHash: hash });

      const resultado = await authService.iniciarSesion('admin', 'admin123');
      expect(resultado).toHaveProperty('idUsuario', 1);
      expect(resultado).toHaveProperty('nombreUsuario', 'admin');
      expect(mockAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'LOGIN' })
      );
    });

    it('debe propagar error si credenciales inválidas sin auditar', async () => {
      mocks.UsuarioSistema.findOne.mockResolvedValue(null);
      await expect(authService.iniciarSesion('noexiste', 'pass')).rejects.toThrow('Credenciales inválidas');
      expect(mockAuditoria).not.toHaveBeenCalled();
    });
  });

  describe('registrarSalida', () => {
    it('debe llamar a auditoría con LOGOUT cuando hay usuarioId', async () => {
      await authService.registrarSalida(1);
      expect(mockAuditoria).toHaveBeenCalledWith({
        usuarioId: 1,
        accion: 'LOGOUT',
        tablaAfectada: 'usuario_sistema',
        registroId: 1
      });
    });

    it('no debe llamar a auditoría si usuarioId es null', async () => {
      await authService.registrarSalida(null);
      expect(mockAuditoria).not.toHaveBeenCalled();
    });
  });
});
