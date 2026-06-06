require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const TEST_DB = process.env.TEST_DB_NAME || 'ceela_biblioteca_test';

async function createTestDB() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    multipleStatements: true,
  });

  console.log(`Creando base de datos de prueba '${TEST_DB}'...`);

  await connection.query(`DROP DATABASE IF EXISTS \`${TEST_DB}\``);
  await connection.query(
    `CREATE DATABASE \`${TEST_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.query(`USE \`${TEST_DB}\``);

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
  const cleanedSQL = schemaSQL.replace(/^[\s\S]*?USE ceela_biblioteca;\s*/i, '');
  await connection.query(cleanedSQL);
  console.log('  ✔ Tablas creadas desde schema.sql');

  const valoresParametros = [
    ['dias_prestamo', '7'],
    ['max_prestamos_simultaneos', '3'],
    ['factor_sancion', '2'],
    ['suspension_maxima', '30'],
    ['renovaciones_permitidas', '1'],
    ['tiempo_inactividad', '15'],
    ['hora_backup_automatico', '09:00'],
    ['ruta_backup_automatico', ''],
    ['backup_auto_habilitado', '0'],
  ];
  for (const [clave, valor] of valoresParametros) {
    await connection.query(
      'INSERT IGNORE INTO parametro (clave, valor) VALUES (?, ?)',
      [clave, valor]
    );
  }
  console.log('  ✔ Parámetros sembrados');

  const categorias = ['Literatura', 'Historia', 'Ciencia', 'Filosofía', 'Arte'];
  for (const nombre of categorias) {
    await connection.query(
      'INSERT IGNORE INTO categoria (nombre, descripcion, activa) VALUES (?, ?, TRUE)',
      [nombre, `Categoría de ${nombre.toLowerCase()}`]
    );
  }
  console.log('  ✔ Categorías sembradas');

  const hash = bcrypt.hashSync('admin123', 10);
  await connection.query(
    `INSERT IGNORE INTO usuario_sistema (nombre_usuario, contraseña_hash, nombre, apellido, cedula, rol, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['admin', hash, 'Administrador', 'del Sistema', '00000000', 'Administrador', true]
  );
  console.log('  ✔ Usuario admin sembrado (admin / admin123)');

  await connection.end();
  console.log(`Base de datos de prueba '${TEST_DB}' lista.\n`);
}

createTestDB().catch(err => {
  console.error('Error al crear BD de prueba:', err);
  process.exit(1);
});
