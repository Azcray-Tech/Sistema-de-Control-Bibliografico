/**
 * @requirement RF-11 (Crear cuentas de personal), RF-12 (Desactivar cuentas de personal)
 * @use_case CU-11, CU-12
 * @description Pruebas unitarias del servicio de usuarios del sistema con mocks Sequelize.
 */
const bcrypt = require('bcryptjs');
const UsuarioService = require('../services/usuario.service');
const { crearMocksModelos, mockAuditoria } = require('./mocks/models');

describe('UsuarioService', () => {
  let usuarioService;
  let mocks;

  beforeEach(() => {
    mocks = crearMocksModelos();
    usuarioService = new UsuarioService(mocks, mockAuditoria);
    mockAuditoria.mockClear();
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2a$10$hash');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listar', () => {
    it('debe retornar todos los usuarios ordenados', async () => {
      const mockUsuarios = [
        { idUsuario: 1, nombreUsuario: 'jperez', nombre: 'Juan', activo: true },
        { idUsuario: 2, nombreUsuario: 'mgarcia', nombre: 'Maria', activo: false }
      ];
      mocks.UsuarioSistema.findAll.mockResolvedValue(mockUsuarios);

      const result = await usuarioService.listar();

      expect(mocks.UsuarioSistema.findAll).toHaveBeenCalledWith({
        attributes: expect.arrayContaining(['idUsuario', 'nombreUsuario', 'activo']),
        order: [['nombre', 'ASC']]
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('listarActivos', () => {
    it('debe retornar solo usuarios activos', async () => {
      mocks.UsuarioSistema.findAll.mockResolvedValue([{ idUsuario: 1, activo: true }]);

      const result = await usuarioService.listarActivos();

      expect(mocks.UsuarioSistema.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { activo: true } })
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('obtener', () => {
    it('debe retornar usuario por id', async () => {
      mocks.UsuarioSistema.findByPk.mockResolvedValue({ idUsuario: 1, nombre: 'Juan' });

      const result = await usuarioService.obtener(1);

      expect(mocks.UsuarioSistema.findByPk).toHaveBeenCalledWith(1);
      expect(result.nombre).toBe('Juan');
    });

    it('debe retornar null si no existe', async () => {
      mocks.UsuarioSistema.findByPk.mockResolvedValue(null);

      const result = await usuarioService.obtener(999);

      expect(result).toBeNull();
    });
  });

  describe('crear', () => {
    const datosValidos = {
      nombreUsuario: 'jperez', contrasena: 'password123',
      nombre: 'Juan', apellido: 'Perez', cedula: '12345678',
      rol: 'Bibliotecario', usuarioSessionId: 1
    };

    it('debe crear usuario exitosamente', async () => {
      mocks.UsuarioSistema.findOne.mockResolvedValue(null);
      mocks.UsuarioSistema.create.mockResolvedValue({ idUsuario: 1, ...datosValidos, activo: true });

      const result = await usuarioService.crear(datosValidos);

      expect(mocks.UsuarioSistema.create).toHaveBeenCalledWith(
        expect.objectContaining({ nombreUsuario: 'jperez', rol: 'Bibliotecario', activo: true })
      );
      expect(mockAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'CREAR_USUARIO' })
      );
      expect(result.idUsuario).toBe(1);
    });

    it('debe rechazar si falta nombre de usuario', async () => {
      await expect(usuarioService.crear({ ...datosValidos, nombreUsuario: '' }))
        .rejects.toThrow('El nombre de usuario es obligatorio');
    });

    it('debe rechazar si contraseña es muy corta', async () => {
      await expect(usuarioService.crear({ ...datosValidos, contrasena: '123' }))
        .rejects.toThrow('al menos 8 caracteres');
    });

    it('debe rechazar si rol es inválido', async () => {
      await expect(usuarioService.crear({ ...datosValidos, rol: 'Invitado' }))
        .rejects.toThrow('Rol inválido');
    });

    it('debe rechazar si cédula ya existe', async () => {
      mocks.UsuarioSistema.findOne.mockResolvedValueOnce({ cedula: '12345678' });

      await expect(usuarioService.crear(datosValidos))
        .rejects.toThrow('Ya existe un usuario con esa cédula');
    });

    it('debe rechazar si nombre de usuario ya existe', async () => {
      mocks.UsuarioSistema.findOne
        .mockResolvedValueOnce(null) // cedula no existe
        .mockResolvedValueOnce({ nombreUsuario: 'jperez' }); // usuario sí existe

      await expect(usuarioService.crear(datosValidos))
        .rejects.toThrow('Nombre de usuario no disponible');
    });

    it('debe omitir auditoría si no hay función', async () => {
      const serviceSinAudit = new UsuarioService(mocks, null);
      serviceSinAudit._validarDatosUsuario = jest.fn();
      mocks.UsuarioSistema.findOne.mockResolvedValue(null);
      mocks.UsuarioSistema.create.mockResolvedValue({ idUsuario: 1 });

      const result = await serviceSinAudit.crear(datosValidos);

      expect(result.idUsuario).toBe(1);
    });
  });

  describe('desactivar', () => {
    it('debe desactivar usuario y registrar auditoría', async () => {
      const mockUsuario = { idUsuario: 2, activo: true, update: jest.fn().mockResolvedValue(undefined) };
      mocks.UsuarioSistema.findByPk.mockResolvedValue(mockUsuario);

      const result = await usuarioService.desactivar(2, 1);

      expect(mockUsuario.update).toHaveBeenCalledWith({ activo: false });
      expect(mockAuditoria).toHaveBeenCalledWith(expect.objectContaining({ accion: 'DESACTIVAR_USUARIO' }));
      expect(result).toBe(mockUsuario);
    });

    it('debe lanzar error si usuario no existe', async () => {
      mocks.UsuarioSistema.findByPk.mockResolvedValue(null);

      await expect(usuarioService.desactivar(999, 1)).rejects.toThrow('Usuario no encontrado');
    });

    it('debe lanzar error si usuario ya está inactivo', async () => {
      mocks.UsuarioSistema.findByPk.mockResolvedValue({ idUsuario: 2, activo: false });

      await expect(usuarioService.desactivar(2, 1)).rejects.toThrow('El usuario ya está inactivo');
    });

    it('debe impedir auto-desactivación', async () => {
      mocks.UsuarioSistema.findByPk.mockResolvedValue({ idUsuario: 1, activo: true });

      await expect(usuarioService.desactivar(1, 1)).rejects.toThrow('No puedes desactivar tu propia cuenta');
    });

    it('debe omitir auditoría si no hay función', async () => {
      const serviceSinAudit = new UsuarioService(mocks, null);
      const mockUsuario = { idUsuario: 2, activo: true, update: jest.fn() };
      serviceSinAudit._validarDatosUsuario = jest.fn();
      mocks.UsuarioSistema.findByPk.mockResolvedValue(mockUsuario);

      await serviceSinAudit.desactivar(2, 1);

      expect(mockUsuario.update).toHaveBeenCalled();
    });
  });
});
