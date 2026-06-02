/**
 * @requirement RF-02 (Campos específicos según tipo de material)
 * @use_case CU-02 (Ingresar campos específicos según tipo de material)
 * @description Subtipo Anuario: extiende Material con año de edición.
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Anuario = sequelize.define('Anuario', {
  idAnuario: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id_anuario'
  },
  materialId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    field: 'material_id'
  },
  anioEdicion: {
    type: DataTypes.INTEGER,
    field: 'año_edicion'
  }
}, {
  tableName: 'anuario',
  timestamps: false
});

module.exports = Anuario;
