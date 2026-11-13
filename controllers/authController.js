/**
 * @requirement RF-13 (Iniciar sesión), RF-39 (Aviso de expiración de sesión por inactividad)
 * @use_case CU-13 (Iniciar sesión y manejo de inactividad), CU-39 (Aviso de expiración de sesión)
 * @description Controlador de autenticación: login, logout y manejo de sesión.
 */
const { NOMBRE_COOKIE_TESTIGO, obtenerMaxEdadCookieTestigo } = require('../config/session');

class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  /**
   * @requirement RF-13, RF-39
   * @use_case CU-13, CU-39
   * @description Muestra el formulario de inicio de sesión. Si llega ?expirada=1,
   * la vista muestra el diálogo de sesión expirada por inactividad.
   */
  mostrarLogin = (req, res) => {
    res.render('login', {
      error: req.query.error || null,
      expirada: req.query.expirada === '1'
    });
  };

  /**
   * @requirement RF-13, RF-39
   * @use_case CU-13, CU-39
   * @description Autentica al usuario, crea la sesión y marca la cookie testigo.
   */
  iniciarSesion = async (req, res, _next) => {
    try {
      const { username, password } = req.body;
      const usuario = await this.authService.iniciarSesion(username, password);

      req.session.regenerate((err) => {
        if (err) {
          return res.render('login', { error: 'Error al iniciar sesión. Intente nuevamente.', expirada: false });
        }
        req.session.usuarioId = usuario.idUsuario;
        req.session.nombreUsuario = usuario.nombreUsuario;
        req.session.rol = usuario.rol;
        req.session.nombre = usuario.nombre;

        res.cookie(NOMBRE_COOKIE_TESTIGO, '1', {
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
          maxAge: obtenerMaxEdadCookieTestigo()
        });
        res.redirect('/admin/dashboard');
      });
    } catch (err) {
      res.render('login', { error: err.message, expirada: false });
    }
  };

  /**
   * @requirement RF-13
   * @use_case CU-13
   * @description Cierra la sesión del usuario, elimina la cookie testigo y redirige al login.
   */
  cerrarSesion = async (req, res, _next) => {
    try {
      await this.authService.registrarSalida(req.session.usuarioId);
    } finally {
      req.session.destroy(() => {
        res.clearCookie(NOMBRE_COOKIE_TESTIGO);
        res.redirect('/admin/login');
      });
    }
  };

  /**
   * @requirement RF-39 (Aviso de expiración de sesión por inactividad)
   * @use_case CU-39 (Aviso de expiración de sesión)
   * @description Renueva la sesión cuando el usuario pulsa "Continuar sesión" en el
   * aviso previo a la expiración. El middleware requiereAuth ya validó la sesión.
   */
  pingSesion = (req, res, _next) => {
    if (req.session && typeof req.session.touch === 'function') {
      req.session.touch();
    }
    res.status(204).end();
  };
}

module.exports = AuthController;
