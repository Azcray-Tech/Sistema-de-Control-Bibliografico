const { DataTypes } = require('sequelize');

const mockDefine = jest.fn((name, attributes, options) => ({
  name,
  rawAttributes: attributes,
  tableName: options ? options.tableName : undefined
}));

jest.mock('../config/database', () => ({ define: mockDefine }));

function testModel(name, modelPath, expectedTableName, expectedAttrs) {
  test(`${name} → tableName: ${expectedTableName}`, () => {
    jest.isolateModules(() => {
      mockDefine.mockClear();
      require(modelPath);
      expect(mockDefine).toHaveBeenCalledWith(
        name,
        expect.objectContaining(expectedAttrs),
        expect.objectContaining({ tableName: expectedTableName })
      );
    });
  });
}

describe('Model definitions', () => {
  testModel('Material', '../models/Material', 'material', {
    idMaterial: expect.any(Object),
    titulo: expect.any(Object),
    tipo: expect.any(Object)
  });

  testModel('Libro', '../models/Libro', 'libro', {
    idLibro: expect.any(Object),
    materialId: expect.any(Object),
    isbn: expect.any(Object),
    editorial: expect.any(Object)
  });

  testModel('Revista', '../models/Revista', 'revista', {
    idRevista: expect.any(Object),
    materialId: expect.any(Object),
    issn: expect.any(Object),
    volumen: expect.any(Object),
    numero: expect.any(Object),
    fechaPublicacion: expect.any(Object)
  });

  testModel('Tesis', '../models/Tesis', 'tesis', {
    idTesis: expect.any(Object),
    materialId: expect.any(Object),
    tutor: expect.any(Object),
    gradoAcademico: expect.any(Object),
    institucion: expect.any(Object)
  });

  testModel('Anuario', '../models/Anuario', 'anuario', {
    idAnuario: expect.any(Object),
    materialId: expect.any(Object),
    anioEdicion: expect.any(Object)
  });

  testModel('Articulo', '../models/Articulo', 'articulo', {
    idArticulo: expect.any(Object),
    revistaId: expect.any(Object),
    titulo: expect.any(Object),
    paginaInicio: expect.any(Object),
    paginaFin: expect.any(Object)
  });

  testModel('Autor', '../models/Autor', 'autor', {
    idAutor: expect.any(Object),
    nombre: expect.any(Object),
    apellido: expect.any(Object)
  });

  testModel('Categoria', '../models/Categoria', 'categoria', {
    idCategoria: expect.any(Object),
    nombre: expect.any(Object),
    descripcion: expect.any(Object),
    activa: expect.any(Object)
  });

  testModel('Ejemplar', '../models/Ejemplar', 'ejemplar', {
    idEjemplar: expect.any(Object),
    materialId: expect.any(Object),
    identificadorUnico: expect.any(Object),
    estado: expect.any(Object)
  });

  testModel('Solicitante', '../models/Solicitante', 'solicitante', {
    cedula: expect.any(Object),
    nombre: expect.any(Object),
    apellido: expect.any(Object),
    correoElectronico: expect.any(Object),
    estado: expect.any(Object)
  });

  testModel('Prestamo', '../models/Prestamo', 'prestamo', {
    idPrestamo: expect.any(Object),
    solicitanteCedula: expect.any(Object),
    ejemplarId: expect.any(Object),
    fechaDevolucionPrevista: expect.any(Object),
    estado: expect.any(Object)
  });

  testModel('UsuarioSistema', '../models/UsuarioSistema', 'usuario_sistema', {
    idUsuario: expect.any(Object),
    nombreUsuario: expect.any(Object),
    contrasenaHash: expect.any(Object),
    nombre: expect.any(Object),
    apellido: expect.any(Object),
    cedula: expect.any(Object),
    rol: expect.any(Object),
    activo: expect.any(Object)
  });

  testModel('Sancion', '../models/Sancion', 'sancion', {
    idSancion: expect.any(Object),
    solicitanteCedula: expect.any(Object),
    fechaInicio: expect.any(Object)
  });

  testModel('LogActividad', '../models/LogActividad', 'log_actividad', {
    idLog: expect.any(Object),
    accion: expect.any(Object),
    tablaAfectada: expect.any(Object)
  });

  testModel('Parametro', '../models/Parametro', 'parametro', {
    clave: expect.any(Object),
    valor: expect.any(Object)
  });
});
