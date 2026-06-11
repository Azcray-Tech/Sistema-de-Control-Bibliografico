/**
 * @requirement RF-05 (Gestionar artículos de revista)
 * @use_case CU-05
 * @description Pruebas unitarias del servicio de artículos con mocks Sequelize.
 */
const ArticuloService = require('../services/articulo.service');
const { crearMocksModelos, mockAuditoria } = require('./mocks/models');

describe('ArticuloService', () => {
  let articuloService;
  let mocks;

  beforeEach(() => {
    mocks = crearMocksModelos();
    articuloService = new ArticuloService(mocks, mockAuditoria);
    mockAuditoria.mockClear();
  });

  describe('_paginaInicio', () => {
    it('debe usar paginaInicio si está definido', () => {
      expect(articuloService._paginaInicio('15', '20-30')).toBe(15);
    });

    it('debe extraer inicio de paginas si paginaInicio está vacío', () => {
      expect(articuloService._paginaInicio('', '20-30')).toBe(20);
    });

    it('debe retornar null si no hay información', () => {
      expect(articuloService._paginaInicio('', '')).toBeNull();
    });
  });

  describe('_paginaFin', () => {
    it('debe usar paginaFin si está definido', () => {
      expect(articuloService._paginaFin('30', '20-30')).toBe(30);
    });

    it('debe extraer fin de paginas si paginaFin está vacío', () => {
      expect(articuloService._paginaFin('', '20-30')).toBe(30);
    });

    it('debe retornar null si paginas no tiene rango', () => {
      expect(articuloService._paginaFin('', '20')).toBeNull();
    });
  });

  describe('_parsearPaginas', () => {
    it('debe lanzar error si fin < inicio', () => {
      expect(() => articuloService._parsearPaginas('10-5', '', ''))
        .toThrow('La página final debe ser mayor o igual a la página de inicio');
    });

    it('debe retornar valores parseados correctamente', () => {
      const result = articuloService._parsearPaginas('10-20', '', '');
      expect(result).toEqual({ paginaInicio: 10, paginaFin: 20 });
    });
  });

  describe('listarPorRevista', () => {
    it('debe retornar artículos de una revista', async () => {
      mocks.Articulo.findAll.mockResolvedValue([
        { idArticulo: 1, titulo: 'Artículo 1', autores: [] }
      ]);

      const result = await articuloService.listarPorRevista(1);

      expect(mocks.Articulo.findAll).toHaveBeenCalledWith({
        where: { revistaId: 1 },
        include: [{ model: mocks.Autor, as: 'autores', through: { attributes: [] } }]
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('obtener', () => {
    it('debe retornar artículo con autores', async () => {
      mocks.Articulo.findByPk.mockResolvedValue({ idArticulo: 1, titulo: 'Test', autores: [] });

      const result = await articuloService.obtener(1);

      expect(mocks.Articulo.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(result.titulo).toBe('Test');
    });
  });

  describe('eliminar', () => {
    it('debe eliminar artículo existente', async () => {
      const mockArticulo = { destroy: jest.fn().mockResolvedValue(undefined) };
      mocks.Articulo.findByPk.mockResolvedValue(mockArticulo);

      await articuloService.eliminar(1);

      expect(mockArticulo.destroy).toHaveBeenCalled();
    });

    it('debe lanzar error si artículo no existe', async () => {
      mocks.Articulo.findByPk.mockResolvedValue(null);

      await expect(articuloService.eliminar(999)).rejects.toThrow('Artículo no encontrado');
    });
  });

  describe('guardarArticulos', () => {
    it('debe eliminar todos los artículos si array vacío', async () => {
      await articuloService.guardarArticulos(1, []);

      expect(mocks.Articulo.destroy).toHaveBeenCalledWith({ where: { revistaId: 1 } });
    });

    it('debe crear nuevo artículo', async () => {
      const mockArticulo = {
        idArticulo: 1,
        setAutores: jest.fn().mockResolvedValue(undefined)
      };
      mocks.Articulo.create.mockResolvedValue(mockArticulo);
      mocks.Autor.findOrCreate.mockResolvedValue([{ idAutor: 1, nombre: 'Juan', apellido: 'Perez' }]);

      await articuloService.guardarArticulos(1, [{
        titulo: 'Nuevo Artículo', paginas: '10-20',
        autores_texto: 'Juan Perez'
      }]);

      expect(mocks.Articulo.create).toHaveBeenCalledWith(
        expect.objectContaining({ titulo: 'Nuevo Artículo', paginaInicio: 10, paginaFin: 20 })
      );
      expect(mockArticulo.setAutores).toHaveBeenCalled();
    });

    it('debe actualizar artículo existente', async () => {
      const mockArticulo = { idArticulo: 1, update: jest.fn().mockResolvedValue(undefined) };
      mocks.Articulo.findByPk.mockResolvedValue(mockArticulo);

      await articuloService.guardarArticulos(1, [{
        id: '1', titulo: 'Actualizado', paginas: '1-10'
      }]);

      expect(mockArticulo.update).toHaveBeenCalledWith(
        expect.objectContaining({ titulo: 'Actualizado' })
      );
    });

    it('debe eliminar artículos remotos no incluidos en la lista', async () => {
      mocks.Articulo.findByPk.mockResolvedValue({ idArticulo: 2, update: jest.fn() });

      await articuloService.guardarArticulos(1, [
        { id: '2', titulo: 'Conservar', paginas: '1-5' }
      ]);

      expect(mocks.Articulo.destroy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            revistaId: 1,
            idArticulo: { [mocks.Articulo.sequelize.constructor.Op.notIn]: [2] }
          })
        })
      );
    });

    it('debe ignorar artículo sin título', async () => {
      await articuloService.guardarArticulos(1, [{ titulo: '', paginas: '1-5' }]);

      expect(mocks.Articulo.create).not.toHaveBeenCalled();
    });

    it('debe crear artículo si id no se encuentra en BD al actualizar', async () => {
      mocks.Articulo.findByPk.mockResolvedValue(null);
      mocks.Articulo.create.mockResolvedValue({ idArticulo: 3, titulo: 'Nuevo desde id' });

      await articuloService.guardarArticulos(1, [{
        id: '999', titulo: 'Nuevo desde id', paginas: '1-5'
      }]);

      expect(mocks.Articulo.create).toHaveBeenCalled();
    });
  });

  describe('_asociarAutores', () => {
    it('debe asociar autores por nombre completo', async () => {
      const mockArticulo = { setAutores: jest.fn().mockResolvedValue(undefined) };
      mocks.Autor.findOrCreate.mockResolvedValue([{ idAutor: 1, nombre: 'Juan', apellido: 'Perez' }]);

      await articuloService._asociarAutores(mockArticulo, 'Juan Perez');

      expect(mocks.Autor.findOrCreate).toHaveBeenCalledWith({
        where: { nombre: 'Juan', apellido: 'Perez' }
      });
      expect(mockArticulo.setAutores).toHaveBeenCalledWith([{ idAutor: 1, nombre: 'Juan', apellido: 'Perez' }]);
    });

    it('debe ignorar si autoresTexto está vacío', async () => {
      const mockArticulo = { setAutores: jest.fn() };
      await articuloService._asociarAutores(mockArticulo, '');
      expect(mockArticulo.setAutores).not.toHaveBeenCalled();
    });
  });
});
