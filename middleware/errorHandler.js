/**
 * @requirement RF-01 (Catalogar Material)
 * @description Middleware global de manejo de errores. Captura excepciones y renderiza página de error.
 */
function errorHandler(err, req, res, _next) {
  console.error('Error:', err.stack || err.message || err);
  const status = err.status || 500;
  const mensaje = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : err.message || 'Error interno del servidor';

  if (req.xhr || req.headers.accept?.includes('json')) {
    return res.status(status).json({ error: mensaje });
  }

  res.status(status).render('admin/error', { mensaje });
}

module.exports = errorHandler;
