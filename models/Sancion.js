/**
 * @requirement RF-18 (Registrar devolución y aplicar sanciones)
 * @use_case CU-18 (Registrar devolución de ejemplar)
 * @description Define sanciones aplicadas a solicitantes por retraso en devoluciones. Incluye suspensión temporal/permanente.
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Sancion = sequelize.define('Sancion', {
  idSancion: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id_sancion'
  },
  solicitanteCedula: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'solicitante_cedula'
  },
  usuarioGestionaId: {
    type: DataTypes.INTEGER,
    field: 'usuario_gestiona_id'
  },
  motivo: {
    type: DataTypes.STRING(255)
  },
  fechaInicio: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'fecha_inicio'
  },
  diasSancion: {
    type: DataTypes.INTEGER,
    field: 'dias_sancion'
  },
  fechaFin: {
    type: DataTypes.DATEONLY,
    field: 'fecha_fin'
  },
  motivoLevantamiento: {
    type: DataTypes.STRING(255),
    field: 'motivo_levantamiento'
  },
  levantadaManualmente: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'levantada_manualmente'
  }
}, {
  tableName: 'sancion',
  timestamps: true
});

module.exports = Sancion;
