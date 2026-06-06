/**
 * @requirement RF-09 (Gestionar categorías)
 * @use_case CU-09
 * @description Pruebas unitarias del servicio de categorías.
 */
const CategoriaService = require('../services/categoria.service');
const { crearMocksModelos, mockAuditoria } = require('./mocks/models');

const crearCategoriaMock = (id = 1, overrides = {}) => ({
  idCategoria: id,
  nombre: 'Categoría ' + id,
  descripcion: 'Descripción',
  activa: true,
  Materials: [],
  toJSON: jest.fn().mockReturnThis(),
  update: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('CategoriaService', () => {
  let categoriaService;
  let mocks;

  beforeEach(() => {
    mocks = crearMocksModelos();
    categoriaService = new CategoriaService(mocks, mockAuditoria);
    mockAuditoria.mockClear();
  });

  describe('listar', () => {
    it('debe retornar todas las categorías con total de materiales', async () => {
      const mockCategorias = [crearCategoriaMock(1), crearCategoriaMock(2)];
      mocks.Categoria.findAll.mockResolvedValue(mockCategorias);

      const resultado = await categoriaService.listar();

      expect(mocks.Categoria.findAll).toHaveBeenCalledWith({
        include: [{ model: mocks.Material, attributes: [] }],
        attributes: {
          include: [[mocks.Categoria.sequelize.fn('COUNT', mocks.Categoria.sequelize.col('Materials.id_material')), 'totalMateriales']]
        },
        group: ['Categoria.id_categoria'],
        order: [['nombre', 'ASC']]
      });
      expect(resultado).toHaveLength(2);
    });

    it('debe retornar array vacío si no hay categorías', async () => {
      mocks.Categoria.findAll.mockResolvedValue([]);
      const resultado = await categoriaService.listar();
      expect(resultado).toEqual([]);
    });
  });

  describe('listarPaginado', () => {
    it('debe retornar categorías paginadas', async () => {
      const mockCategorias = [crearCategoriaMock(1)];
      mocks.Categoria.count.mockResolvedValue(1);
      mocks.Categoria.findAll.mockResolvedValue(mockCategorias);

      const resultado = await categoriaService.listarPaginado(1);

      expect(resultado.categorias).toHaveLength(1);
      expect(resultado.total).toBe(1);
      expect(resultado.pagina).toBe(1);
    });

    it('debe aplicar búsqueda si se proporciona', async () => {
      mocks.Categoria.count.mockResolvedValue(0);
      mocks.Categoria.findAll.mockResolvedValue([]);

      await categoriaService.listarPaginado(1, 'test');

      const countArgs = mocks.Categoria.count.mock.calls[0][0];
      expect(countArgs.where).toBeDefined();
    });
  });

  describe('listarActivas', () => {
    it('debe retornar solo categorías activas', async () => {
      const mockCategorias = [crearCategoriaMock(1)];
      mocks.Categoria.findAll.mockResolvedValue(mockCategorias);

      const resultado = await categoriaService.listarActivas();

      expect(mocks.Categoria.findAll).toHaveBeenCalledWith({
        where: { activa: true },
        include: [{ model: mocks.Material, attributes: [] }],
        attributes: {
          include: [[mocks.Categoria.sequelize.fn('COUNT', mocks.Categoria.sequelize.col('Materials.id_material')), 'totalMateriales']]
        },
        group: ['Categoria.id_categoria'],
        order: [['nombre', 'ASC']]
      });
      expect(resultado).toHaveLength(1);
    });
  });

  describe('guardar', () => {
    it('debe crear una nueva categoría', async () => {
      mocks.Categoria.findOne.mockResolvedValue(null);
      const mockCategoria = crearCategoriaMock(1);
      mocks.Categoria.create.mockResolvedValue(mockCategoria);

      const resultado = await categoriaService.guardar(null, { nombre: 'Nueva', descripcion: 'Desc' }, 1);

      expect(mocks.Categoria.create).toHaveBeenCalledWith({ nombre: 'Nueva', descripcion: 'Desc', activa: true });
      expect(mockAuditoria).toHaveBeenCalledWith({
        usuarioId: 1, accion: 'CREAR_CATEGORIA', tablaAfectada: 'categoria', registroId: 1
      });
      expect(resultado).toBe(mockCategoria);
    });

    it('debe actualizar una categoría existente', async () => {
      const mockCategoria = crearCategoriaMock(5);
      mocks.Categoria.findByPk.mockResolvedValue(mockCategoria);
      mocks.Categoria.findOne.mockResolvedValue(null);

      const resultado = await categoriaService.guardar(5, { nombre: 'Actualizada', descripcion: 'Nueva desc' }, 1);

      expect(mocks.Categoria.findByPk).toHaveBeenCalledWith(5);
      expect(mockCategoria.update).toHaveBeenCalledWith({ nombre: 'Actualizada', descripcion: 'Nueva desc' });
      expect(mockAuditoria).toHaveBeenCalledWith({
        usuarioId: 1, accion: 'ACTUALIZAR_CATEGORIA', tablaAfectada: 'categoria', registroId: 5
      });
      expect(resultado).toBe(mockCategoria);
    });

    it('debe lanzar error si el nombre está vacío', async () => {
      await expect(categoriaService.guardar(null, { nombre: '', descripcion: '' }, 1))
        .rejects.toThrow('El nombre de la categoría es obligatorio');
    });

    it('debe lanzar error si el nombre ya existe en creación', async () => {
      mocks.Categoria.findOne.mockResolvedValue(crearCategoriaMock(1));

      await expect(categoriaService.guardar(null, { nombre: 'Duplicado', descripcion: '' }, 1))
        .rejects.toThrow('Ya existe una categoría con ese nombre');
    });

    it('debe lanzar error si la categoría no existe en actualización', async () => {
      mocks.Categoria.findByPk.mockResolvedValue(null);

      await expect(categoriaService.guardar(99, { nombre: 'No existe', descripcion: '' }, 1))
        .rejects.toThrow('Categoría no encontrada');
    });

    it('debe lanzar error si otra categoría ya tiene el nombre en actualización', async () => {
      const mockCategoria = crearCategoriaMock(5);
      mocks.Categoria.findByPk.mockResolvedValue(mockCategoria);
      const duplicado = crearCategoriaMock(10);
      duplicado.idCategoria = 10;
      mocks.Categoria.findOne.mockResolvedValue(duplicado);

      await expect(categoriaService.guardar(5, { nombre: 'Duplicado', descripcion: '' }, 1))
        .rejects.toThrow('Ya existe una categoría con ese nombre');
    });
  });

  describe('desactivar', () => {
    it('debe desactivar una categoría sin materiales', async () => {
      const mockCategoria = crearCategoriaMock(1);
      mocks.Categoria.findByPk.mockResolvedValue(mockCategoria);

      await categoriaService.desactivar(1, 1);

      expect(mocks.Categoria.findByPk).toHaveBeenCalledWith(1, {
        include: [{ model: mocks.Material, required: false }]
      });
      expect(mockCategoria.update).toHaveBeenCalledWith({ activa: false });
      expect(mockAuditoria).toHaveBeenCalledWith({
        usuarioId: 1, accion: 'DESACTIVAR_CATEGORIA', tablaAfectada: 'categoria', registroId: 1
      });
    });

    it('debe lanzar error si la categoría tiene materiales asociados', async () => {
      const mockCategoria = crearCategoriaMock(1, { Materials: [{ idMaterial: 1 }] });
      mocks.Categoria.findByPk.mockResolvedValue(mockCategoria);

      await expect(categoriaService.desactivar(1, 1))
        .rejects.toThrow('No se puede desactivar la categoría porque tiene materiales asociados');
    });

    it('debe lanzar error si la categoría no existe', async () => {
      mocks.Categoria.findByPk.mockResolvedValue(null);

      await expect(categoriaService.desactivar(999, 1))
        .rejects.toThrow('Categoría no encontrada');
    });
  });
});
