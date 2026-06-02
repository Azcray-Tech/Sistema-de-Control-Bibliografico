/**
 * @requirement RF-15 (Registrar préstamo de un ejemplar)
 * @use_case CU-15 (Registrar préstamo)
 * @description Define la entidad Prestamo: vincula Solicitante, Ejemplar y UsuarioSistema con fechas y estado.
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Prestamo = sequelize.define('Prestamo', {
  idPrestamo: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id_prestamo'
  },
  solicitanteCedula: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'solicitante_cedula'
  },
  ejemplarId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'ejemplar_id'
  },
  usuarioPrestamistaId: {
    type: DataTypes.INTEGER,
    field: 'usuario_prestamista_id'
  },
  fechaPrestamo: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
    field: 'fecha_prestamo'
  },
  fechaDevolucionPrevista: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'fecha_devolucion_prevista'
  },
  fechaDevolucionReal: {
    type: DataTypes.DATEONLY,
    field: 'fecha_devolucion_real'
  },
  renovaciones: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  estado: {
    type: DataTypes.ENUM('Activo', 'Devuelto', 'Vencido'),
    defaultValue: 'Activo'
  }
}, {
  tableName: 'prestamo',
  timestamps: true
});

module.exports = Prestamo;
