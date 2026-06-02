const bcrypt = require('bcryptjs');

/**
 * @requirement RF-13 (Iniciar sesión)
 * @use_case CU-13 (Iniciar sesión y manejo de inactividad)
 * @description Servicio de autenticación: validación de credenciales y registro de salida.
 */
class AuthService {
  constructor({ UsuarioSistema }, auditoria) {
    this.UsuarioSistema = UsuarioSistema;
    this.auditoria = auditoria;
  }

  async autenticar(username, password) {
    if (!username || !password) {
      throw new Error('Usuario y contraseña son obligatorios');
    }

    const usuario = await this.UsuarioSistema.findOne({
      where: { nombreUsuario: username, activo: true }
    });

    if (!usuario) {
      throw new Error('Credenciales inválidas');
    }

    const valido = await bcrypt.compare(password, usuario.contrasenaHash);
    if (!valido) {
      throw new Error('Credenciales inválidas');
    }

    return {
      idUsuario: usuario.idUsuario,
      nombreUsuario: usuario.nombreUsuario,
      rol: usuario.rol,
      nombre: usuario.nombre,
      apellido: usuario.apellido
    };
  }

  async iniciarSesion(username, password) {
    const usuario = await this.autenticar(username, password);
    if (this.auditoria) {
      await this.auditoria({
        usuarioId: usuario.idUsuario,
        accion: 'LOGIN',
        tablaAfectada: 'usuario_sistema',
        registroId: usuario.idUsuario,
        valorNuevo: { nombreUsuario: usuario.nombreUsuario, rol: usuario.rol }
      });
    }
    return usuario;
  }

  async registrarSalida(usuarioId) {
    if (usuarioId && this.auditoria) {
      await this.auditoria({
        usuarioId,
        accion: 'LOGOUT',
        tablaAfectada: 'usuario_sistema',
        registroId: usuarioId
      });
    }
  }
}

module.exports = AuthService;
