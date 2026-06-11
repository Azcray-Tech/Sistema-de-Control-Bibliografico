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
   * @description Lista materiales con paginación, filtros y ordenamiento.
   */
  listar = async (req, res, next) => {
    try {
      const { page, tipo, q, sort, dir } = req.query;
      const { materiales, total, pagina, totalPaginas } = await this.materialService.listar(page, tipo, q, sort, dir);
      res.render('admin/materiales', {
        page: 'materiales', materiales, total, pagina, totalPaginas,
        q: q || '', tipo: tipo || '',
        sort: sort || '', dir: dir || '',
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
  /**
   * @requirement RF-01
   * @use_case CU-01
   * @description Muestra formulario de creación/edición de material.
   */
  mostrarFormulario = async (req, res, next) => {
    try {
      const categorias = await this.categoriaService.listarActivas();
      let material = null;

      if (req.params.id) {
        material = await this.materialService.obtener(req.params.id);
        if (!material) {return res.status(404).send('Material no encontrado');}
      }

      res.render('admin/material_form', { page: 'materiales-nuevo', material, categorias, error: req.query.error || null, formData: null });
    } catch (err) {
      next(err);
    }
  };

  /**
   * @requirement RF-01, RF-02, RF-03
   * @use_case CU-01, CU-02, CU-03
   * @description Guarda o actualiza un material (creación o edición según presencia de id).
   */
  guardar = async (req, res, _next) => {
    try {
      const usuarioId = req.session.usuarioId;
      const { id } = req.params;
      const datos = { ...req.body };
      if (req.file) {datos.portada = req.file.filename;}

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
   * @description Agrega ejemplares a un material existente.
   */
  agregarEjemplares = async (req, res, _next) => {
    try {
      const usuarioId = req.session.usuarioId;
      const identificadores = req.body.identificadores;

      if (!identificadores || (Array.isArray(identificadores) && identificadores.length === 0) || (typeof identificadores === 'string' && !identificadores.trim())) {
        throw new Error('Debe agregar al menos un identificador');
      }

      const ids = Array.isArray(identificadores) ? identificadores : [identificadores];
      await this.materialService.agregarEjemplares(req.params.id, ids, usuarioId);
      res.redirect(`/admin/materiales/${req.params.id}/ejemplares/gestion?success=creado`);
    } catch (err) {
      res.redirect(`/admin/materiales/${req.params.id}/ejemplares/gestion?error=${encodeURIComponent(err.message)}`);
    }
  };

  /**
   * @requirement RF-08
   * @use_case CU-08
   * @description Elimina (baja lógica) un material por su ID.
   */
  eliminar = async (req, res, _next) => {
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
