require('../setup');

const models = require('../../../models');
const MaterialService = require('../../../services/material.service');
const { registrarAuditoria } = require('../../../middleware/auditoria');
const { limpiarDatosTransaccionales } = require('../../../tests/e2e/helpers/clean');

describe('MaterialService - integración con BD real', () => {
  const service = new MaterialService(models, registrarAuditoria);

  afterAll(async () => {
    await limpiarDatosTransaccionales();
  });

  let categoriaId;
  let adminId;

  beforeAll(async () => {
    const cat = await models.Categoria.findOne({ where: { activa: true } });
    categoriaId = cat ? cat.idCategoria : null;
    const admin = await models.UsuarioSistema.findOne({ where: { nombreUsuario: 'admin' } });
    adminId = admin ? admin.idUsuario : 1;
  });

  test('debe crear un libro con autores', async () => {
    const data = {
      titulo: 'Libro Integración Test',
      tipo: 'libro',
      anioPublicacion: 2024,
      categoriaId,
      isbn: '9780306406157',
      editorial: 'Editorial Test',
      autores: [{ nombre: 'Autor', apellido: 'Integración' }],
    };
    const resultado = await service.crear(data, adminId);
    expect(resultado).toBeDefined();
    expect(resultado.idMaterial).toBeDefined();
    expect(resultado.titulo).toBe('Libro Integración Test');

    const libro = await models.Libro.findOne({ where: { materialId: resultado.idMaterial } });
    expect(libro).toBeDefined();
    expect(libro.isbn).toBe('9780306406157');
  });

  test('debe crear una revista con ISSN válido', async () => {
    const data = {
      titulo: 'Revista Integración Test',
      tipo: 'revista',
      anioPublicacion: 2024,
      categoriaId,
      issn: '1234-5678',
      volumen: 'Vol. 1',
      numero: 'No. 1',
      autores: [],
    };
    const resultado = await service.crear(data, adminId);
    expect(resultado.tipo).toBe('revista');

    const revista = await models.Revista.findOne({ where: { materialId: resultado.idMaterial } });
    expect(revista.issn).toBe('1234-5678');
  });

  test('debe crear una tesis con tutor y grado', async () => {
    const data = {
      titulo: 'Tesis Integración Test',
      tipo: 'tesis',
      anioPublicacion: 2024,
      categoriaId,
      tutor: 'Dr. Tutor',
      gradoAcademico: 'Maestría',
      institucion: 'Universidad Test',
      autores: [],
    };
    const resultado = await service.crear(data, adminId);
    expect(resultado.tipo).toBe('tesis');

    const tesis = await models.Tesis.findOne({ where: { materialId: resultado.idMaterial } });
    expect(tesis.tutor).toBe('Dr. Tutor');
    expect(tesis.gradoAcademico).toBe('Maestría');
  });

  test('debe crear un anuario con año de edición', async () => {
    const data = {
      titulo: 'Anuario Integración Test',
      tipo: 'anuario',
      anioPublicacion: 2024,
      categoriaId,
      anioEdicion: 2025,
      autores: [],
    };
    const resultado = await service.crear(data, adminId);
    expect(resultado.tipo).toBe('anuario');

    const anuario = await models.Anuario.findOne({ where: { materialId: resultado.idMaterial } });
    expect(anuario.anioEdicion).toBe(2025);
  });

  test('debe listar materiales con paginación', async () => {
    const { materiales, total } = await service.listar(1, '', '', '', '');
    expect(Array.isArray(materiales)).toBe(true);
    expect(total).toBeGreaterThanOrEqual(0);
  });

  test('debe listar materiales filtrados por tipo', async () => {
    const { materiales } = await service.listar(1, 'libro', '', '', '');
    materiales.forEach(m => {
      expect(m.tipo).toBe('libro');
    });
  });

  test('debe rechazar ISBN inválido', () => {
    expect(service.validarISBN('123')).toBe(false);
    expect(service.validarISBN('9780306406157')).toBe(true);
    expect(service.validarISBN('')).toBe(true);
  });

  test('debe rechazar ISSN con formato incorrecto', () => {
    expect(service.validarISSN('1234-5678')).toBe(true);
    expect(service.validarISSN('12345678')).toBe(false);
    expect(service.validarISSN('')).toBe(true);
  });

  test('debe obtener un material por ID', async () => {
    const data = {
      titulo: 'Material Obtener Test',
      tipo: 'libro',
      categoriaId,
      isbn: '9780143456780',
      editorial: 'Test',
      autores: [],
    };
    const creado = await service.crear(data, adminId);
    const obtenido = await service.obtener(creado.idMaterial);
    expect(obtenido).toBeDefined();
    expect(obtenido.idMaterial).toBe(creado.idMaterial);
  });

  test('debe retornar null al obtener un ID inexistente', async () => {
    const obtenido = await service.obtener(999999);
    expect(obtenido).toBeNull();
  });
});
