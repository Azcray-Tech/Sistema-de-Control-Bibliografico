const bcrypt = require('bcryptjs');
const db = require('../../../models');

async function crearUsuario(overrides = {}) {
  const username = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const hash = bcrypt.hashSync('test123', 10);
  return db.UsuarioSistema.create({
    nombreUsuario: username,
    contrasenaHash: hash,
    nombre: 'Test',
    apellido: 'User',
    cedula: username,
    rol: 'Bibliotecario',
    activo: true,
    ...overrides,
  });
}

async function crearCategoria(overrides = {}) {
  return db.Categoria.create({
    nombre: 'Cat_' + Date.now(),
    descripcion: 'Categoría de prueba',
    activa: true,
    ...overrides,
  });
}

async function crearAutor(overrides = {}) {
  return db.Autor.create({
    nombre: 'Autor',
    apellido: 'Test_' + Date.now(),
    ...overrides,
  });
}

async function crearMaterialBase(tipo, overrides = {}) {
  const categoria = await db.Categoria.findOne({ where: { activa: true } });
  return db.Material.create({
    titulo: 'Material E2E ' + Date.now(),
    anioPublicacion: 2024,
    signatura: 'SIG-' + Date.now(),
    sinopsis: 'Sinopsis de prueba E2E',
    tipo,
    categoriaId: categoria ? categoria.idCategoria : null,
    ...overrides,
  });
}

async function crearLibro(materialId, overrides = {}) {
  const isbn = '978' + String(Math.floor(Math.random() * 10000000000)).padStart(10, '0');
  return db.Libro.create({
    materialId,
    isbn,
    editorial: 'Editorial E2E',
    ...overrides,
  });
}

async function crearRevista(materialId, overrides = {}) {
  const issn =
    String(Math.floor(Math.random() * 10000)).padStart(4, '0') +
    '-' +
    String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return db.Revista.create({
    materialId,
    issn,
    volumen: 'Vol. 1',
    numero: 'No. 1',
    ...overrides,
  });
}

async function crearTesis(materialId, overrides = {}) {
  return db.Tesis.create({
    materialId,
    tutor: 'Tutor E2E',
    gradoAcademico: 'Licenciatura',
    institucion: 'Universidad E2E',
    ...overrides,
  });
}

async function crearAnuario(materialId, overrides = {}) {
  return db.Anuario.create({
    materialId,
    anioEdicion: 2024,
    ...overrides,
  });
}

async function crearEjemplar(materialId, overrides = {}) {
  return db.Ejemplar.create({
    materialId,
    identificadorUnico: 'EJE-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    estado: 'Disponible',
    ...overrides,
  });
}

async function crearSolicitante(overrides = {}) {
  const cedula = String(Date.now()).slice(-10);
  return db.Solicitante.create({
    cedula,
    nombre: 'Solicitante',
    apellido: 'E2E',
    correoElectronico: cedula + '@test.com',
    telefono: '555-0100',
    estado: 'Activo',
    ...overrides,
  });
}

async function crearSancion(overrides = {}) {
  return db.Sancion.create({
    solicitanteCedula: null,
    usuarioGestionaId: null,
    motivo: 'Sanción E2E',
    fechaInicio: new Date(),
    diasSancion: 7,
    fechaFin: new Date(Date.now() + 7 * 86400000),
    ...overrides,
  });
}

async function crearMaterialCompleto(tipo = 'libro', overrides = {}) {
  const material = await crearMaterialBase(tipo, overrides);

  if (tipo === 'libro') {
    await crearLibro(material.idMaterial);
  } else if (tipo === 'revista') {
    await crearRevista(material.idMaterial);
  } else if (tipo === 'tesis') {
    await crearTesis(material.idMaterial);
  } else if (tipo === 'anuario') {
    await crearAnuario(material.idMaterial);
  }

  const autor = await crearAutor();
  await material.addAutores(autor);

  const ejemplar = await crearEjemplar(material.idMaterial);

  return { material, autor, ejemplar };
}

module.exports = {
  crearUsuario,
  crearCategoria,
  crearAutor,
  crearMaterialBase,
  crearLibro,
  crearRevista,
  crearTesis,
  crearAnuario,
  crearEjemplar,
  crearSolicitante,
  crearSancion,
  crearMaterialCompleto,
};
