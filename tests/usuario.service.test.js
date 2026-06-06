/**
 * @requirement RF-11 (Crear cuentas de personal), RF-12 (Desactivar cuentas de personal)
 * @use_case CU-11, CU-12
 * @description Pruebas unitarias del servicio de usuarios del sistema.
 */
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$10hashedpassword')
}));

const UsuarioService = require('../services/usuario.service');
const { crearMocksModelos, mockAuditoria } = require('./mocks/models');

const crearUsuarioMock = (id = 1, overrides = {}) => ({
  idUsuario: id,
  nombreUsuario: 'usuario' + id,
  nombre: 'Nombre',
  apellido: 'Apellido',
  cedula: 'V' + id,
  rol: 'Bibliotecario',
  activo: true,
  createdAt: new Date('2024-01-01'),
  update: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('UsuarioService', () => {
  let usuarioService;
  let mocks;

  beforeEach(() => {
    mocks = crearMocksModelos();
    usuarioService = new UsuarioService(mocks, mockAuditoria);
    mockAuditoria.mockClear();
  });

  describe('listar', () => {
    it('debe retornar todos los usuarios con atributos específicos', async () => {
      const mockUsuarios = [crearUsuarioMock(1), crearUsuarioMock(2)];
      mocks.UsuarioSistema.findAll.mockResolvedValue(mockUsuarios);

      const resultado = await usuarioService.listar();

      expect(mocks.UsuarioSistema.findAll).toHaveBeenCalledWith({
        attributes: ['idUsuario', 'nombreUsuario', 'nombre', 'apellido', 'cedula', 'rol', 'activo', 'createdAt'],
        order: [['nombre', 'ASC']]
      });
      expect(resultado).toHaveLength(2);
    });
  });

  describe('listarActivos', () => {
    it('debe retornar solo usuarios activos', async () => {
      mocks.UsuarioSistema.findAll.mockResolvedValue([crearUsuarioMock(1)]);

      const resultado = await usuarioService.listarActivos();

      expect(mocks.UsuarioSistema.findAll).toHaveBeenCalledWith({
        where: { activo: true },
        attributes: ['idUsuario', 'nombreUsuario', 'nombre', 'apellido', 'rol'],
        order: [['nombre', 'ASC']]
      });
      expect(resultado).toHaveLength(1);
    });
  });

  describe('obtener', () => {
    it('debe retornar usuario por id', async () => {
      const mockUsuario = crearUsuarioMock(5);
      mocks.UsuarioSistema.findByPk.mockResolvedValue(mockUsuario);

      const resultado = await usuarioService.obtener(5);

      expect(mocks.UsuarioSistema.findByPk).toHaveBeenCalledWith(5);
      expect(resultado).toBe(mockUsuario);
    });

    it('debe retornar null si no existe', async () => {
      mocks.UsuarioSistema.findByPk.mockResolvedValue(null);

      const resultado = await usuarioService.obtener(999);
      expect(resultado).toBeNull();
    });
  });

  describe('crear', () => {
    const datosValidos = {
      nombreUsuario: 'nuevo',
      contrasena: '12345678',
      nombre: 'Nuevo',
      apellido: 'Usuario',
      cedula: 'V123',
      rol: 'Bibliotecario',
      usuarioSessionId: 1
    };

    it('debe crear un usuario nuevo', async () => {
      const mockUsuario = crearUsuarioMock(3);
      mocks.UsuarioSistema.findOne.mockResolvedValue(null);
      mocks.UsuarioSistema.create.mockResolvedValue(mockUsuario);

      const resultado = await usuarioService.crear(datosValidos);

      expect(mocks.UsuarioSistema.findOne).toHaveBeenCalledTimes(2);
      expect(mocks.UsuarioSistema.create).toHaveBeenCalledWith({
        nombreUsuario: 'nuevo', contrasenaHash: '$2a$10hashedpassword',
        nombre: 'Nuevo', apellido: 'Usuario', cedula: 'V123',
        rol: 'Bibliotecario', activo: true
      });
      expect(mockAuditoria).toHaveBeenCalledWith({
        usuarioId: 1, accion: 'CREAR_USUARIO', tablaAfectada: 'usuario_sistema',
        registroId: 3,
        valorNuevo: { nombreUsuario: 'nuevo', nombre: 'Nuevo', apellido: 'Usuario', cedula: 'V123', rol: 'Bibliotecario' }
      });
      expect(resultado).toBe(mockUsuario);
    });

    it('debe lanzar error si faltan campos obligatorios', async () => {
      await expect(usuarioService.crear({ nombreUsuario: '', contrasena: '', nombre: '', apellido: '', cedula: '', rol: '' }))
        .rejects.toThrow('Todos los campos obligatorios deben estar completos');
    });

    it('debe lanzar error si la contraseña es muy corta', async () => {
      await expect(usuarioService.crear({ ...datosValidos, contrasena: '123' }))
        .rejects.toThrow('La contraseña debe tener al menos 8 caracteres');
    });

    it('debe lanzar error si el rol es inválido', async () => {
      await expect(usuarioService.crear({ ...datosValidos, rol: 'Invitado' }))
        .rejects.toThrow('Rol inválido');
    });

    it('debe lanzar error si la cédula ya existe', async () => {
      mocks.UsuarioSistema.findOne.mockResolvedValueOnce(crearUsuarioMock(1));

      await expect(usuarioService.crear(datosValidos))
        .rejects.toThrow('Ya existe un usuario con esa cédula');
    });

    it('debe lanzar error si el nombre de usuario ya existe', async () => {
      mocks.UsuarioSistema.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(crearUsuarioMock(1));

      await expect(usuarioService.crear(datosValidos))
        .rejects.toThrow('Nombre de usuario no disponible');
    });
  });

  describe('desactivar', () => {
    it('debe desactivar un usuario activo', async () => {
      const mockUsuario = crearUsuarioMock(2, { activo: true });
      mocks.UsuarioSistema.findByPk.mockResolvedValue(mockUsuario);

      await usuarioService.desactivar(2, 1);

      expect(mockUsuario.update).toHaveBeenCalledWith({ activo: false });
      expect(mockAuditoria).toHaveBeenCalledWith({
        usuarioId: 1, accion: 'DESACTIVAR_USUARIO', tablaAfectada: 'usuario_sistema',
        registroId: 2, valorAnterior: { activo: true }, valorNuevo: { activo: false }
      });
    });

    it('debe lanzar error si el usuario no existe', async () => {
      mocks.UsuarioSistema.findByPk.mockResolvedValue(null);

      await expect(usuarioService.desactivar(999, 1))
        .rejects.toThrow('Usuario no encontrado');
    });

    it('debe lanzar error si el usuario ya está inactivo', async () => {
      mocks.UsuarioSistema.findByPk.mockResolvedValue(crearUsuarioMock(1, { activo: false }));

      await expect(usuarioService.desactivar(1, 2))
        .rejects.toThrow('El usuario ya está inactivo');
    });

    it('debe lanzar error al desactivar propia cuenta', async () => {
      mocks.UsuarioSistema.findByPk.mockResolvedValue(crearUsuarioMock(1, { activo: true }));

      await expect(usuarioService.desactivar(1, 1))
        .rejects.toThrow('No puedes desactivar tu propia cuenta');
    });
  });
});
