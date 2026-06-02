/**
 * @requirement RF-01 (Catalogar Material)
 * @use_case CU-01 (Registrar nuevo material bibliográfico)
 * @description Punto central de modelos Sequelize. Define asociaciones y tablas pivote N:M.
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Categoria = require('./Categoria');
const Material = require('./Material');
const Libro = require('./Libro');
const Revista = require('./Revista');
const Tesis = require('./Tesis');
const Anuario = require('./Anuario');
const Articulo = require('./Articulo');
const Autor = require('./Autor');
const Ejemplar = require('./Ejemplar');
const Solicitante = require('./Solicitante');
const Prestamo = require('./Prestamo');
const UsuarioSistema = require('./UsuarioSistema');
const Sancion = require('./Sancion');
const LogActividad = require('./LogActividad');
const Parametro = require('./Parametro');

// Tablas pivote N:M
const MaterialAutor = sequelize.define('MaterialAutor', {
  materialId: { type: DataTypes.INTEGER, primaryKey: true, field: 'material_id' },
  autorId: { type: DataTypes.INTEGER, primaryKey: true, field: 'autor_id' }
}, { tableName: 'material_autor', timestamps: false });

const ArticuloAutor = sequelize.define('ArticuloAutor', {
  articuloId: { type: DataTypes.INTEGER, primaryKey: true, field: 'articulo_id' },
  autorId: { type: DataTypes.INTEGER, primaryKey: true, field: 'autor_id' }
}, { tableName: 'articulo_autor', timestamps: false });

// Asociaciones

// Categoria → Material
Categoria.hasMany(Material, { foreignKey: 'categoriaId' });
Material.belongsTo(Categoria, { foreignKey: 'categoriaId' });

// Material → subtipos (CTI)
Material.hasOne(Libro, { foreignKey: 'materialId', as: 'libro' });
Libro.belongsTo(Material, { foreignKey: 'materialId' });

Material.hasOne(Revista, { foreignKey: 'materialId', as: 'revista' });
Revista.belongsTo(Material, { foreignKey: 'materialId' });

Material.hasOne(Tesis, { foreignKey: 'materialId', as: 'tesis' });
Tesis.belongsTo(Material, { foreignKey: 'materialId' });

Material.hasOne(Anuario, { foreignKey: 'materialId', as: 'anuario' });
Anuario.belongsTo(Material, { foreignKey: 'materialId' });

// Material → Ejemplar
Material.hasMany(Ejemplar, { foreignKey: 'materialId', as: 'ejemplares' });
Ejemplar.belongsTo(Material, { foreignKey: 'materialId' });

// Material ↔ Autor (N:M)
Material.belongsToMany(Autor, { through: MaterialAutor, foreignKey: 'material_id', otherKey: 'autor_id', as: 'autores' });
Autor.belongsToMany(Material, { through: MaterialAutor, foreignKey: 'autor_id', otherKey: 'material_id', as: 'materiales' });

// Revista → Articulo
Revista.hasMany(Articulo, { foreignKey: 'revistaId', as: 'articulos' });
Articulo.belongsTo(Revista, { foreignKey: 'revistaId' });

// Articulo ↔ Autor (N:M)
Articulo.belongsToMany(Autor, { through: ArticuloAutor, foreignKey: 'articulo_id', otherKey: 'autor_id', as: 'autores' });
Autor.belongsToMany(Articulo, { through: ArticuloAutor, foreignKey: 'autor_id', otherKey: 'articulo_id', as: 'articulos' });

// Solicitante → Prestamo
Solicitante.hasMany(Prestamo, { foreignKey: 'solicitanteCedula' });
Prestamo.belongsTo(Solicitante, { foreignKey: 'solicitanteCedula' });

// Ejemplar → Prestamo
Ejemplar.hasMany(Prestamo, { foreignKey: 'ejemplarId' });
Prestamo.belongsTo(Ejemplar, { foreignKey: 'ejemplarId' });

// UsuarioSistema → Prestamo (prestamista)
UsuarioSistema.hasMany(Prestamo, { foreignKey: 'usuarioPrestamistaId', as: 'prestamosRegistrados' });
Prestamo.belongsTo(UsuarioSistema, { foreignKey: 'usuarioPrestamistaId', as: 'prestamista' });

// UsuarioSistema → LogActividad
UsuarioSistema.hasMany(LogActividad, { foreignKey: 'usuarioId' });
LogActividad.belongsTo(UsuarioSistema, { foreignKey: 'usuarioId' });

// UsuarioSistema → Sancion (gestor)
UsuarioSistema.hasMany(Sancion, { foreignKey: 'usuarioGestionaId', as: 'sancionesGestionadas' });
Sancion.belongsTo(UsuarioSistema, { foreignKey: 'usuarioGestionaId', as: 'gestor' });

// Solicitante → Sancion
Solicitante.hasMany(Sancion, { foreignKey: 'solicitanteCedula' });
Sancion.belongsTo(Solicitante, { foreignKey: 'solicitanteCedula' });

module.exports = {
  sequelize,
  Categoria, Material, Libro, Revista, Tesis, Anuario,
  Articulo, Autor, Ejemplar, Solicitante, Prestamo,
  UsuarioSistema, Sancion, LogActividad, Parametro,
  MaterialAutor, ArticuloAutor
};
