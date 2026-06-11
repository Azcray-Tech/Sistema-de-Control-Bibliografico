/**
 * @requirement RF-09
 * @use_case CU-09
 * @description Pruebas unitarias del servicio de categorías con mocks de modelos Sequelize.
 */
const CategoriaService = require('../services/categoria.service');
const { crearMocksModelos, mockAuditoria } = require('./mocks/models');

describe('CategoriaService', () => {
  let categoriaService;
  let mocks;

  beforeEach(() => {
    mocks = crearMocksModelos();
    categoriaService = new CategoriaService(mocks, mockAuditoria);
    mockAuditoria.mockClear();
  });

  describe('listar', () => {
    it('debe retornar lista de categorías con total de materiales', async () => {
      const mockCat = { toJSON: () => ({ idCategoria: 1, nombre: 'Literatura', totalMateriales: 5 }) };
      mocks.Categoria.findAll.mockResolvedValue([mockCat]);

      const result = await categoriaService.listar();

      expect(result).toHaveLength(1);
      expect(result[0].nombre).toBe('Literatura');
      expect(result[0].totalMateriales).toBe(5);
    });
  });

  describe('listarActivas', () => {
    it('debe retornar solo categorías activas', async () => {
      const mockCat = { toJSON: () => ({ idCategoria: 1, nombre: 'Ciencia', activa: true }) };
      mocks.Categoria.findAll.mockResolvedValue([mockCat]);

      const result = await categoriaService.listarActivas();

      expect(result).toHaveLength(1);
      expect(mocks.Categoria.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { activa: true } })
      );
    });
  });

  describe('listarPaginado', () => {
    it('debe retornar página de categorías con paginación', async () => {
      const mockCat = { toJSON: () => ({ idCategoria: 1, nombre: 'Historia' }) };
      mocks.Categoria.count.mockResolvedValue(25);
      mocks.Categoria.findAll.mockResolvedValue([mockCat]);

      const result = await categoriaService.listarPaginado(1);

      expect(result.total).toBe(25);
      expect(result.pagina).toBe(1);
      expect(result.totalPaginas).toBe(3);
      expect(result.categorias).toHaveLength(1);
    });

    it('debe aplicar búsqueda por nombre o descripción', async () => {
      mocks.Categoria.count.mockResolvedValue(1);
      mocks.Categoria.findAll.mockResolvedValue([]);

      await categoriaService.listarPaginado(1, 'test');

      const callArg = mocks.Categoria.count.mock.calls[0][0];
      const whereKeys = Object.getOwnPropertySymbols(callArg.where);
      expect(whereKeys.length).toBeGreaterThan(0);
    });
  });

  describe('guardar', () => {
    it('debe lanzar error si nombre está vacío', async () => {
      await expect(categoriaService.guardar(null, { nombre: '', descripcion: '' }, 1)).rejects.toThrow('El nombre de la categoría es obligatorio');
    });

    it('debe crear una nueva categoría', async () => {
      mocks.Categoria.findOne.mockResolvedValue(null);
      mocks.Categoria.create.mockResolvedValue({ idCategoria: 1, nombre: 'Nueva' });

      const result = await categoriaService.guardar(null, { nombre: 'Nueva', descripcion: 'Desc' }, 1);

      expect(result.idCategoria).toBe(1);
      expect(mockAuditoria).toHaveBeenCalledWith(expect.objectContaining({ accion: 'CREAR_CATEGORIA' }));
    });

    it('debe lanzar error si el nombre ya existe al crear', async () => {
      mocks.Categoria.findOne.mockResolvedValue({ idCategoria: 2 });

      await expect(categoriaService.guardar(null, { nombre: 'Duplicado' }, 1)).rejects.toThrow('Ya existe una categoría con ese nombre');
    });

    it('debe actualizar categoría existente', async () => {
      const mockCat = { idCategoria: 1, update: jest.fn() };
      mocks.Categoria.findByPk.mockResolvedValue(mockCat);
      mocks.Categoria.findOne.mockResolvedValue({ idCategoria: 1 });

      const result = await categoriaService.guardar('1', { nombre: 'Actualizada' }, 1);

      expect(mockCat.update).toHaveBeenCalled();
      expect(mockAuditoria).toHaveBeenCalledWith(expect.objectContaining({ accion: 'ACTUALIZAR_CATEGORIA' }));
    });

    it('debe lanzar error si el nombre ya existe al actualizar (otra categoría)', async () => {
      mocks.Categoria.findByPk.mockResolvedValue({ idCategoria: 1 });
      mocks.Categoria.findOne.mockResolvedValue({ idCategoria: 2 });

      await expect(categoriaService.guardar('1', { nombre: 'Duplicado' }, 1)).rejects.toThrow('Ya existe una categoría con ese nombre');
    });
  });

  describe('desactivar', () => {
    it('debe desactivar categoría sin materiales asociados', async () => {
      const mockCat = { idCategoria: 1, Materials: [], update: jest.fn() };
      mocks.Categoria.findByPk.mockResolvedValue(mockCat);

      await categoriaService.desactivar(1, 1);

      expect(mockCat.update).toHaveBeenCalledWith({ activa: false });
      expect(mockAuditoria).toHaveBeenCalledWith(expect.objectContaining({ accion: 'DESACTIVAR_CATEGORIA' }));
    });

    it('debe lanzar error si la categoría tiene materiales', async () => {
      mocks.Categoria.findByPk.mockResolvedValue({ idCategoria: 1, Materials: [{ idMaterial: 1 }] });

      await expect(categoriaService.desactivar(1, 1)).rejects.toThrow('tiene materiales asociados');
    });

    it('debe lanzar error si categoría no existe', async () => {
      mocks.Categoria.findByPk.mockResolvedValue(null);

      await expect(categoriaService.desactivar(999, 1)).rejects.toThrow('Categoría no encontrada');
    });
  });
});
