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
   * @description Lista préstamos activos y renderiza la vista principal de préstamos.
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
   * @description Procesa el formulario de registro de un nuevo préstamo.
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
   * @description Renueva un préstamo activo extendiendo su fecha de devolución prevista.
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
   * @description Procesa la devolución de un ejemplar y calcula sanciones por retraso.
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
   * @description Muestra el historial completo de préstamos del sistema.
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
   * @description Muestra vista de sanciones con préstamos vencidos y sanciones activas.
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
   * @description Levanta una sanción activa de un solicitante manualmente.
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
