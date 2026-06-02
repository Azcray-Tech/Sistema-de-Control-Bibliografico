/**
 * @requirement RF-30 (Auditoría de operaciones críticas)
 * @use_case CU-30 (Registrar auditoría de operaciones críticas)
 * @description Registro de auditoría para toda operación crítica del sistema.
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LogActividad = sequelize.define('LogActividad', {
  idLog: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id_log'
  },
  usuarioId: {
    type: DataTypes.INTEGER,
    field: 'usuario_id'
  },
  accion: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  tablaAfectada: {
    type: DataTypes.STRING(50),
    field: 'tabla_afectada'
  },
  registroId: {
    type: DataTypes.INTEGER,
    field: 'registro_id'
  },
  valorAnterior: {
    type: DataTypes.TEXT,
    field: 'valor_anterior'
  },
  valorNuevo: {
    type: DataTypes.TEXT,
    field: 'valor_nuevo'
  },
  motivo: {
    type: DataTypes.STRING(255)
  },
  fechaHora: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_hora'
  }
}, {
  tableName: 'log_actividad',
  timestamps: false
});

module.exports = LogActividad;
