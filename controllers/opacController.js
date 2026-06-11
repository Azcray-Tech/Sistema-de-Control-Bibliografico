/**
 * @requirement RF-22 (OPAC), RF-23 (Búsqueda simple), RF-24 (Búsqueda avanzada), RF-26 (Ficha completa)
 * @use_case CU-22 (OPAC), CU-23 (Búsqueda simple), CU-24 (Búsqueda avanzada), CU-26 (Ficha completa)
 * @description Controlador del catálogo público OPAC: portada, búsqueda y ficha de material.
 */
class OpacController {
  constructor(opacService) {
    this.opacService = opacService;
  }

  /**
   * @requirement RF-22
   * @use_case CU-22
   * @description Página principal del OPAC con categorías y materiales destacados.
   */
  index = async (req, res, next) => {
    try {
      const [categorias, destacados] = await Promise.all([
        this.opacService.obtenerCategorias(),
        this.opacService.obtenerDestacados()
      ]);

      res.render('public/index', {
        titulo: 'Catálogo', categorias, destacados,
        q: '', autor: '', categoriaId: null, anioDesde: '', anioHasta: '',
        tipo: '', queryTitulo: '', isbn: ''
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * @requirement RF-23, RF-24
   * @use_case CU-23, CU-24
   * @description Procesa búsqueda simple y avanzada en el catálogo público.
   */
  buscar = async (req, res, next) => {
    try {
      const { q, autor, categoriaId, anioDesde, anioHasta, tipo, page } = req.query;
      const categorias = await this.opacService.obtenerCategorias();

      const result = await this.opacService.buscar({
        q, autor, categoriaId, anioDesde, anioHasta, tipo, page
      });

      res.render('public/catalogo', {
        titulo: 'Resultados de búsqueda',
        categorias,
        materiales: result.materiales,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPaginas
        },
        q: q || '', autor: autor || '', categoriaId: categoriaId || '',
        anioDesde: anioDesde || '', anioHasta: anioHasta || '', tipo: tipo || '',
        queryTitulo: q || ''
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * @requirement RF-26
   * @use_case CU-26
   * @description Muestra la ficha completa de un material en el catálogo público.
   */
  ficha = async (req, res, next) => {
    try {
      const { id } = req.params;
      const material = await this.opacService.obtenerFicha(id);

      if (!material) {return res.status(404).send('Material no encontrado');}

      res.render('public/ficha_material', { material });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = OpacController;
