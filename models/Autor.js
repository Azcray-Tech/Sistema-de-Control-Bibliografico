/**
 * @requirement RF-03 (Agregar múltiples autores a un material)
 * @use_case CU-03 (Agregar múltiples autores a un material)
 * @description Define la entidad Autor con nombre y apellido. Relación N:M con Material y Articulo.
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Autor = sequelize.define('Autor', {
  idAutor: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id_autor'
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  apellido: {
    type: DataTypes.STRING(100),
    allowNull: false
  }
}, {
  tableName: 'autor',
  timestamps: false
});

module.exports = Autor;
