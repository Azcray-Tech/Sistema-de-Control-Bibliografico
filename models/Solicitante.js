/**
 * @requirement RF-14 (Registrar o cargar solicitante por cédula)
 * @use_case CU-14 (Registrar o cargar solicitante por cédula)
 * @description Define personas que solicitan préstamos. Cédula es PK natural. Incluye estado y fechas de suspensión.
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Solicitante = sequelize.define('Solicitante', {
  cedula: {
    type: DataTypes.STRING(20),
    primaryKey: true
  },
  nombre: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  apellido: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  correoElectronico: {
    type: DataTypes.STRING(150),
    field: 'correo_electronico',
    validate: { isEmail: true }
  },
  telefono: {
    type: DataTypes.STRING(20)
  },
  estado: {
    type: DataTypes.ENUM('Activo', 'Suspendido temporal', 'Suspendido permanente'),
    defaultValue: 'Activo'
  },
  fechaFinSuspension: {
    type: DataTypes.DATEONLY,
    field: 'fecha_fin_suspension'
  }
}, {
  tableName: 'solicitante',
  timestamps: true
});

module.exports = Solicitante;
