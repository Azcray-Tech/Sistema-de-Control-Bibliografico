/**
 * @requirement RF-13 (Iniciar sesión), RF-39 (Aviso de expiración de sesión por inactividad)
 * @use_case CU-13 (Iniciar sesión y manejo de inactividad), CU-39 (Aviso de expiración de sesión)
 * @description Middleware de autenticación y autorización
 */
const { UsuarioSistema } = require('../models');
const {
  NOMBRE_COOKIE_TESTIGO,
  obtenerMaxEdadCookieTestigo
} = require('../config/session');

/**
 * @description Lee una cookie del encabezado sin depender de cookie-parser.
 * @returns {string|null} Valor de la cookie o null si no existe.
 */
function leerCookie(req, nombre) {
  const crudo = req.headers && req.headers.cookie;
  if (!crudo) {return null;}
  const par = crudo.split(';').find((c) => c.trim().startsWith(nombre + '='));
  if (!par) {return null;}
  return decodeURIComponent(par.trim().slice(nombre.length + 1));
}

/**
 * @description Crea o refresca la cookie testigo. Su presencia indica que el usuario
 * tenía una sesión activa, lo que permite distinguir una expiración por inactividad
 * de una visita anónima.
 */
function refrescarCookieTestigo(res) {
  res.cookie(NOMBRE_COOKIE_TESTIGO, '1', {
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
    maxAge: obtenerMaxEdadCookieTestigo()
  });
}

/**
 * @requirement RNF-04 (Control de acceso)
 * @description Protege los endpoints JSON de /api. A diferencia de requiereAuth, no
 * redirige: responde 401 para que el cliente pueda mostrar el aviso de sesión expirada.
 */
function requiereAuthApi(req, res, next) {
  if (!req.session || !req.session.usuarioId) {
    return res.status(401).json({
      error: 'sesion_expirada',
      message: 'Su sesión ha expirado por inactividad.'
    });
  }
  next();
}

function requiereAuth(req, res, next) {
  if (!req.session || !req.session.usuarioId) {
    const teniaSesion = leerCookie(req, NOMBRE_COOKIE_TESTIGO) !== null;
    if (teniaSesion) {
      res.clearCookie(NOMBRE_COOKIE_TESTIGO);
      return res.redirect('/admin/login?expirada=1');
    }
    return res.redirect('/admin/login');
  }
  next();
}

function redirigirSiAutenticado(req, res, next) {
  if (req.session && req.session.usuarioId) {
    return res.redirect('/admin/dashboard');
  }
  next();
}

function requiereRol(...roles) {
  return (req, res, next) => {
    if (!req.session || !roles.includes(req.session.rol)) {
      return res.status(403).render('admin/error', { mensaje: 'No tiene permisos para acceder a esta página' });
    }
    next();
  };
}

async function cargarUsuarioSession(req, res, next) {
  res.locals.usuarioSession = req.session || {};
  if (req.session && req.session.usuarioId) {
    refrescarCookieTestigo(res);
    try {
      const usuario = await UsuarioSistema.findByPk(req.session.usuarioId, {
        attributes: ['idUsuario', 'nombreUsuario', 'nombre', 'apellido', 'rol']
      });
      res.locals.usuario = usuario;
      res.locals.estaAutenticado = true;
    } catch {
      res.locals.usuario = null;
      res.locals.estaAutenticado = false;
    }
  } else {
    res.locals.usuario = null;
    res.locals.estaAutenticado = false;
  }
  next();
}

module.exports = {
  requiereAuth,
  requiereAuthApi,
  redirigirSiAutenticado,
  requiereRol,
  cargarUsuarioSession,
  leerCookie,
  refrescarCookieTestigo
};
