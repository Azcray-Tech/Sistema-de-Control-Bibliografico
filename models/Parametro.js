/**
 * @requirement RF-21 (Modificar parámetros globales del sistema)
 * @use_case CU-21 (Modificar parámetros globales del sistema)
 * @description Almacena configuración global clave-valor (días préstamo, sanciones, backups, etc.).
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Parametro = sequelize.define('Parametro', {
  clave: {
    type: DataTypes.STRING(100),
    primaryKey: true
  },
  valor: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'parametro',
  timestamps: true
});

module.exports = Parametro;
