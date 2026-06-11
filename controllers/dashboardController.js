/**
 * @requirement RF-31 (Generar reporte de inventario), RF-32 (Préstamos activos)
 * @use_case CU-31 (Reporte inventario), CU-32 (Préstamos activos)
 * @description Controlador del panel de administración con estadísticas generales del sistema.
 */
class DashboardController {
  constructor(dashboardService) {
    this.dashboardService = dashboardService;
  }

  /**
   * @requirement RF-31, RF-32
   * @use_case CU-31, CU-32
   * @description Obtiene estadísticas generales y renderiza el panel de administración.
   */
  mostrarDashboard = async (req, res, next) => {
    try {
      const periodo = req.query.periodo || '1mes';
      const stats = await this.dashboardService.obtenerEstadisticas(periodo);

      res.render('admin/dashboard', {
        page: 'dashboard',
        totalMateriales: stats.totalMateriales,
        prestamosActivos: stats.prestamosActivos,
        disponibles: stats.disponibles,
        vencidos: stats.vencidos,
        topMateriales: stats.topMateriales,
        materialesPorTipo: stats.materialesPorTipo,
        prestamosPorMes: stats.prestamosPorMes,
        periodo: stats.periodo
      });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = DashboardController;
