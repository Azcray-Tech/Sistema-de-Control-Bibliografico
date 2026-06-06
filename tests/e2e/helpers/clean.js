const { Op } = require('sequelize');
const db = require('../../../models');

async function limpiarDatosTransaccionales() {
  await db.LogActividad.destroy({ where: {} });
  await db.Sancion.destroy({ where: {} });
  await db.Prestamo.destroy({ where: {} });
  await db.ArticuloAutor.destroy({ where: {} });
  await db.Articulo.destroy({ where: {} });
  await db.MaterialAutor.destroy({ where: {} });
  await db.Ejemplar.destroy({ where: {} });
  await db.Libro.destroy({ where: {} });
  await db.Revista.destroy({ where: {} });
  await db.Tesis.destroy({ where: {} });
  await db.Anuario.destroy({ where: {} });
  await db.Material.destroy({ where: {} });
  await db.Autor.destroy({ where: {} });
  await db.Solicitante.destroy({ where: {} });
  await db.UsuarioSistema.destroy({ where: { nombreUsuario: { [Op.ne]: 'admin' } } });
}

module.exports = { limpiarDatosTransaccionales };
