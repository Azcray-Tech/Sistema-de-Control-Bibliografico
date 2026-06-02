/**
 * @requirement RF-02 (Campos específicos según tipo de material)
 * @use_case CU-02 (Ingresar campos específicos según tipo de material)
 * @description Subtipo Revista: extiende Material con ISSN, volumen, número y fecha de publicación.
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Revista = sequelize.define('Revista', {
  idRevista: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id_revista'
  },
  materialId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    field: 'material_id'
  },
  issn: {
    type: DataTypes.STRING(20),
    unique: true
  },
  volumen: {
    type: DataTypes.STRING(20)
  },
  numero: {
    type: DataTypes.STRING(20)
  },
  fechaPublicacion: {
    type: DataTypes.DATEONLY,
    field: 'fecha_publicacion'
  }
}, {
  tableName: 'revista',
  timestamps: false
});

module.exports = Revista;
