/**
 * @requirement RF-01 (Catalogar Material)
 * @use_case CU-01 (Registrar nuevo material bibliográfico)
 * @description Define la entidad base Material con campos comunes a todos los subtipos.
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Material = sequelize.define('Material', {
  idMaterial: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id_material'
  },
  titulo: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  anioPublicacion: {
    type: DataTypes.INTEGER,
    field: 'año_publicacion'
  },
  signatura: {
    type: DataTypes.STRING(100)
  },
  sinopsis: {
    type: DataTypes.TEXT
  },
  portada: {
    type: DataTypes.STRING(255)
  },
  materialDigital: {
    type: DataTypes.STRING(500),
    field: 'material_digital'
  },
  tipo: {
    type: DataTypes.ENUM('libro', 'tesis', 'revista', 'anuario'),
    allowNull: false
  },
  categoriaId: {
    type: DataTypes.INTEGER,
    field: 'categoria_id'
  }
}, {
  tableName: 'material',
  timestamps: true
});

module.exports = Material;
