/**
 * @requirement RF-11 (Crear cuentas de personal), RF-12 (Desactivar cuentas de personal)
 * @use_case CU-11, CU-12
 * @description Servicio para gestión de usuarios del sistema: crear, listar, desactivar.
 */
const bcrypt = require('bcryptjs');

class UsuarioService {
  constructor({ UsuarioSistema }, auditoria) {
    this.UsuarioSistema = UsuarioSistema;
    this.auditoria = auditoria;
  }

  async listar() {
    return this.UsuarioSistema.findAll({
      attributes: ['idUsuario', 'nombreUsuario', 'nombre', 'apellido', 'cedula', 'rol', 'activo', 'createdAt'],
      order: [['nombre', 'ASC']]
    });
  }

  async listarActivos() {
    return this.UsuarioSistema.findAll({
      where: { activo: true },
      attributes: ['idUsuario', 'nombreUsuario', 'nombre', 'apellido', 'rol'],
      order: [['nombre', 'ASC']]
    });
  }

  async obtener(id) {
    return this.UsuarioSistema.findByPk(id);
  }

  async crear(datos) {
    const { nombreUsuario, contrasena, nombre, apellido, cedula, rol } = datos;

    if (!nombreUsuario || !contrasena || !nombre || !apellido || !cedula || !rol) {
      throw new Error('Todos los campos obligatorios deben estar completos');
    }

    if (contrasena.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres');
    }

    if (!['Administrador', 'Bibliotecario'].includes(rol)) {
      throw new Error('Rol inválido. Debe ser Administrador o Bibliotecario');
    }

    const existeCedula = await this.UsuarioSistema.findOne({ where: { cedula } });
    if (existeCedula) {
      throw new Error('Ya existe un usuario con esa cédula');
    }

    const existeUsuario = await this.UsuarioSistema.findOne({ where: { nombreUsuario } });
    if (existeUsuario) {
      throw new Error('Nombre de usuario no disponible');
    }

    const contrasenaHash = await bcrypt.hash(contrasena, 10);

    const usuario = await this.UsuarioSistema.create({
      nombreUsuario,
      contrasenaHash,
      nombre,
      apellido,
      cedula,
      rol,
      activo: true
    });

    if (this.auditoria) {
      await this.auditoria({
        usuarioId: datos.usuarioSessionId || null,
        accion: 'CREAR_USUARIO',
        tablaAfectada: 'usuario_sistema',
        registroId: usuario.idUsuario,
        valorNuevo: { nombreUsuario, nombre, apellido, cedula, rol }
      });
    }

    return usuario;
  }

  async desactivar(id, usuarioSessionId) {
    const usuario = await this.UsuarioSistema.findByPk(id);
    if (!usuario) throw new Error('Usuario no encontrado');
    if (!usuario.activo) throw new Error('El usuario ya está inactivo');

    if (parseInt(id, 10) === parseInt(usuarioSessionId, 10)) {
      throw new Error('No puedes desactivar tu propia cuenta');
    }

    await usuario.update({ activo: false });

    if (this.auditoria) {
      await this.auditoria({
        usuarioId: usuarioSessionId,
        accion: 'DESACTIVAR_USUARIO',
        tablaAfectada: 'usuario_sistema',
        registroId: id,
        valorAnterior: { activo: true },
        valorNuevo: { activo: false }
      });
    }

    return usuario;
  }
}

module.exports = UsuarioService;
