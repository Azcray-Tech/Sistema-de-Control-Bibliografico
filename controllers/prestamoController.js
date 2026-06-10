/**
 * @requirement RF-15 (Registrar préstamo de un ejemplar)
 * @use_case CU-15 (Registrar préstamo)
 * @description Controlador para gestión de préstamos: registro, renovación, devolución y sanciones.
 */
class PrestamoController {
  constructor(prestamoService) {
    this.prestamoService = prestamoService;
  }

  /**
   * @requirement RF-15
   * @use_case CU-15
   */
  listar = async (req, res, next) => {
    try {
      const prestamos = await this.prestamoService.listarActivos();
      res.render('admin/prestamos', { page: 'prestamos', prestamos, error: req.query.error || null, success: req.query.success });
    } catch (err) {
      next(err);
    }
  };

  /**
   * @requirement RF-15
   * @use_case CU-15
   */
  registrar = async (req, res, _next) => {
    try {
      const { solicitanteCedula, ejemplarId } = req.body;
      const usuarioPrestamistaId = req.session.usuarioId;

      await this.prestamoService.registrar(solicitanteCedula, ejemplarId, usuarioPrestamistaId);
      res.redirect('/admin/prestamos?success=1');
    } catch (err) {
      const prestamos = await this.prestamoService.listarActivos();
      res.render('admin/prestamos', { page: 'prestamos', prestamos, error: err.message, success: null });
    }
  };

  /**
   * @requirement RF-17
   * @use_case CU-17
   */
  renovar = async (req, res, _next) => {
    try {
      await this.prestamoService.renovar(req.params.id);
      res.redirect('/admin/prestamos?success=2');
    } catch (err) {
      res.redirect(`/admin/prestamos?error=${encodeURIComponent(err.message)}`);
    }
  };

  /**
   * @requirement RF-18
   * @use_case CU-18
   */
  devolver = async (req, res, _next) => {
    try {
      const usuarioId = req.session.usuarioId;
      await this.prestamoService.devolver(req.params.id, usuarioId);
      res.redirect('/admin/prestamos?success=3');
    } catch (err) {
      res.redirect(`/admin/prestamos?error=${encodeURIComponent(err.message)}`);
    }
  };

  /**
   * @requirement RF-33
   * @use_case CU-33
   */
  historial = async (req, res, next) => {
    try {
      const prestamos = await this.prestamoService.historial();
      res.render('admin/historial', { page: 'historial', prestamos });
    } catch (err) {
      next(err);
    }
  };

  /**
   * @requirement RF-20, RF-18
   * @use_case CU-20, CU-18
   */
  sanciones = async (req, res, next) => {
    try {
      const prestamosVencidos = await this.prestamoService.obtenerVencidos();
      const sancionesActivas = await this.prestamoService.listarSancionesActivas();
      res.render('admin/sanciones', {
        page: 'sanciones',
        prestamosVencidos,
        sancionesActivas,
        error: req.query.error || null,
        success: req.query.success
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * @requirement RF-20
   * @use_case CU-20
   */
  levantarSancion = async (req, res, _next) => {
    try {
      const usuarioId = req.session.usuarioId;
      const { cedula, motivo } = req.body;
      await this.prestamoService.levantarSancion(cedula, usuarioId, motivo);
      res.redirect('/admin/prestamos/sanciones?success=levantado');
    } catch (err) {
      res.redirect(`/admin/prestamos/sanciones?error=${encodeURIComponent(err.message)}`);
    }
  };
}

module.exports = PrestamoController;
