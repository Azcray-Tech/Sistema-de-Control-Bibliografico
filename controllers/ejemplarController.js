/**
 * @requirement RF-07 (Cambiar estado de ejemplar manualmente)
 * @use_case CU-07
 * @description Controlador para gestión de ejemplares: listado por material y cambio manual de estado.
 */
class EjemplarController {
  constructor(ejemplarService) {
    this.ejemplarService = ejemplarService;
  }

  listarPorMaterial = async (req, res, next) => {
    try {
      const { material, ejemplares } = await this.ejemplarService.listarPorMaterial(req.params.materialId);
      if (!material) return res.status(404).send('Material no encontrado');
      res.render('admin/gestion_ejemplares', {
        page: 'materiales', material, ejemplares,
        error: req.query.error || null, success: req.query.success || null
      });
    } catch (err) {
      next(err);
    }
  };

  cambiarEstado = async (req, res, next) => {
    try {
      const usuarioId = req.session.usuarioId;
      const esAdmin = req.session.rol === 'Administrador';
      const { ejemplarId } = req.params;
      const { estado, motivo } = req.body;

      await this.ejemplarService.cambiarEstado(ejemplarId, estado, usuarioId, motivo, esAdmin);
      res.redirect(`/admin/materiales/${req.body.materialId}/ejemplares/gestion?success=1`);
    } catch (err) {
      res.redirect(`/admin/materiales/${req.body.materialId}/ejemplares/gestion?error=${encodeURIComponent(err.message)}`);
    }
  };
}

module.exports = EjemplarController;
