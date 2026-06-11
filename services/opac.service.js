/**
 * @requirement RF-22 (OPAC), RF-23 (Búsqueda simple), RF-24 (Búsqueda avanzada), RF-26 (Ficha completa)
 * @use_case CU-22 (OPAC), CU-23 (Búsqueda simple), CU-24 (Búsqueda avanzada), CU-26 (Ficha completa)
 * @description Servicio del catálogo público OPAC: búsqueda, filtros y ficha de material.
 */
class OpacService {
  constructor({ Material, Categoria, Autor, Ejemplar, Libro, Revista, Tesis, Anuario, Articulo }) {
    this.Material = Material;
    this.Categoria = Categoria;
    this.Autor = Autor;
    this.Ejemplar = Ejemplar;
    this.Libro = Libro;
    this.Revista = Revista;
    this.Tesis = Tesis;
    this.Anuario = Anuario;
    this.Articulo = Articulo;
  }

  async obtenerCategorias() {
    return this.Categoria.findAll({ where: { activa: true }, order: [['nombre', 'ASC']] });
  }

  async obtenerDestacados() {
    return this.Material.findAll({
      include: [
        { model: this.Categoria },
        { model: this.Autor, as: 'autores', attributes: ['nombre', 'apellido'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 12
    });
  }

  async buscar({ q, _autor, categoriaId, anioDesde, anioHasta, tipo, pagina = 1 }) {
    const Op = this.Material.sequelize.constructor.Op;
    const where = {};

    if (q) {
      where[Op.or] = [
        { titulo: { [Op.like]: `%${q}%` } },
        { sinopsis: { [Op.like]: `%${q}%` } }
      ];
    }
    if (tipo) {where.tipo = tipo;}
    if (categoriaId) {where.categoriaId = parseInt(categoriaId, 10);}
    if (anioDesde || anioHasta) {
      where.anioPublicacion = {};
      if (anioDesde) {where.anioPublicacion[Op.gte] = parseInt(anioDesde, 10);}
      if (anioHasta) {where.anioPublicacion[Op.lte] = parseInt(anioHasta, 10);}
    }

    const page = Math.max(1, parseInt(pagina, 10) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    const { rows, count } = await this.Material.findAndCountAll({
      where,
      include: [
        { model: this.Categoria },
        { model: this.Autor, as: 'autores', through: { attributes: [] } },
        { model: this.Ejemplar, as: 'ejemplares' }
      ],
      order: [['titulo', 'ASC']],
      limit, offset, distinct: true
    });

    const materialesConDisponibles = rows.map(m => {
      const json = m.toJSON();
      json.ejemplaresDisponibles = (json.ejemplares || []).filter(e => e.estado === 'Disponible').length;
      json.totalEjemplares = (json.ejemplares || []).length;
      return json;
    });

    return {
      materiales: materialesConDisponibles,
      total: count,
      pagina: page,
      totalPaginas: Math.ceil(count / limit)
    };
  }

  async obtenerFicha(id) {
    const material = await this.Material.findByPk(id, {
      include: [
        { model: this.Libro, as: 'libro' },
        { model: this.Revista, as: 'revista', include: [
          { model: this.Articulo, as: 'articulos', include: [
            { model: this.Autor, as: 'autores', through: { attributes: [] }, attributes: ['nombre', 'apellido'] }
          ]}
        ]},
        { model: this.Tesis, as: 'tesis' },
        { model: this.Anuario, as: 'anuario' },
        { model: this.Autor, as: 'autores', through: { attributes: [] } },
        { model: this.Categoria },
        { model: this.Ejemplar, as: 'ejemplares' }
      ]
    });

    if (material) {
      const json = material.toJSON();
      json.ejemplaresDisponibles = (json.ejemplares || []).filter(e => e.estado === 'Disponible').length;
      json.totalEjemplares = (json.ejemplares || []).length;
      return json;
    }

    return null;
  }
}

module.exports = OpacService;
