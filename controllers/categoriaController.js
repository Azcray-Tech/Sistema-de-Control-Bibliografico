/**
 * @requirement RF-09 (Gestionar categorías de materiales)
 * @use_case CU-09 (Gestionar categorías de materiales)
 * @description Controlador para CRUD y desactivación de categorías de materiales.
 */
class CategoriaController {
  constructor(categoriaService) {
    this.categoriaService = categoriaService;
  }

  /**
   * @requirement RF-09
   * @use_case CU-09
   */
  listar = async (req, res, next) => {
    try {
      const categorias = await this.categoriaService.listar();
      res.render('admin/categorias', { page: 'categorias', categorias, error: null, success: req.query.success });
    } catch (err) {
      next(err);
    }
  };

  /**
   * @requirement RF-09
   * @use_case CU-09
   */
  guardar = async (req, res, next) => {
    try {
      const { nombre, descripcion } = req.body;
      const usuarioId = req.session.usuarioId;
      const id = req.params.id;

      await this.categoriaService.guardar(id, { nombre, descripcion }, usuarioId);

      if (id) {
        res.redirect('/admin/categorias?success=actualizado');
      } else {
        res.redirect('/admin/categorias?success=creado');
      }
    } catch (err) {
      const categorias = await this.categoriaService.listar();
      res.render('admin/categorias', { page: 'categorias', categorias, error: err.message, success: null });
    }
  };

  /**
   * @requirement RF-09
   * @use_case CU-09
   */
  desactivar = async (req, res, next) => {
    try {
      const usuarioId = req.session.usuarioId;
      await this.categoriaService.desactivar(req.params.id, usuarioId);
      res.redirect('/admin/categorias?success=desactivado');
    } catch (err) {
      const categorias = await this.categoriaService.listar();
      res.render('admin/categorias', { page: 'categorias', categorias, error: err.message, success: null });
    }
  };
}

module.exports = CategoriaController;
