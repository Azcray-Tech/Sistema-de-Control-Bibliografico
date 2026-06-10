/**
 * @requirement RF-31, RF-32, RF-33, RF-34, RF-35, RF-36, RF-37
 * @use_case CU-31, CU-32, CU-33, CU-34, CU-35, CU-36, CU-37
 * @description Controlador de reportes: muestra panel de selección y genera archivos PDF/Excel descargables.
 */
class ReporteController {
  constructor(reporteService) {
    this.reporteService = reporteService;
  }

  mostrarPanel = async (req, res, next) => {
    try {
      const categorias = await this.reporteService.Categoria.findAll({
        where: { activa: true },
        order: [['nombre', 'ASC']]
      });
      res.render('admin/reportes', {
        page: 'reportes',
        categorias,
        error: req.query.error || null,
        success: req.query.success
      });
    } catch (err) {
      next(err);
    }
  };

  _enviarArchivo = (res, resultado) => {
    const mime = resultado.extension === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    res.set('Content-Type', mime);
    res.attachment(resultado.nombre);
    res.send(resultado.buffer);
  };

  generarInventario = async (req, res, _next) => {
    try {
      const { tipo, categoriaId, formato } = req.body;
      const resultado = await this.reporteService.generarInventario({ tipo, categoriaId }, formato);
      this._enviarArchivo(res, resultado);
    } catch (err) {
      res.redirect(`/admin/reportes?error=${encodeURIComponent(err.message)}`);
    }
  };

  generarPrestamosActivos = async (req, res, _next) => {
    try {
      const { soloVencidos, formato } = req.body;
      const resultado = await this.reporteService.generarPrestamosActivos({ soloVencidos }, formato);
      this._enviarArchivo(res, resultado);
    } catch (err) {
      res.redirect(`/admin/reportes?error=${encodeURIComponent(err.message)}`);
    }
  };

  generarHistorialSolicitante = async (req, res, _next) => {
    try {
      const { cedula, formato } = req.body;
      const resultado = await this.reporteService.generarHistorialSolicitante(cedula, formato);
      this._enviarArchivo(res, resultado);
    } catch (err) {
      res.redirect(`/admin/reportes?error=${encodeURIComponent(err.message)}`);
    }
  };

  generarRanking = async (req, res, _next) => {
    try {
      const { periodo, topN, formato } = req.body;
      const resultado = await this.reporteService.generarRanking({ periodo, topN }, formato);
      this._enviarArchivo(res, resultado);
    } catch (err) {
      res.redirect(`/admin/reportes?error=${encodeURIComponent(err.message)}`);
    }
  };

  generarVencidosContacto = async (req, res, _next) => {
    try {
      const { diasMinimo, formato } = req.body;
      const resultado = await this.reporteService.generarVencidosContacto({ diasMinimo }, formato);
      this._enviarArchivo(res, resultado);
    } catch (err) {
      res.redirect(`/admin/reportes?error=${encodeURIComponent(err.message)}`);
    }
  };

  generarEstadisticas = async (req, res, _next) => {
    try {
      const { fechaDesde, fechaHasta, formato } = req.body;
      const resultado = await this.reporteService.generarEstadisticas({ fechaDesde, fechaHasta }, formato);
      this._enviarArchivo(res, resultado);
    } catch (err) {
      res.redirect(`/admin/reportes?error=${encodeURIComponent(err.message)}`);
    }
  };

  generarSuspendidos = async (req, res, _next) => {
    try {
      const { tipoSuspension, formato } = req.body;
      const resultado = await this.reporteService.generarSuspendidos({ tipoSuspension }, formato);
      this._enviarArchivo(res, resultado);
    } catch (err) {
      res.redirect(`/admin/reportes?error=${encodeURIComponent(err.message)}`);
    }
  };
}

module.exports = ReporteController;
