/**
 * @requirement RF-11 (Crear cuentas de personal), RF-12 (Desactivar cuentas de personal)
 * @use_case CU-11, CU-12
 * @description Controlador para gestión de usuarios del sistema: listado, creación y desactivación.
 */
class UsuarioController {
  constructor(usuarioService) {
    this.usuarioService = usuarioService;
  }

  listar = async (req, res, next) => {
    try {
      const usuarios = await this.usuarioService.listar();
      res.render('admin/usuarios', {
        page: 'usuarios', usuarios,
        error: req.query.error || null, success: req.query.success || null
      });
    } catch (err) {
      next(err);
    }
  };

  mostrarFormulario = async (req, res, next) => {
    try {
      res.render('admin/usuario_form', {
        page: 'usuarios', error: req.query.error || null
      });
    } catch (err) {
      next(err);
    }
  };

  guardar = async (req, res, _next) => {
    try {
      const datos = { ...req.body, usuarioSessionId: req.session.usuarioId };
      await this.usuarioService.crear(datos);
      res.redirect('/admin/usuarios?success=creado');
    } catch (err) {
      res.redirect(`/admin/usuarios/nuevo?error=${encodeURIComponent(err.message)}`);
    }
  };

  desactivar = async (req, res, _next) => {
    try {
      await this.usuarioService.desactivar(req.params.id, req.session.usuarioId);
      res.redirect('/admin/usuarios?success=desactivado');
    } catch (err) {
      res.redirect(`/admin/usuarios?error=${encodeURIComponent(err.message)}`);
    }
  };
}

module.exports = UsuarioController;
