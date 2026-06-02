/**
 * @requirement RF-09 (Gestionar categorías de materiales)
 * @use_case CU-09 (Gestionar categorías de materiales)
 * @description Define las categorías para clasificar materiales. Solo categorías activas se muestran en formularios.
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Categoria = sequelize.define('Categoria', {
  idCategoria: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id_categoria'
  },
  nombre: {
    type: DataTypes.STRING(80),
    allowNull: false,
    unique: true
  },
  descripcion: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  activa: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'categoria',
  timestamps: false
});

module.exports = Categoria;
