/**
 * @requirement RF-01, RF-02, RF-03, RF-04, RF-08
 * @use_case CU-01, CU-02, CU-03, CU-04, CU-08
 * @description Servicio de materiales: CRUD, validación ISBN/ISSN, gestión de autores y ejemplares.
 */
function validarISBN13(isbn) {
  if (!/^\d{13}$/.test(isbn)) {return false;}
  const sum = isbn.split('').reduce((acc, d, i) => acc + parseInt(d, 10) * (i % 2 === 0 ? 1 : 3), 0);
  return sum % 10 === 0;
}

function validarISBN10(isbn) {
  if (!/^\d{9}[\dXx]$/.test(isbn)) {return false;}
  const last = isbn.slice(-1).toUpperCase() === 'X' ? 10 : parseInt(isbn.slice(-1), 10);
  const sum = isbn.slice(0, 9).split('').reduce((acc, d, i) => acc + parseInt(d, 10) * (i + 1), 0);
  return sum % 11 === last;
}

class MaterialService {
  constructor({ Material, Libro, Revista, Tesis, Anuario, Categoria, Ejemplar, Autor, Articulo, Prestamo }, auditoria, articuloService) {
    this.Material = Material;
    this.Libro = Libro;
    this.Revista = Revista;
    this.Tesis = Tesis;
    this.Anuario = Anuario;
    this.Categoria = Categoria;
    this.Ejemplar = Ejemplar;
    this.Autor = Autor;
    this.Articulo = Articulo;
    this.Prestamo = Prestamo;
    this.auditoria = auditoria;
    this.articuloService = articuloService;
  }

  _mapearLibro(d) {
    if (typeof d.libro !== 'object' && d.isbn) {
      d.libro = { isbn: d.isbn, editorial: d.editorial };
    }
  }

  _mapearRevista(d) {
    if (typeof d.revista !== 'object' && d.issn) {
      if (d.fechaPublicacion === '') {d.fechaPublicacion = null;}
      d.revista = { issn: d.issn, volumen: d.volumen, numero: d.numero, fechaPublicacion: d.fechaPublicacion };
    }
  }

  _mapearTesis(d) {
    if (typeof d.tesis !== 'object' && d.tutor) {
      d.tesis = { tutor: d.tutor, gradoAcademico: d.gradoAcademico, institucion: d.institucion };
    }
  }

  _mapearAnuario(d) {
    if (typeof d.anuario !== 'object' && d.anioEdicion) {
      d.anuario = { anioEdicion: d.anioEdicion };
    }
  }

  _mapearAutores(d) {
    if (!Array.isArray(d.autores)) {
      d.autores = [];
    }
  }

  _mapearEjemplaresNuevos(d) {
    if (typeof d.ejemplaresNuevos === 'string') {
      try { d.ejemplaresNuevos = JSON.parse(d.ejemplaresNuevos); } catch { d.ejemplaresNuevos = []; }
    } else if (!Array.isArray(d.ejemplaresNuevos)) {
      d.ejemplaresNuevos = [];
    }
    if (Array.isArray(d.ejemplaresNuevos)) {
      d.ejemplaresNuevos = d.ejemplaresNuevos.map(e =>
        typeof e === 'string' ? { identificadorUnico: e } : e
      );
    }
  }

  _prepararDatosSubtipo(d) {
    this._mapearLibro(d);
    this._mapearRevista(d);
    this._mapearTesis(d);
    this._mapearAnuario(d);
    this._mapearAutores(d);
    this._mapearEjemplaresNuevos(d);
    return d;
  }

  validarISBN(isbn) {
    if (!isbn) {return true;}
    const limpio = isbn.replace(/[-\s]/g, '');
    if (limpio.length === 13) {return validarISBN13(limpio);}
    if (limpio.length === 10) {return validarISBN10(limpio);}
    return false;
  }

  validarISSN(issn) {
    if (!issn) {return true;}
    return /^\d{4}-\d{4}$/.test(issn);
  }

