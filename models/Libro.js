/**
 * @requirement RF-02 (Campos específicos según tipo de material)
 * @use_case CU-02 (Ingresar campos específicos según tipo de material)
 * @description Subtipo Libro: extiende Material con ISBN y editorial.
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Libro = sequelize.define('Libro', {
  idLibro: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id_libro'
  },
  materialId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    field: 'material_id'
  },
  isbn: {
    type: DataTypes.STRING(20),
    unique: true
  },
  editorial: {
    type: DataTypes.STRING(150)
  }
}, {
  tableName: 'libro',
  timestamps: false
});

module.exports = Libro;
