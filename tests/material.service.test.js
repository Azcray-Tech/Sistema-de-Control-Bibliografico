/**
 * @requirement RF-01 (Catalogar Material), RF-04 (Validar ISBN/ISSN)
 * @use_case CU-01, CU-04
 * @description Pruebas unitarias del servicio de materiales con mocks de modelos Sequelize.
 */
const MaterialService = require('../services/material.service');
const { crearMocksModelos, mockAuditoria } = require('./mocks/models');

describe('MaterialService', () => {
  let materialService;
  let mocks;

  beforeEach(() => {
    mocks = crearMocksModelos();
    materialService = new MaterialService(mocks, mockAuditoria);
    mockAuditoria.mockClear();
  });

  describe('validarISBN', () => {
    it('debe aceptar ISBN-13 válido', () => {
      expect(materialService.validarISBN('978-3-16-148410-0')).toBe(true);
    });

    it('debe rechazar ISBN-13 inválido', () => {
      expect(materialService.validarISBN('978-3-16-148410-1')).toBe(false);
    });

    it('debe aceptar ISBN-10 válido', () => {
      expect(materialService.validarISBN('0-306-40615-2')).toBe(true);
    });

    it('debe retornar true si isbn es null/undefined', () => {
      expect(materialService.validarISBN(null)).toBe(true);
      expect(materialService.validarISBN(undefined)).toBe(true);
    });
  });

  describe('validarISSN', () => {
    it('debe aceptar ISSN con formato correcto', () => {
      expect(materialService.validarISSN('1234-5679')).toBe(true);
    });

    it('debe rechazar ISSN sin guión', () => {
      expect(materialService.validarISSN('12345679')).toBe(false);
    });

    it('debe retornar true si issn es null/undefined', () => {
      expect(materialService.validarISSN(null)).toBe(true);
    });
  });

  describe('listar', () => {
    it('debe retornar lista paginada de materiales', async () => {
      mocks.Material.findAndCountAll.mockResolvedValue({
        rows: [{ idMaterial: 1, titulo: 'Test', tipo: 'libro' }],
        count: 1
      });

      const resultado = await materialService.listar(1, '');
      expect(resultado.materiales).toHaveLength(1);
      expect(resultado.total).toBe(1);
      expect(resultado.pagina).toBe(1);
      expect(resultado.totalPaginas).toBe(1);
    });

    it('debe usar página 1 si no se especifica', async () => {
      mocks.Material.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      await materialService.listar(undefined, '');
      expect(mocks.Material.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0 })
      );
    });

    it('debe filtrar por tipo cuando se especifica', async () => {
      mocks.Material.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      await materialService.listar(1, 'libro');
      expect(mocks.Material.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tipo: 'libro' })
        })
      );
    });
  });

  describe('crear', () => {
    it('debe lanzar error si falta el título', async () => {
      await expect(materialService.crear({ tipo: 'libro' }, 1)).rejects.toThrow('El título es obligatorio');
    });

    it('debe lanzar error si ISBN es inválido para tipo libro', async () => {
      await expect(materialService.crear({
        titulo: 'Test',
        tipo: 'libro',
        libro: { isbn: '000' }
      }, 1)).rejects.toThrow('ISBN inválido');
    });

    it('debe crear material exitosamente', async () => {
      const mockMaterial = { idMaterial: 1, titulo: 'Test Libro', tipo: 'libro' };
      mocks.Material.create.mockResolvedValue(mockMaterial);
      mocks.Autor.findOrCreate.mockResolvedValue([{ idAutor: 1, nombre: 'Autor', apellido: 'Uno' }]);
      mockMaterial.setAutores = jest.fn().mockResolvedValue(undefined);

      const resultado = await materialService.crear({
        titulo: 'Test Libro',
        tipo: 'libro',
        libro: { isbn: '978-3-16-148410-0', editorial: 'Test' },
        autores: [{ nombre: 'Autor', apellido: 'Uno' }],
        ejemplaresNuevos: [{ identificadorUnico: 'E-001' }]
      }, 1);

      expect(resultado.idMaterial).toBe(1);
      expect(mocks.Libro.create).toHaveBeenCalled();
      expect(mocks.Ejemplar.bulkCreate).toHaveBeenCalled();
      expect(mockAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'CREAR_MATERIAL', usuarioId: 1, registroId: 1 })
      );
    });

    it('debe preparar subtipos desde body plano del formulario', async () => {
      const mockMaterial = { idMaterial: 2, titulo: 'Test Revista', tipo: 'revista' };
      mocks.Material.create.mockResolvedValue(mockMaterial);

      await materialService.crear({
        titulo: 'Test Revista',
        tipo: 'revista',
        issn: '1234-5679',
        volumen: '10',
        numero: '2',
        fechaPublicacion: '2024-01-01',
        autores: [],
        ejemplaresNuevos: []
      }, 1);

      expect(mocks.Revista.create).toHaveBeenCalledWith(
        expect.objectContaining({ issn: '1234-5679', volumen: '10' }),
        expect.any(Object)
      );
      expect(mockAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'CREAR_MATERIAL', usuarioId: 1 })
      );
    });
  });

  describe('agregarEjemplares', () => {
    it('debe lanzar error si material no existe', async () => {
      mocks.Material.findByPk.mockResolvedValue(null);
      await expect(materialService.agregarEjemplares(999, ['E-001'], 1)).rejects.toThrow('Material no encontrado');
    });

    it('debe lanzar error si hay identificadores duplicados', async () => {
      mocks.Material.findByPk.mockResolvedValue({ idMaterial: 1 });
      mocks.Ejemplar.findAll.mockResolvedValue([{ identificadorUnico: 'E-001' }]);

      await expect(materialService.agregarEjemplares(1, ['E-001'], 1)).rejects.toThrow('ya existen');
    });

    it('debe crear ejemplares y registrar auditoría', async () => {
      mocks.Material.findByPk.mockResolvedValue({ idMaterial: 1 });
      mocks.Ejemplar.findAll.mockResolvedValue([]);
      mocks.Ejemplar.bulkCreate.mockResolvedValue([{ idEjemplar: 2 }, { idEjemplar: 3 }]);

      const resultado = await materialService.agregarEjemplares(1, ['E-010', 'E-011'], 1);

      expect(mocks.Ejemplar.bulkCreate).toHaveBeenCalled();
      expect(mockAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'AGREGAR_EJEMPLARES' })
      );
      expect(resultado).toHaveLength(2);
    });
  });

  describe('actualizar', () => {
    it('debe rechazar cambio de título si hay préstamos activos', async () => {
      const mockMaterial = {
        idMaterial: 1, titulo: 'Original', signatura: 'S-001',
        ejemplares: [{ idEjemplar: 1, update: jest.fn() }],
        update: jest.fn()
      };
      mocks.Material.findByPk.mockResolvedValue(mockMaterial);
      mocks.Prestamo.findOne.mockResolvedValue({ idPrestamo: 1 });

      await expect(materialService.actualizar(1, {
        titulo: 'Nuevo Título',
        tipo: 'libro'
      }, 1)).rejects.toThrow('No se puede modificar el título porque hay ejemplares prestados');
    });

    it('debe permitir cambios si no hay préstamos activos', async () => {
      const mockLibroInst = { update: jest.fn().mockResolvedValue(undefined) };
      const mockMaterial = {
        idMaterial: 1, titulo: 'Original', signatura: 'S-001',
        ejemplares: [{ idEjemplar: 1, update: jest.fn() }],
        update: jest.fn()
      };
      mocks.Material.findByPk.mockResolvedValue(mockMaterial);
      mocks.Prestamo.findOne.mockResolvedValue(null);
      mocks.Libro.findOrCreate.mockResolvedValue([mockLibroInst, true]);

      await materialService.actualizar(1, {
        titulo: 'Nuevo Título',
        tipo: 'libro',
        libro: { isbn: '978-3-16-148410-0', editorial: 'Test' }
      }, 1);

      expect(mockMaterial.update).toHaveBeenCalled();
      expect(mockLibroInst.update).toHaveBeenCalledWith(
        expect.objectContaining({ isbn: '978-3-16-148410-0' }),
        expect.any(Object)
      );
      expect(mockAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'ACTUALIZAR_MATERIAL', usuarioId: 1, registroId: 1,
          valorAnterior: expect.objectContaining({ titulo: 'Original' })
        })
      );
    });
  });

  describe('eliminar', () => {
    it('debe lanzar error si material no existe', async () => {
      mocks.Material.findByPk.mockResolvedValue(null);
      await expect(materialService.eliminar(999, 1)).rejects.toThrow('Material no encontrado');
    });

    it('debe lanzar error si hay préstamos activos', async () => {
      mocks.Material.findByPk.mockResolvedValue({
        idMaterial: 1,
        ejemplares: [{ idEjemplar: 1 }]
      });
      mocks.Prestamo.findOne.mockResolvedValue({ idPrestamo: 1 });

      await expect(materialService.eliminar(1, 1)).rejects.toThrow('No se puede eliminar el material porque tiene ejemplares con préstamos activos');
    });

    it('debe eliminar material y sus ejemplares, y registrar auditoría', async () => {
      const mockEjem = { idEjemplar: 1 };
      const mockMaterial = {
        idMaterial: 1,
        ejemplares: [mockEjem],
        setAutores: jest.fn().mockResolvedValue(undefined),
        destroy: jest.fn().mockResolvedValue(undefined)
      };
      mocks.Material.findByPk.mockResolvedValue(mockMaterial);
      mocks.Prestamo.findOne.mockResolvedValue(null);

      await materialService.eliminar(1, 1);

      expect(mockMaterial.setAutores).toHaveBeenCalledWith([]);
      expect(mocks.Ejemplar.destroy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { materialId: 1 } })
      );
      expect(mockMaterial.destroy).toHaveBeenCalled();
      expect(mockAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'BAJA_MATERIAL' })
      );
    });
  });
});
