/**
 * @requirement RF-13 (Iniciar sesión)
 * @use_case CU-13
 * @description Middleware de autenticación y autorización
 */
const { UsuarioSistema } = require('../models');

function requiereAuth(req, res, next) {
  if (!req.session || !req.session.usuarioId) {
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

module.exports = { requiereAuth, redirigirSiAutenticado, requiereRol, cargarUsuarioSession };
