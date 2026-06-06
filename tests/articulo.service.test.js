/**
 * @requirement RF-05 (Gestionar artículos de revista)
 * @use_case CU-05
 * @description Pruebas unitarias del servicio de artículos con mocks.
 */
const ArticuloService = require('../services/articulo.service');
const { crearMocksModelos, mockAuditoria } = require('./mocks/models');

const crearArticuloMock = (id = 1, overrides = {}) => ({
  idArticulo: id,
  revistaId: 1,
  titulo: 'Artículo de prueba',
  paginaInicio: 10,
  paginaFin: 20,
  update: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined),
  setAutores: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('ArticuloService', () => {
  let articuloService;
  let mocks;

  beforeEach(() => {
    mocks = crearMocksModelos();
    articuloService = new ArticuloService(mocks, mockAuditoria);
    mockAuditoria.mockClear();
  });

  describe('guardarArticulos', () => {
    it('debe eliminar todos los artículos si la lista está vacía', async () => {
      await articuloService.guardarArticulos(1, []);

      expect(mocks.Articulo.destroy).toHaveBeenCalledWith({
        where: { revistaId: 1 }
      });
    });

    it('debe eliminar todos los artículos si la lista es null', async () => {
      await articuloService.guardarArticulos(1, null);

      expect(mocks.Articulo.destroy).toHaveBeenCalledWith({
        where: { revistaId: 1 }
      });
    });

    it('debe eliminar todos los artículos si la lista es undefined', async () => {
      await articuloService.guardarArticulos(1, undefined);

      expect(mocks.Articulo.destroy).toHaveBeenCalledWith({
        where: { revistaId: 1 }
      });
    });

    it('debe crear artículos nuevos', async () => {
      const nuevoArticulo = crearArticuloMock(1);
      mocks.Articulo.create.mockResolvedValue(nuevoArticulo);

      await articuloService.guardarArticulos(1, [
        { titulo: 'Nuevo Artículo', paginaInicio: 1, paginaFin: 10 }
      ]);

      expect(mocks.Articulo.create).toHaveBeenCalledWith(
        { revistaId: 1, titulo: 'Nuevo Artículo', paginaInicio: 1, paginaFin: 10 },
        {}
      );
    });

    it('debe actualizar artículos existentes', async () => {
      const articuloExistente = crearArticuloMock(5);
      mocks.Articulo.findByPk.mockResolvedValue(articuloExistente);

      await articuloService.guardarArticulos(1, [
        { id: 5, titulo: 'Actualizado', paginaInicio: 1, paginaFin: 15 }
      ]);

      expect(mocks.Articulo.findByPk).toHaveBeenCalledWith(5, {});
      expect(articuloExistente.update).toHaveBeenCalledWith({
        revistaId: 1,
        titulo: 'Actualizado',
        paginaInicio: 1,
        paginaFin: 15
      }, {});
    });

    it('debe crear artículo si el ID del existente no se encuentra en BD', async () => {
      mocks.Articulo.findByPk.mockResolvedValue(null);
      const nuevoArticulo = crearArticuloMock(10);
      mocks.Articulo.create.mockResolvedValue(nuevoArticulo);

      await articuloService.guardarArticulos(1, [
        { id: 99, titulo: 'No existía', paginaInicio: 5, paginaFin: 10 }
      ]);

      expect(mocks.Articulo.findByPk).toHaveBeenCalledWith(99, {});
      expect(mocks.Articulo.create).toHaveBeenCalledWith({
        revistaId: 1,
        titulo: 'No existía',
        paginaInicio: 5,
        paginaFin: 10
      }, {});
    });

    it('debe eliminar artículos que no están en la lista recibida', async () => {
      mocks.Articulo.destroy.mockResolvedValue(1);

      await articuloService.guardarArticulos(1, [
        { id: 1, titulo: 'Conservar', paginaInicio: 1, paginaFin: 5 }
      ]);

      const destroyCall = mocks.Articulo.destroy.mock.calls[0][0];
      expect(destroyCall.where.idArticulo).toBeDefined();
      expect(mocks.Articulo.destroy).toHaveBeenCalledTimes(1);
    });

    it('debe saltar artículos sin título', async () => {
      await articuloService.guardarArticulos(1, [
        { titulo: '', paginaInicio: 1, paginaFin: 5 },
        { titulo: '   ', paginaInicio: 1, paginaFin: 5 }
      ]);

      expect(mocks.Articulo.create).not.toHaveBeenCalled();
    });

    it('debe lanzar error si página final < página de inicio', async () => {
      await expect(articuloService.guardarArticulos(1, [
        { titulo: 'Error', paginaInicio: 20, paginaFin: 10 }
      ])).rejects.toThrow('La página final debe ser mayor o igual a la página de inicio');
    });

    it('debe parsear páginas desde formato "paginas" (ej. "10-20")', async () => {
      const nuevoArticulo = crearArticuloMock(1);
      mocks.Articulo.create.mockResolvedValue(nuevoArticulo);

      await articuloService.guardarArticulos(1, [
        { titulo: 'Con rango', paginas: '15-25' }
      ]);

      expect(mocks.Articulo.create).toHaveBeenCalledWith({
        revistaId: 1,
        titulo: 'Con rango',
        paginaInicio: 15,
        paginaFin: 25
      }, {});
    });

    it('debe asociar autores mediante findOrCreate y setAutores', async () => {
      const articuloMock = crearArticuloMock(1);
      mocks.Articulo.create.mockResolvedValue(articuloMock);
      mocks.Autor.findOrCreate
        .mockResolvedValueOnce([{ idAutor: 1, nombre: 'Juan', apellido: 'Pérez' }, false])
        .mockResolvedValueOnce([{ idAutor: 2, nombre: 'María', apellido: 'García' }, true]);

      await articuloService.guardarArticulos(1, [
        { titulo: 'Con autores', paginaInicio: 1, paginaFin: 10, autores_texto: 'Juan Pérez, María García' }
      ]);

      expect(mocks.Autor.findOrCreate).toHaveBeenCalledTimes(2);
      expect(mocks.Autor.findOrCreate).toHaveBeenCalledWith({
        where: { nombre: 'Juan', apellido: 'Pérez' },
        transaction: null
      });
      expect(articuloMock.setAutores).toHaveBeenCalledWith(
        [{ idAutor: 1, nombre: 'Juan', apellido: 'Pérez' }, { idAutor: 2, nombre: 'María', apellido: 'García' }],
        { transaction: null }
      );
    });

    it('debe usar transacción si se pasa como parámetro', async () => {
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      await articuloService.guardarArticulos(1, [], mockTransaction);

      expect(mocks.Articulo.destroy).toHaveBeenCalledWith({
        where: { revistaId: 1 },
        transaction: mockTransaction
      });
    });

    it('debe soportar un solo artículo (no array)', async () => {
      const nuevoArticulo = crearArticuloMock(1);
      mocks.Articulo.create.mockResolvedValue(nuevoArticulo);

      await articuloService.guardarArticulos(1, { titulo: 'Único', paginaInicio: 1, paginaFin: 5 });

      expect(mocks.Articulo.create).toHaveBeenCalled();
    });
  });

  describe('listarPorRevista', () => {
    it('debe retornar artículos con autores para una revista', async () => {
      const mockArticulos = [
        crearArticuloMock(1, { autores: [{ idAutor: 1, nombre: 'Juan', apellido: 'Pérez' }] }),
        crearArticuloMock(2)
      ];
      mocks.Articulo.findAll.mockResolvedValue(mockArticulos);

      const resultado = await articuloService.listarPorRevista(1);

      expect(mocks.Articulo.findAll).toHaveBeenCalledWith({
        where: { revistaId: 1 },
        include: [{ model: mocks.Autor, as: 'autores', through: { attributes: [] } }]
      });
      expect(resultado).toHaveLength(2);
    });

    it('debe retornar array vacío si no hay artículos', async () => {
      mocks.Articulo.findAll.mockResolvedValue([]);

      const resultado = await articuloService.listarPorRevista(999);

      expect(resultado).toEqual([]);
    });
  });

  describe('obtener', () => {
    it('debe retornar un artículo con autores', async () => {
      const mockArticulo = crearArticuloMock(5, {
        autores: [{ idAutor: 1, nombre: 'Ana', apellido: 'López' }]
      });
      mocks.Articulo.findByPk.mockResolvedValue(mockArticulo);

      const resultado = await articuloService.obtener(5);

      expect(mocks.Articulo.findByPk).toHaveBeenCalledWith(5, {
        include: [{ model: mocks.Autor, as: 'autores', through: { attributes: [] } }]
      });
      expect(resultado.idArticulo).toBe(5);
    });

    it('debe retornar null si el artículo no existe', async () => {
      mocks.Articulo.findByPk.mockResolvedValue(null);

      const resultado = await articuloService.obtener(999);

      expect(resultado).toBeNull();
    });
  });

  describe('eliminar', () => {
    it('debe eliminar un artículo existente', async () => {
      const articuloMock = crearArticuloMock(3);
      mocks.Articulo.findByPk.mockResolvedValue(articuloMock);

      await articuloService.eliminar(3);

      expect(mocks.Articulo.findByPk).toHaveBeenCalledWith(3);
      expect(articuloMock.destroy).toHaveBeenCalled();
    });

    it('debe lanzar error si el artículo no existe', async () => {
      mocks.Articulo.findByPk.mockResolvedValue(null);

      await expect(articuloService.eliminar(999)).rejects.toThrow('Artículo no encontrado');

      expect(mocks.Articulo.findByPk).toHaveBeenCalledWith(999);
    });
  });
});
