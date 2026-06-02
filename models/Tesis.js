/**
 * @requirement RF-02 (Campos específicos según tipo de material)
 * @use_case CU-02 (Ingresar campos específicos según tipo de material)
 * @description Subtipo Tesis: extiende Material con tutor, grado académico e institución.
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Tesis = sequelize.define('Tesis', {
  idTesis: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id_tesis'
  },
  materialId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    field: 'material_id'
  },
  tutor: {
    type: DataTypes.STRING(150)
  },
  gradoAcademico: {
    type: DataTypes.STRING(100),
    field: 'grado_academico'
  },
  institucion: {
    type: DataTypes.STRING(200)
  }
}, {
  tableName: 'tesis',
  timestamps: false
});

module.exports = Tesis;
