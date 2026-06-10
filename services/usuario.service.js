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

  _validarDatosUsuario({ nombreUsuario, contrasena, nombre, apellido, cedula, rol }) {
    if (!nombreUsuario) {throw new Error('El nombre de usuario es obligatorio');}
    if (!contrasena) {throw new Error('La contraseña es obligatoria');}
    if (!nombre) {throw new Error('El nombre es obligatorio');}
    if (!apellido) {throw new Error('El apellido es obligatorio');}
    if (!cedula) {throw new Error('La cédula es obligatoria');}
    if (!rol) {throw new Error('El rol es obligatorio');}
    if (contrasena.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres');
    }
    if (!['Administrador', 'Bibliotecario'].includes(rol)) {
      throw new Error('Rol inválido. Debe ser Administrador o Bibliotecario');
    }
  }

  async _verificarDuplicadosUsuario(cedula, nombreUsuario) {
    const existeCedula = await this.UsuarioSistema.findOne({ where: { cedula } });
    if (existeCedula) {
      throw new Error('Ya existe un usuario con esa cédula');
    }
    const existeUsuario = await this.UsuarioSistema.findOne({ where: { nombreUsuario } });
    if (existeUsuario) {
      throw new Error('Nombre de usuario no disponible');
    }
  }

  async _auditarCreacion(usuarioSessionId, datos, usuario) {
    if (this.auditoria) {
      await this.auditoria({
        usuarioId: usuarioSessionId || null,
        accion: 'CREAR_USUARIO',
        tablaAfectada: 'usuario_sistema',
        registroId: usuario.idUsuario,
        valorNuevo: { nombreUsuario: datos.nombreUsuario, nombre: datos.nombre, apellido: datos.apellido, cedula: datos.cedula, rol: datos.rol }
      });
    }
  }

  async crear(datos) {
    const { nombreUsuario, contrasena, nombre, apellido, cedula, rol } = datos;
    this._validarDatosUsuario({ nombreUsuario, contrasena, nombre, apellido, cedula, rol });
    await this._verificarDuplicadosUsuario(cedula, nombreUsuario);

    const contrasenaHash = await bcrypt.hash(contrasena, 10);
    const usuario = await this.UsuarioSistema.create({
      nombreUsuario, contrasenaHash, nombre, apellido, cedula, rol, activo: true
    });

    await this._auditarCreacion(datos.usuarioSessionId, datos, usuario);
    return usuario;
  }

  async desactivar(id, usuarioSessionId) {
    const usuario = await this.UsuarioSistema.findByPk(id);
    if (!usuario) {throw new Error('Usuario no encontrado');}
    if (!usuario.activo) {throw new Error('El usuario ya está inactivo');}

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
