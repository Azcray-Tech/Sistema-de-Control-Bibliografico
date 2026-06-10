/**
 * @requirement RF-09 (Gestionar categorías)
 * @use_case CU-09 (Gestionar categorías de materiales)
 * @description Servicio de categorías: CRUD y desactivación con validación de materiales asociados.
 */
class CategoriaService {
  constructor({ Categoria, Material }, auditoria) {
    this.Categoria = Categoria;
    this.Material = Material;
    this.auditoria = auditoria;
  }

  async listar() {
    const categorias = await this.Categoria.findAll({
      include: [{ model: this.Material, attributes: [] }],
      attributes: {
        include: [[this.Categoria.sequelize.fn('COUNT', this.Categoria.sequelize.col('Materials.id_material')), 'totalMateriales']]
      },
      group: ['Categoria.id_categoria'],
      order: [['nombre', 'ASC']]
    });
    return categorias.map(c => c.toJSON());
  }

  async listarPaginado(pagina = 1, search = '') {
    const Op = this.Categoria.sequelize.constructor.Op;
    const where = {};
    if (search) {
      where[Op.or] = [
        { nombre: { [Op.like]: `%${search}%` } },
        { descripcion: { [Op.like]: `%${search}%` } }
      ];
    }

    const page = Math.max(1, parseInt(pagina, 10) || 1);
    const limit = 10;
    const offset = (page - 1) * limit;

    const total = await this.Categoria.count({ where });

    const categorias = await this.Categoria.findAll({
      where,
      include: [{ model: this.Material, attributes: [] }],
      attributes: {
        include: [[this.Categoria.sequelize.fn('COUNT', this.Categoria.sequelize.col('Materials.id_material')), 'totalMateriales']]
      },
      group: ['Categoria.id_categoria'],
      order: [['nombre', 'ASC']],
      limit, offset,
      subQuery: false
    });

    return {
      categorias: categorias.map(c => c.toJSON()),
      total,
      pagina: page,
      totalPaginas: Math.ceil(total / limit)
    };
  }

  async listarActivas() {
    const categorias = await this.Categoria.findAll({
      where: { activa: true },
      include: [{ model: this.Material, attributes: [] }],
      attributes: {
        include: [[this.Categoria.sequelize.fn('COUNT', this.Categoria.sequelize.col('Materials.id_material')), 'totalMateriales']]
      },
      group: ['Categoria.id_categoria'],
      order: [['nombre', 'ASC']]
    });
    return categorias.map(c => c.toJSON());
  }

  async guardar(id, { nombre, descripcion }, usuarioId) {
    if (!nombre || !nombre.trim()) {throw new Error('El nombre de la categoría es obligatorio');}

    const duplicado = await this.Categoria.findOne({
      where: { nombre: nombre.trim() }
    });

    if (id) {
      const categoria = await this.Categoria.findByPk(id);
      if (!categoria) {throw new Error('Categoría no encontrada');}
      if (duplicado && duplicado.idCategoria !== parseInt(id, 10)) {
        throw new Error('Ya existe una categoría con ese nombre');
      }
      await categoria.update({ nombre: nombre.trim(), descripcion });
      if (this.auditoria) {
        await this.auditoria({ usuarioId, accion: 'ACTUALIZAR_CATEGORIA', tablaAfectada: 'categoria', registroId: id });
      }
      return categoria;
    }

    if (duplicado) {throw new Error('Ya existe una categoría con ese nombre');}

    const categoria = await this.Categoria.create({ nombre: nombre.trim(), descripcion, activa: true });
    if (this.auditoria) {
      await this.auditoria({ usuarioId, accion: 'CREAR_CATEGORIA', tablaAfectada: 'categoria', registroId: categoria.idCategoria });
    }
    return categoria;
  }

  async desactivar(id, usuarioId) {
    const categoria = await this.Categoria.findByPk(id, {
      include: [{ model: this.Material, required: false }]
    });
    if (!categoria) {throw new Error('Categoría no encontrada');}

    if (categoria.Materials && categoria.Materials.length > 0) {
      throw new Error('No se puede desactivar la categoría porque tiene materiales asociados');
    }

    await categoria.update({ activa: false });
    if (this.auditoria) {
      await this.auditoria({ usuarioId, accion: 'DESACTIVAR_CATEGORIA', tablaAfectada: 'categoria', registroId: id });
    }
    return categoria;
  }
}

module.exports = CategoriaService;
