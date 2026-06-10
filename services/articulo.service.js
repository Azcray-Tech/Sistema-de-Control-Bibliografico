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

  _paginaInicio(paginaInicio, paginas) {
    if (paginaInicio !== undefined && paginaInicio !== '') {
      const v = parseInt(paginaInicio, 10);
      return isNaN(v) ? null : v;
    }
    if (!paginas) {return null;}
    const parts = String(paginas).split('-');
    const v = parseInt(parts[0], 10);
    return isNaN(v) ? null : v;
  }

  _paginaFin(paginaFin, paginas) {
    if (paginaFin !== undefined && paginaFin !== '') {
      const v = parseInt(paginaFin, 10);
      return isNaN(v) ? null : v;
    }
    if (!paginas) {return null;}
    const parts = String(paginas).split('-');
    if (parts.length < 2) {return null;}
    const v = parseInt(parts[1], 10);
    return isNaN(v) ? null : v;
  }

  _parsearPaginas(paginas, paginaInicio, paginaFin) {
    const inicio = this._paginaInicio(paginaInicio, paginas);
    const fin = this._paginaFin(paginaFin, paginas);
    if (inicio !== null && fin !== null && fin < inicio) {
      throw new Error('La página final debe ser mayor o igual a la página de inicio');
    }
    return { paginaInicio: inicio, paginaFin: fin };
  }

  async _asociarAutores(articulo, autoresTexto) {
    if (!autoresTexto || !autoresTexto.trim()) {return;}

    const nombres = autoresTexto.split(',').map(s => s.trim()).filter(Boolean);
    const autores = [];

    for (const nombreCompleto of nombres) {
      const parts = nombreCompleto.trim().split(/\s+/);
      if (parts.length < 2) {continue;}
      const apellido = parts.pop();
      const nombre = parts.join(' ');

      const [autor] = await this.Autor.findOrCreate({
        where: { nombre, apellido }
      });
      autores.push(autor);
    }

    if (autores.length > 0) {
      await articulo.setAutores(autores);
    }
  }

  async _eliminarArticulosRemotos(revistaId, idsRecibidos) {
    if (idsRecibidos.length > 0) {
      await this.Articulo.destroy({
        where: {
          revistaId,
          idArticulo: { [this.Articulo.sequelize.constructor.Op.notIn]: idsRecibidos }
        }
      });
    } else {
      await this.Articulo.destroy({ where: { revistaId } });
    }
  }

  async _crearOActualizarArticulo(art, revistaId) {
    if (!art.titulo || !art.titulo.trim()) {return null;}

    const { paginaInicio, paginaFin } = this._parsearPaginas(art.paginas, art.paginaInicio, art.paginaFin);
    const datos = { revistaId, titulo: art.titulo.trim(), paginaInicio, paginaFin };

    let articulo;
    if (art.id && !isNaN(parseInt(art.id, 10))) {
      articulo = await this.Articulo.findByPk(parseInt(art.id, 10));
      if (articulo) {
        await articulo.update(datos);
      } else {
        articulo = await this.Articulo.create(datos);
      }
    } else {
      articulo = await this.Articulo.create(datos);
    }

    return articulo;
  }

  async guardarArticulos(revistaId, articulos) {
    if (!articulos || articulos.length === 0) {
      await this.Articulo.destroy({ where: { revistaId } });
      return;
    }

    const articulosArray = Array.isArray(articulos) ? articulos : [articulos];

    const idsRecibidos = articulosArray
      .map(a => a.id)
      .filter(id => id && !isNaN(parseInt(id, 10)))
      .map(id => parseInt(id, 10));

    await this._eliminarArticulosRemotos(revistaId, idsRecibidos);

    for (const art of articulosArray) {
      const articulo = await this._crearOActualizarArticulo(art, revistaId);
      if (articulo && art.autores_texto) {
        await this._asociarAutores(articulo, art.autores_texto);
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
    if (!articulo) {throw new Error('Artículo no encontrado');}
    await articulo.destroy();
  }
}

module.exports = ArticuloService;