  async listar(pagina = 1, tipo = '', search = '', sort = '', dir = '') {
    const Op = this.Material.sequelize.constructor.Op;
    const where = {};
    if (tipo) {where.tipo = tipo;}
    if (search) {
      where[Op.or] = [
        { titulo: { [Op.like]: `%${search}%` } },
        { sinopsis: { [Op.like]: `%${search}%` } },
        { signatura: { [Op.like]: `%${search}%` } }
      ];
    }

    const page = Math.max(1, parseInt(pagina, 10) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    const sortMap = { titulo: 'titulo', tipo: 'tipo', fecha: 'updatedAt' };
    const sortCol = sortMap[sort] || 'updatedAt';
    const sortDir = dir === 'asc' ? 'ASC' : 'DESC';

    const { rows, count } = await this.Material.findAndCountAll({
      where,
      include: [
        { model: this.Categoria },
        { model: this.Libro, as: 'libro' },
        { model: this.Revista, as: 'revista' },
        { model: this.Tesis, as: 'tesis' },
        { model: this.Anuario, as: 'anuario' },
        { model: this.Autor, as: 'autores', through: { attributes: [] } },
        { model: this.Ejemplar, as: 'ejemplares' }
      ],
      order: [[sortCol, sortDir]],
      limit, offset, distinct: true
    });

    return { materiales: rows, total: count, pagina: page, totalPaginas: Math.ceil(count / limit) };
  }

  async obtener(id) {
    return this.Material.findByPk(id, {
      include: [
        { model: this.Categoria },
        { model: this.Libro, as: 'libro' },
        { model: this.Revista, as: 'revista', include: [{ model: this.Articulo, as: 'articulos', include: [{ model: this.Autor, as: 'autores', through: { attributes: [] } }] }] },
        { model: this.Tesis, as: 'tesis' },
        { model: this.Anuario, as: 'anuario' },
        { model: this.Autor, as: 'autores', through: { attributes: [] } },
        { model: this.Ejemplar, as: 'ejemplares' }
      ]
    });
  }

  _validarDatosCreacion(titulo, tipo, libro, revista, tesis) {
    if (!titulo) {throw new Error('El título es obligatorio');}
    if (tipo === 'libro' && !this.validarISBN(libro?.isbn)) {
      throw new Error('ISBN inválido');
    }
    if (tipo === 'revista' && !this.validarISSN(revista?.issn)) {
      throw new Error('ISSN inválido (formato esperado: XXXX-XXXX)');
    }
    if (tipo === 'tesis' && !tesis) {
      throw new Error('El tutor es obligatorio');
    }
  }

  async _verificarDuplicadosCrear(tipo, libro, revista) {
    if (tipo === 'libro' && libro?.isbn) {
      const existente = await this.Libro.findOne({ where: { isbn: libro.isbn } });
      if (existente) {throw new Error(`El ISBN ${libro.isbn} ya está registrado para otro material`);}
    }
    if (tipo === 'revista' && revista?.issn) {
      const existente = await this.Revista.findOne({ where: { issn: revista.issn } });
      if (existente) {throw new Error(`El ISSN ${revista.issn} ya está registrado para otra revista`);}
    }
  }

  async _crearRevistaMaterial(material, revista, datos, transaction) {
    const revistaCreada = await this.Revista.create({
      materialId: material.idMaterial, issn: revista.issn,
      volumen: revista.volumen, numero: revista.numero, fechaPublicacion: revista.fechaPublicacion
    }, { transaction });
    if (datos.articulos && this.articuloService) {
      await this.articuloService.guardarArticulos(revistaCreada.idRevista, datos.articulos);
    }
    return revistaCreada;
  }

  async _crearSubtipoMaterial(material, tipo, datos, transaction) {
    const { libro, revista, tesis, anuario } = datos;
    if (tipo === 'libro' && libro) {
      return await this.Libro.create({ materialId: material.idMaterial, isbn: libro.isbn, editorial: libro.editorial }, { transaction });
    }
    if (tipo === 'revista' && revista) {
      return await this._crearRevistaMaterial(material, revista, datos, transaction);
    }
    if (tipo === 'tesis' && tesis) {
      return await this.Tesis.create({ materialId: material.idMaterial, tutor: tesis.tutor, gradoAcademico: tesis.gradoAcademico, institucion: tesis.institucion }, { transaction });
    }
    if (tipo === 'anuario' && anuario) {
      return await this.Anuario.create({ materialId: material.idMaterial, anioEdicion: anuario.anioEdicion }, { transaction });
    }
  }

  async _asociarAutoresMaterial(material, autores, transaction) {
    if (autores && autores.length > 0) {
      const autorInstancias = await Promise.all(
        autores.map(a => this.Autor.findOrCreate({
          where: { nombre: a.nombre, apellido: a.apellido },
          transaction
        }).then(([autor]) => autor))
      );
      await material.setAutores(autorInstancias, { transaction });
    }
  }

  async _crearEjemplaresMaterial(materialId, ejemplaresNuevos, transaction) {
    if (ejemplaresNuevos && ejemplaresNuevos.length > 0) {
      await this.Ejemplar.bulkCreate(
        ejemplaresNuevos.map(e => ({
          materialId,
          identificadorUnico: e.identificadorUnico,
          estado: 'Disponible'
        })),
        { transaction }
      );
    }
  }

  _auditarCreacion(usuarioId, material) {
    if (this.auditoria) {
      return this.auditoria({
        usuarioId, accion: 'CREAR_MATERIAL',
        tablaAfectada: 'material', registroId: material.idMaterial,
        valorNuevo: { titulo: material.titulo, tipo: material.tipo }
      });
    }
  }

  async _ejecutarTransaccionCreacion(datos, usuarioId) {
    const transaction = await this.Material.sequelize.transaction();
    try {
      const { titulo, anioPublicacion, signatura, sinopsis, portada, materialDigital, tipo, categoriaId, autores, ejemplaresNuevos } = datos;
      const material = await this.Material.create({
        titulo, anioPublicacion, signatura, sinopsis, portada, materialDigital, tipo, categoriaId
      }, { transaction });

      await this._crearSubtipoMaterial(material, tipo, datos, transaction);
      await this._asociarAutoresMaterial(material, autores, transaction);
      await this._crearEjemplaresMaterial(material.idMaterial, ejemplaresNuevos, transaction);
      await this._auditarCreacion(usuarioId, material);

      await transaction.commit();
      return material;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async crear(datos, usuarioId) {
    datos = this._prepararDatosSubtipo(datos);
    const { titulo, tipo, libro, revista, tesis } = datos;

    this._validarDatosCreacion(titulo, tipo, libro, revista, tesis);
    await this._verificarDuplicadosCrear(tipo, libro, revista);

    return this._ejecutarTransaccionCreacion(datos, usuarioId);
  }

  async _verificarDuplicadosActualizar(id, tipo, libro, revista) {
    if (tipo === 'libro' && libro?.isbn) {
      const existente = await this.Libro.findOne({ where: { isbn: libro.isbn } });
      if (existente && existente.materialId !== Number(id)) {
        throw new Error(`El ISBN ${libro.isbn} ya está registrado para otro material`);
      }
    }
    if (tipo === 'revista' && revista?.issn) {
      const existente = await this.Revista.findOne({ where: { issn: revista.issn } });
      if (existente && existente.materialId !== Number(id)) {
        throw new Error(`El ISSN ${revista.issn} ya está registrado para otra revista`);
      }
    }
  }

  async _verificarPrestamosActivos(material, titulo, signatura) {
    const ejemplaresIds = (material.ejemplares || []).map(e => e.idEjemplar);
    if (ejemplaresIds.length === 0) {return;}
    const prestamoActivo = await this.Prestamo.findOne({
      where: { ejemplarId: ejemplaresIds, estado: 'Activo' }
    });
    if (!prestamoActivo) {return;}
    if (titulo !== undefined && titulo !== material.titulo) {
      throw new Error('No se puede modificar el título porque hay ejemplares prestados');
    }
    if (signatura !== undefined && signatura !== material.signatura) {
      throw new Error('No se puede modificar la signatura porque hay ejemplares prestados');
    }
  }

  async _actualizarRevistaMaterial(id, revista, datos, transaction) {
    const [revistaInst] = await this.Revista.findOrCreate({ where: { materialId: id }, defaults: { materialId: id }, transaction });
    await revistaInst.update({ issn: revista.issn, volumen: revista.volumen, numero: revista.numero, fechaPublicacion: revista.fechaPublicacion }, { transaction });
    if (this.articuloService) {
      await this.articuloService.guardarArticulos(revistaInst.idRevista, datos.articulos);
    }
  }

  async _actualizarSubtipoMaterial(id, tipo, datos, transaction) {
    const { libro, revista, tesis, anuario } = datos;
    if (tipo === 'libro' && libro) {
      const [libroInst] = await this.Libro.findOrCreate({ where: { materialId: id }, defaults: { materialId: id }, transaction });
      await libroInst.update({ isbn: libro.isbn, editorial: libro.editorial }, { transaction });
    }
    if (tipo === 'revista' && revista) {
      await this._actualizarRevistaMaterial(id, revista, datos, transaction);
    }
    if (tipo === 'tesis' && tesis) {
      const [tesisInst] = await this.Tesis.findOrCreate({ where: { materialId: id }, defaults: { materialId: id }, transaction });
      await tesisInst.update({ tutor: tesis.tutor, gradoAcademico: tesis.gradoAcademico, institucion: tesis.institucion }, { transaction });
    }
    if (tipo === 'anuario' && anuario) {
      const [anuarioInst] = await this.Anuario.findOrCreate({ where: { materialId: id }, defaults: { materialId: id }, transaction });
      await anuarioInst.update({ anioEdicion: anuario.anioEdicion }, { transaction });
    }
  }

  _auditarActualizacion(usuarioId, id, valorAnterior, valorNuevo) {
    if (this.auditoria) {
      return this.auditoria({
        usuarioId, accion: 'ACTUALIZAR_MATERIAL',
        tablaAfectada: 'material', registroId: id,
        valorAnterior,
        valorNuevo
      });
    }
  }

  async _ejecutarTransaccionActualizacion(id, datos, material, usuarioId) {
    const { titulo, anioPublicacion, signatura, sinopsis, portada, materialDigital, categoriaId, tipo, autores, ejemplaresNuevos } = datos;

    const valorAnterior = {
      titulo: material.titulo,
      signatura: material.signatura,
      anioPublicacion: material.anioPublicacion,
      sinopsis: material.sinopsis,
      categoriaId: material.categoriaId
    };

    const transaction = await this.Material.sequelize.transaction();
    try {
      await material.update({ titulo, anioPublicacion, signatura, sinopsis, portada, materialDigital, categoriaId }, { transaction });

      await this._actualizarSubtipoMaterial(id, tipo, datos, transaction);
      await this._asociarAutoresMaterial(material, autores, transaction);
      await this._crearEjemplaresMaterial(material.idMaterial, ejemplaresNuevos, transaction);
      await this._auditarActualizacion(usuarioId, id, valorAnterior, { titulo, signatura, anioPublicacion, sinopsis, categoriaId });

      await transaction.commit();
      return material;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async actualizar(id, datos, usuarioId) {
    datos = this._prepararDatosSubtipo(datos);
    const { titulo, signatura, tipo, libro, revista, tesis } = datos;
    if (!titulo) {throw new Error('El título es obligatorio');}
    if (tipo === 'tesis' && !tesis) {
      throw new Error('El tutor es obligatorio');
    }

    const material = await this.Material.findByPk(id, {
      include: [{ model: this.Ejemplar, as: 'ejemplares' }]
    });
    if (!material) {throw new Error('Material no encontrado');}

    await this._verificarDuplicadosActualizar(id, tipo, libro, revista);
    await this._verificarPrestamosActivos(material, titulo, signatura);

    return this._ejecutarTransaccionActualizacion(id, datos, material, usuarioId);
  }

  async agregarEjemplares(materialId, identificadores, usuarioId) {
    const material = await this.Material.findByPk(materialId);
    if (!material) {throw new Error('Material no encontrado');}

    const existentes = await this.Ejemplar.findAll({
      where: { materialId, identificadorUnico: identificadores }
    });
    if (existentes.length > 0) {
      throw new Error(`Los siguientes identificadores ya existen para este material: ${existentes.map(e => e.identificadorUnico).join(', ')}`);
    }

    const ejemplares = await this.Ejemplar.bulkCreate(
      identificadores.map(id => ({
        materialId,
        identificadorUnico: id,
        estado: 'Disponible'
      }))
    );

    if (this.auditoria) {
      await this.auditoria({
        usuarioId, accion: 'AGREGAR_EJEMPLARES',
        tablaAfectada: 'ejemplar', registroId: materialId,
        valorNuevo: { cantidad: identificadores.length, identificadores }
      });
    }

    return ejemplares;
  }

  async eliminar(id, usuarioId) {
    const material = await this.Material.findByPk(id, {
      include: [{ model: this.Ejemplar, as: 'ejemplares' }]
    });
    if (!material) {throw new Error('Material no encontrado');}

    const ejemplaresIds = (material.ejemplares || []).map(e => e.idEjemplar);
    if (ejemplaresIds.length > 0) {
      const prestamoActivo = await this.Prestamo.findOne({
        where: { ejemplarId: ejemplaresIds, estado: 'Activo' }
      });
      if (prestamoActivo) {
        throw new Error('No se puede eliminar el material porque tiene ejemplares con préstamos activos');
      }
    }

    await material.setAutores([]);

    if (material.ejemplares && material.ejemplares.length > 0) {
      await this.Ejemplar.destroy({
        where: { materialId: id }
      });
    }

    await material.destroy();

    if (this.auditoria) {
      await this.auditoria({
        usuarioId, accion: 'BAJA_MATERIAL',
        tablaAfectada: 'material', registroId: id
      });
    }

    return null;
  }

  async buscarEjemplares({ identificador, materialId }) {
    const Op = this.Material.sequelize.constructor.Op;
    const where = { estado: 'Disponible' };
    if (identificador) {where.identificadorUnico = { [Op.like]: `%${identificador}%` };}
    if (materialId) {where.materialId = materialId;}

    return this.Ejemplar.findAll({
      where,
      include: [{ model: this.Material, attributes: ['idMaterial', 'titulo', 'tipo'] }],
      limit: 20
    });
  }

  async buscarDisponibles(titulo) {
    const Op = this.Material.sequelize.constructor.Op;
    if (!titulo) {return [];}

    const materiales = await this.Material.findAll({
      where: { titulo: { [Op.like]: `%${titulo}%` } },
      include: [
        { model: this.Ejemplar, as: 'ejemplares', where: { estado: 'Disponible' }, required: true },
        { model: this.Autor, as: 'autores', through: { attributes: [] }, attributes: ['nombre', 'apellido'] }
      ]
    });

    const resultado = [];
    materiales.forEach(m => {
      const autores = m.autores?.map(a => `${a.nombre} ${a.apellido}`).join(', ') || '';
      m.ejemplares.forEach(ej => {
        resultado.push({
          id: ej.idEjemplar,
          titulo: m.titulo,
          autores,
          tipo: m.tipo,
          identificadorUnico: ej.identificadorUnico
        });
      });
    });

    return resultado;
  }
}

module.exports = MaterialService;
