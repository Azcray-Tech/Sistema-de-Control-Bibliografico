/**
 * @requirement RF-05 (Gestionar artículos de revista)
 * @use_case CU-05 (Gestionar artículos de una revista)
 * @description Servicio para CRUD de artículos de revista. Gestiona la creación, actualización
 *              y eliminación de artículos asociados a una Revista, incluyendo la relación N:M con Autor.
 */
class ArticuloService {
  constructor({ Articulo, Autor }, auditoria) {
    this.Articulo = Articulo;
    this.Autor = Autor;
    this.auditoria = auditoria;
  }

  _parsearPaginas(paginas, paginaInicio, paginaFin) {
    let inicio = null;
    let fin = null;

    if (paginaInicio !== undefined && paginaInicio !== '') {
      inicio = parseInt(paginaInicio, 10);
    }
    if (paginaFin !== undefined && paginaFin !== '') {
      fin = parseInt(paginaFin, 10);
    }

    if (inicio === null && paginas) {
      const parts = String(paginas).split('-');
      inicio = parseInt(parts[0], 10);
      fin = parts.length > 1 ? parseInt(parts[1], 10) : null;
    }

    if (fin !== null && inicio !== null && fin < inicio) {
      throw new Error('La página final debe ser mayor o igual a la página de inicio');
    }

    return { paginaInicio: isNaN(inicio) ? null : inicio, paginaFin: isNaN(fin) ? null : fin };
  }

  async _asociarAutores(articulo, autoresTexto, transaction = null) {
    if (!autoresTexto || !autoresTexto.trim()) return;

    const nombres = autoresTexto.split(',').map(s => s.trim()).filter(Boolean);
    const autores = [];

    for (const nombreCompleto of nombres) {
      const parts = nombreCompleto.trim().split(/\s+/);
      if (parts.length < 2) continue;
      const apellido = parts.pop();
      const nombre = parts.join(' ');

      const [autor] = await this.Autor.findOrCreate({
        where: { nombre, apellido },
        transaction
      });
      autores.push(autor);
    }

    if (autores.length > 0) {
      await articulo.setAutores(autores, { transaction });
    }
  }

  async guardarArticulos(revistaId, articulos, transaction = null) {
    const opts = transaction ? { transaction } : {};

    if (!articulos || articulos.length === 0) {
      await this.Articulo.destroy({ where: { revistaId }, ...opts });
      return;
    }

    const articulosArray = Array.isArray(articulos) ? articulos : [articulos];

    const idsRecibidos = articulosArray
      .map(a => a.id)
      .filter(id => id && !isNaN(parseInt(id, 10)))
      .map(id => parseInt(id, 10));

    if (idsRecibidos.length > 0) {
      await this.Articulo.destroy({
        where: {
          revistaId,
          idArticulo: { [this.Articulo.sequelize.constructor.Op.notIn]: idsRecibidos }
        },
        ...opts
      });
    } else {
      await this.Articulo.destroy({ where: { revistaId }, ...opts });
    }

    for (const art of articulosArray) {
      if (!art.titulo || !art.titulo.trim()) continue;

      const { paginaInicio, paginaFin } = this._parsearPaginas(art.paginas, art.paginaInicio, art.paginaFin);
      const datos = {
        revistaId,
        titulo: art.titulo.trim(),
        paginaInicio,
        paginaFin
      };

      let articulo;
      if (art.id && !isNaN(parseInt(art.id, 10))) {
        articulo = await this.Articulo.findByPk(parseInt(art.id, 10), opts);
        if (articulo) {
          await articulo.update(datos, opts);
        } else {
          articulo = await this.Articulo.create(datos, opts);
        }
      } else {
        articulo = await this.Articulo.create(datos, opts);
      }

      if (art.autores_texto) {
        await this._asociarAutores(articulo, art.autores_texto, transaction);
      }
    }
  }

  async listarPorRevista(revistaId) {
    return this.Articulo.findAll({
      where: { revistaId },
      include: [{ model: this.Autor, as: 'autores', through: { attributes: [] } }]
    });
  }

  async obtener(id) {
    return this.Articulo.findByPk(id, {
      include: [{ model: this.Autor, as: 'autores', through: { attributes: [] } }]
    });
  }

  async eliminar(id) {
    const articulo = await this.Articulo.findByPk(id);
    if (!articulo) throw new Error('Artículo no encontrado');
    await articulo.destroy();
  }
}

module.exports = ArticuloService;
