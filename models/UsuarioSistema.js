/**
 * @requirement RF-11 (Crear cuenta de personal)
 * @use_case CU-11 (Crear cuenta de personal)
 * @description Define usuarios del sistema (Administrador/Bibliotecario) con autenticación por bcrypt.
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UsuarioSistema = sequelize.define('UsuarioSistema', {
  idUsuario: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    field: 'id_usuario'
  },
  nombreUsuario: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'nombre_usuario'
  },
  contrasenaHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'contraseña_hash'
  },
  nombre: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  apellido: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  cedula: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  rol: {
    type: DataTypes.ENUM('Administrador', 'Bibliotecario'),
    allowNull: false
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'usuario_sistema',
  timestamps: true
});

module.exports = UsuarioSistema;
