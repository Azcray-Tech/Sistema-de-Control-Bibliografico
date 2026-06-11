/**
 * @requirement RF-DEVOPS
 * @use_case CU-DEVOPS
 * @description Elimina todos los datos de prueba de la base de datos,
 * conservando: usuario admin, categorías semilla y parámetros de configuración.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../models');

async function limpiar() {
  console.log('Conectando a la base de datos...');
  await db.sequelize.authenticate();
  console.log('Conexión exitosa. Limpiando datos...\n');

  // Orden: tablas hijas (con FK) primero
  await db.LogActividad.destroy({ where: {} });
  console.log('  ✔ log_actividad');

  await db.Sancion.destroy({ where: {} });
  console.log('  ✔ sancion');

  await db.Prestamo.destroy({ where: {} });
  console.log('  ✔ prestamo');

  await db.ArticuloAutor.destroy({ where: {} });
  console.log('  ✔ articulo_autor');

  await db.Articulo.destroy({ where: {} });
  console.log('  ✔ articulo');

  await db.MaterialAutor.destroy({ where: {} });
  console.log('  ✔ material_autor');

  await db.Ejemplar.destroy({ where: {} });
  console.log('  ✔ ejemplar');

  await db.Libro.destroy({ where: {} });
  console.log('  ✔ libro');

  await db.Revista.destroy({ where: {} });
  console.log('  ✔ revista');

  await db.Tesis.destroy({ where: {} });
  console.log('  ✔ tesis');

  await db.Anuario.destroy({ where: {} });
  console.log('  ✔ anuario');

  await db.Material.destroy({ where: {} });
  console.log('  ✔ material');

  await db.Autor.destroy({ where: {} });
  console.log('  ✔ autor');

  await db.Solicitante.destroy({ where: {} });
  console.log('  ✔ solicitante');

  console.log('\nLimpieza completada. Se conservaron: usuario admin, categorías y parámetros.');
  process.exit(0);
}

limpiar().catch(err => {
  console.error('Error durante la limpieza:', err);
  process.exit(1);
});
