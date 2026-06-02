/**
 * @requirement RF-05 (Gestionar artículos de una revista)
 * @use_case CU-05 (Gestionar artículos de una revista)
 * @description Define artículos pertenecientes a una Revista, con título, páginas y relación N:M con Autor.
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Articulo = sequelize.define('Articulo', {
  idArticulo: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id_articulo'
  },
  revistaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'revista_id'
  },
  titulo: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  paginaInicio: {
    type: DataTypes.INTEGER,
    field: 'pagina_inicio'
  },
  paginaFin: {
    type: DataTypes.INTEGER,
    field: 'pagina_fin'
  }
}, {
  tableName: 'articulo',
  timestamps: false
});

module.exports = Articulo;
