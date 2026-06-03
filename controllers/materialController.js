/**
 * @requirement RF-01 (Catalogar Material)
 * @use_case CU-01 (Registrar nuevo material bibliográfico)
 * @description Controlador para gestión de materiales: listado, creación, edición y baja lógica.
 */
class MaterialController {
  constructor(materialService, categoriaService) {
    this.materialService = materialService;
    this.categoriaService = categoriaService;
  }

  /**
   * @requirement RF-01
   * @use_case CU-01
   */
  listar = async (req, res, next) => {
    try {
      const { page, tipo, q } = req.query;
      const { materiales, total, pagina, totalPaginas } = await this.materialService.listar(page, tipo, q);
      res.render('admin/materiales', {
        page: 'materiales', materiales, total, pagina, totalPaginas,
        q: q || '',
        error: null, success: req.query.success,
        successId: req.query.successId, successTitulo: req.query.successTitulo
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * @requirement RF-01
   * @use_case CU-01
   */
  mostrarFormulario = async (req, res, next) => {
    try {
      const categorias = await this.categoriaService.listarActivas();
      let material = null;

      if (req.params.id) {
        material = await this.materialService.obtener(req.params.id);
        if (!material) return res.status(404).send('Material no encontrado');
      }

      res.render('admin/material_form', { page: 'materiales-nuevo', material, categorias, error: req.query.error || null, formData: null });
    } catch (err) {
      next(err);
    }
  };

  /**
   * @requirement RF-01, RF-02, RF-03
   * @use_case CU-01, CU-02, CU-03
   */
  guardar = async (req, res, next) => {
    try {
      const usuarioId = req.session.usuarioId;
      const { id } = req.params;
      const datos = { ...req.body };
      if (req.file) datos.portada = req.file.filename;

      if (id) {
        await this.materialService.actualizar(id, datos, usuarioId);
        res.redirect(`/admin/materiales?success=actualizado&successId=${id}&successTitulo=${encodeURIComponent(datos.titulo)}`);
      } else {
        const material = await this.materialService.crear(datos, usuarioId);
        res.redirect(`/admin/materiales?success=creado&successId=${material.idMaterial}&successTitulo=${encodeURIComponent(datos.titulo)}`);
      }
    } catch (err) {
      if (req.params.id) {
        res.redirect(`/admin/materiales/${req.params.id}/editar?error=${encodeURIComponent(err.message)}`);
      } else {
        const categorias = await this.categoriaService.listarActivas();
        res.render('admin/material_form', {
          page: 'materiales-nuevo', material: null, categorias, error: err.message,
          formData: req.body
        });
      }
    }
  };

  /**
   * @requirement RF-06
   * @use_case CU-06
   */
  mostrarFormEjemplares = async (req, res, next) => {
    try {
      const material = await this.materialService.obtener(req.params.id);
      if (!material) return res.status(404).send('Material no encontrado');
      res.render('admin/agregar_ejemplares', { page: 'materiales', material, error: null, success: req.query.success });
    } catch (err) {
      next(err);
    }
  };

  /**
   * @requirement RF-06
   * @use_case CU-06
   */
  agregarEjemplares = async (req, res, next) => {
    try {
      const usuarioId = req.session.usuarioId;
      const identificadores = req.body.identificadores;

      if (!identificadores || (Array.isArray(identificadores) && identificadores.length === 0) || (typeof identificadores === 'string' && !identificadores.trim())) {
        throw new Error('Debe agregar al menos un identificador');
      }

      const ids = Array.isArray(identificadores) ? identificadores : [identificadores];
      await this.materialService.agregarEjemplares(req.params.id, ids, usuarioId);
      res.redirect(`/admin/materiales/${req.params.id}/ejemplares?success=1`);
    } catch (err) {
      const material = await this.materialService.obtener(req.params.id);
      res.render('admin/agregar_ejemplares', { page: 'materiales', material, error: err.message, success: null });
    }
  };

  /**
   * @requirement RF-08
   * @use_case CU-08
   */
  eliminar = async (req, res, next) => {
    try {
      const usuarioId = req.session.usuarioId;
      await this.materialService.eliminar(req.params.id, usuarioId);
      res.redirect('/admin/materiales?success=baja');
    } catch (err) {
      res.redirect(`/admin/materiales?error=${encodeURIComponent(err.message)}`);
    }
  };
}

module.exports = MaterialController;
