/**
 * @requirement RF-13 (Iniciar sesión)
 * @use_case CU-13 (Iniciar sesión y manejo de inactividad)
 * @description Controlador de autenticación: login, logout y manejo de sesión.
 */
class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  /**
   * @requirement RF-13
   * @use_case CU-13
   * @description Muestra el formulario de inicio de sesión.
   */
  mostrarLogin = (req, res) => {
    res.render('login', { error: req.query.error || null });
  };

  /**
   * @requirement RF-13
   * @use_case CU-13
   * @description Autentica al usuario y crea la sesión correspondiente.
   */
  iniciarSesion = async (req, res, _next) => {
    try {
      const { username, password } = req.body;
      const usuario = await this.authService.iniciarSesion(username, password);

      req.session.usuarioId = usuario.idUsuario;
      req.session.nombreUsuario = usuario.nombreUsuario;
      req.session.rol = usuario.rol;
      req.session.nombre = usuario.nombre;

      res.redirect('/admin/dashboard');
    } catch (err) {
      res.render('login', { error: err.message });
    }
  };

  /**
   * @requirement RF-13
   * @use_case CU-13
   * @description Cierra la sesión del usuario y redirige al login.
   */
  cerrarSesion = async (req, res, _next) => {
    try {
      await this.authService.registrarSalida(req.session.usuarioId);
    } finally {
      req.session.destroy(() => {
        res.redirect('/admin/login');
      });
    }
  };
}

module.exports = AuthController;
