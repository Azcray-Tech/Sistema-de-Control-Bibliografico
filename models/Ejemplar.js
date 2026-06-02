/**
 * @requirement RF-06 (Añadir ejemplares a un material existente)
 * @use_case CU-06 (Añadir ejemplares a un material existente)
 * @description Define copias físicas de un Material con identificador único y estado (Disponible, Prestado, etc.).
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ejemplar = sequelize.define('Ejemplar', {
  idEjemplar: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id_ejemplar'
  },
  materialId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'material_id'
  },
  identificadorUnico: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'identificador_unico'
  },
  estado: {
    type: DataTypes.ENUM('Disponible', 'Prestado', 'En restauración', 'Dañado', 'Perdido', 'Dado de baja'),
    defaultValue: 'Disponible'
  }
}, {
  tableName: 'ejemplar',
  timestamps: true
});

module.exports = Ejemplar;
