/**
 * @requirement RF-01 (Catalogar Material)
 * @description Script de migración inicial: crea BD desde schema.sql y siembra datos por defecto (admin, categorías, parámetros).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function migrar() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    multipleStatements: true
  });

  console.log('Conectado a MySQL. Ejecutando schema.sql...');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
  await connection.query(schemaSQL);

  console.log('Base de datos y tablas creadas correctamente.');

  // Seed: crear parámetros por defecto
  const valoresParametros = [
    ['dias_prestamo', '7'],
    ['max_prestamos_simultaneos', '3'],
    ['factor_sancion', '2'],
    ['suspension_maxima', '30'],
    ['renovaciones_permitidas', '1'],
    ['tiempo_inactividad', '15'],
    ['hora_backup_automatico', '09:00'],
    ['ruta_backup_automatico', ''],
    ['backup_auto_habilitado', '0']
  ];

  await connection.query('USE ceela_biblioteca');

  for (const [clave, valor] of valoresParametros) {
    await connection.query(
      'INSERT IGNORE INTO parametro (clave, valor) VALUES (?, ?)',
      [clave, valor]
    );
  }

  console.log('Parámetros por defecto insertados.');

  // Seed: crear categorías por defecto
  const categorias = ['Literatura', 'Historia', 'Ciencia', 'Filosofía', 'Arte'];
  for (const nombre of categorias) {
    await connection.query(
      'INSERT IGNORE INTO categoria (nombre, descripcion, activa) VALUES (?, ?, TRUE)',
      [nombre, `Categoría de ${nombre.toLowerCase()}`]
    );
  }

  console.log('Categorías por defecto insertadas.');

  // Seed: crear admin por defecto
  const hash = bcrypt.hashSync('admin123', 10);
  await connection.query(
    `INSERT IGNORE INTO usuario_sistema (nombre_usuario, contraseña_hash, nombre, apellido, cedula, rol, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['admin', hash, 'Administrador', 'del Sistema', '00000000', 'Administrador', true]
  );

  console.log('Usuario admin creado (admin / admin123).');

  await connection.end();
  console.log('Migración completada exitosamente.');
}

migrar().catch(err => {
  console.error('Error en migración:', err);
  process.exit(1);
});
