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

  describe('_prepararDatosSubtipo', () => {
    it('debe convertir fechaPublicacion vacía a null para revista', async () => {
      const mockMaterial = { idMaterial: 3, titulo: 'Revista Test', tipo: 'revista' };
      mocks.Material.create.mockResolvedValue(mockMaterial);
      mocks.Revista.create.mockResolvedValue({ idRevista: 1 });

      await materialService.crear({
        titulo: 'Revista Test',
        tipo: 'revista',
        issn: '1234-5679',
        volumen: '1',
        numero: '1',
        fechaPublicacion: '',
        ejemplaresNuevos: []
      }, 1);

      expect(mocks.Revista.create).toHaveBeenCalledWith(
        expect.objectContaining({ fechaPublicacion: null }),
        expect.any(Object)
      );
    });

    it('debe crear material tipo tesis cuando se proporciona tutor', async () => {
      const mockMaterial = { idMaterial: 4, titulo: 'Tesis Test', tipo: 'tesis' };
      mocks.Material.create.mockResolvedValue(mockMaterial);
      mocks.Tesis.create.mockResolvedValue({ idTesis: 1 });

      await materialService.crear({
        titulo: 'Tesis Test',
        tipo: 'tesis',
        tutor: 'Dr. Pérez',
        gradoAcademico: 'Maestría',
        institucion: 'UNAM',
        ejemplaresNuevos: []
      }, 1);

      expect(mocks.Tesis.create).toHaveBeenCalledWith(
        expect.objectContaining({ tutor: 'Dr. Pérez' }),
        expect.any(Object)
      );
    });

    it('debe crear material tipo anuario cuando se proporciona anioEdicion', async () => {
      const mockMaterial = { idMaterial: 5, titulo: 'Anuario Test', tipo: 'anuario' };
      mocks.Material.create.mockResolvedValue(mockMaterial);
      mocks.Anuario.create.mockResolvedValue({ idAnuario: 1 });

      await materialService.crear({
        titulo: 'Anuario Test',
        tipo: 'anuario',
        anioEdicion: '2024',
        ejemplaresNuevos: []
      }, 1);

      expect(mocks.Anuario.create).toHaveBeenCalledWith(
        expect.objectContaining({ anioEdicion: '2024' }),
        expect.any(Object)
      );
    });

    it('debe parsear ejemplaresNuevos cuando es un string JSON', async () => {
      const mockMaterial = { idMaterial: 6, titulo: 'Test JSON', tipo: 'libro' };
      mocks.Material.create.mockResolvedValue(mockMaterial);

      await materialService.crear({
        titulo: 'Test JSON',
        tipo: 'libro',
        isbn: '978-3-16-148410-0',
        editorial: 'Test',
        ejemplaresNuevos: '["E-001","E-002"]',
        autores: []
      }, 1);

      expect(mocks.Ejemplar.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ identificadorUnico: 'E-001' }),
          expect.objectContaining({ identificadorUnico: 'E-002' })
        ]),
        expect.any(Object)
      );
    });

    it('debe usar arreglo vacío por defecto cuando no hay ejemplaresNuevos', async () => {
      const mockMaterial = { idMaterial: 7, titulo: 'Anuario Sin Ejemplares', tipo: 'anuario' };
      mocks.Material.create.mockResolvedValue(mockMaterial);
      mocks.Anuario.create.mockResolvedValue({ idAnuario: 1 });

      await materialService.crear({
        titulo: 'Anuario Sin Ejemplares',
        tipo: 'anuario',
        anioEdicion: '2024'
      }, 1);

      expect(mocks.Ejemplar.bulkCreate).not.toHaveBeenCalled();
    });
  });

  describe('listar con búsqueda', () => {
    it('debe incluir Op.or cuando se proporciona search', async () => {
      mocks.Material.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      await materialService.listar(1, '', 'test');
      expect(mocks.Material.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [mocks.Material.sequelize.constructor.Op.or]: expect.any(Array)
          })
        })
      );
    });
  });

  describe('obtener', () => {
    it('debe retornar material por id con includes completos', async () => {
      const mockMaterial = { idMaterial: 1, titulo: 'Test' };
      mocks.Material.findByPk.mockResolvedValue(mockMaterial);

      const resultado = await materialService.obtener(1);
      expect(resultado).toEqual(mockMaterial);
      expect(mocks.Material.findByPk).toHaveBeenCalledWith(1, expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({ model: mocks.Categoria }),
          expect.objectContaining({ model: mocks.Libro, as: 'libro' })
        ])
      }));
    });

    it('debe retornar null cuando no existe', async () => {
      mocks.Material.findByPk.mockResolvedValue(null);
      const resultado = await materialService.obtener(999);
      expect(resultado).toBeNull();
    });
  });

  describe('crear - validaciones y variantes', () => {
    it('debe lanzar error si ISSN es inválido para revista', async () => {
      await expect(materialService.crear({
        titulo: 'Revista Test',
        tipo: 'revista',
        revista: { issn: '12345' }
      }, 1)).rejects.toThrow('ISSN inválido');
    });

    it('debe lanzar error si falta tutor para tesis', async () => {
      await expect(materialService.crear({
        titulo: 'Tesis Test',
        tipo: 'tesis'
      }, 1)).rejects.toThrow('El tutor es obligatorio');
    });

    it('debe crear revista con artículos', async () => {
      const mockArticuloService = { guardarArticulos: jest.fn().mockResolvedValue(undefined) };
      const serviceConArticulos = new MaterialService(mocks, mockAuditoria, mockArticuloService);
      const mockMaterial = { idMaterial: 8, titulo: 'Revista con Artículos', tipo: 'revista' };
      const mockRevista = { idRevista: 1 };
      mocks.Material.create.mockResolvedValue(mockMaterial);
      mocks.Revista.create.mockResolvedValue(mockRevista);

      await serviceConArticulos.crear({
        titulo: 'Revista con Artículos',
        tipo: 'revista',
        issn: '1234-5679',
        volumen: '1',
        numero: '1',
        fechaPublicacion: '2024-01-01',
        articulos: [{ titulo: 'Art 1' }],
        ejemplaresNuevos: []
      }, 1);

      expect(mockArticuloService.guardarArticulos).toHaveBeenCalledWith(
        1, [{ titulo: 'Art 1' }], expect.any(Object)
      );
    });

    it('debe crear tesis exitosamente', async () => {
      const mockMaterial = { idMaterial: 9, titulo: 'Tesis Exitosa', tipo: 'tesis' };
      mocks.Material.create.mockResolvedValue(mockMaterial);
      mocks.Tesis.create.mockResolvedValue({ idTesis: 1 });

      await materialService.crear({
        titulo: 'Tesis Exitosa',
        tipo: 'tesis',
        tutor: 'Dr. López',
        gradoAcademico: 'Doctorado',
        institucion: 'UNAM',
        ejemplaresNuevos: []
      }, 1);

      expect(mocks.Tesis.create).toHaveBeenCalledWith(
        expect.objectContaining({ tutor: 'Dr. López' }),
        expect.any(Object)
      );
      expect(mockAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'CREAR_MATERIAL' })
      );
    });

    it('debe crear anuario exitosamente', async () => {
      const mockMaterial = { idMaterial: 10, titulo: 'Anuario Exitosa', tipo: 'anuario' };
      mocks.Material.create.mockResolvedValue(mockMaterial);
      mocks.Anuario.create.mockResolvedValue({ idAnuario: 1 });

      await materialService.crear({
        titulo: 'Anuario Exitosa',
        tipo: 'anuario',
        anioEdicion: '2025',
        ejemplaresNuevos: []
      }, 1);

      expect(mocks.Anuario.create).toHaveBeenCalledWith(
        expect.objectContaining({ anioEdicion: '2025' }),
        expect.any(Object)
      );
      expect(mockAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'CREAR_MATERIAL' })
      );
    });

    it('debe hacer rollback de la transacción si falla la creación', async () => {
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      mocks.Material.sequelize.transaction.mockResolvedValue(mockTransaction);
      mocks.Material.create.mockRejectedValue(new Error('Error DB'));

      await expect(materialService.crear({
        titulo: 'Test',
        tipo: 'libro',
        libro: { isbn: '978-3-16-148410-0', editorial: 'Test' }
      }, 1)).rejects.toThrow('Error DB');

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('actualizar - validaciones y variantes', () => {
    it('debe lanzar error si falta tutor al actualizar tesis', async () => {
      await expect(materialService.actualizar(1, {
        titulo: 'Test',
        tipo: 'tesis'
      }, 1)).rejects.toThrow('El tutor es obligatorio');
    });

    it('debe lanzar error si ISBN ya está registrado en otro material', async () => {
      const mockMaterial = {
        idMaterial: 1, titulo: 'Original', signatura: 'S-001',
        ejemplares: [],
        update: jest.fn()
      };
      mocks.Material.findByPk.mockResolvedValue(mockMaterial);
      mocks.Libro.findOne.mockResolvedValue({ materialId: 2 });

      await expect(materialService.actualizar(1, {
        titulo: 'Original',
        tipo: 'libro',
        libro: { isbn: '978-3-16-148410-0', editorial: 'Test' }
      }, 1)).rejects.toThrow('ya está registrado para otro material');
    });

    it('debe lanzar error si ISSN ya está registrado en otra revista', async () => {
      const mockMaterial = {
        idMaterial: 1, titulo: 'Original', signatura: 'S-001',
        ejemplares: [],
        update: jest.fn()
      };
      mocks.Material.findByPk.mockResolvedValue(mockMaterial);
      mocks.Revista.findOne.mockResolvedValue({ materialId: 2 });

      await expect(materialService.actualizar(1, {
        titulo: 'Original',
        tipo: 'revista',
        revista: { issn: '1234-5679', volumen: '1', numero: '1', fechaPublicacion: '2024-01-01' }
      }, 1)).rejects.toThrow('ya está registrado para otra revista');
    });

    it('debe lanzar error al cambiar signatura si hay préstamos activos', async () => {
      const mockMaterial = {
        idMaterial: 1, titulo: 'Original', signatura: 'S-001',
        ejemplares: [{ idEjemplar: 1 }],
        update: jest.fn()
      };
      mocks.Material.findByPk.mockResolvedValue(mockMaterial);
      mocks.Prestamo.findOne.mockResolvedValue({ idPrestamo: 1 });

      await expect(materialService.actualizar(1, {
        titulo: 'Original',
        tipo: 'libro',
        signatura: 'S-002'
      }, 1)).rejects.toThrow('No se puede modificar la signatura porque hay ejemplares prestados');
    });

    it('debe actualizar revista y guardar artículos cuando hay articuloService', async () => {
      const mockArticuloService = { guardarArticulos: jest.fn().mockResolvedValue(undefined) };
      const serviceConArticulos = new MaterialService(mocks, mockAuditoria, mockArticuloService);
      const mockRevistaInst = { idRevista: 1, update: jest.fn().mockResolvedValue(undefined) };
      const mockMaterial = {
        idMaterial: 1, titulo: 'Revista', signatura: 'S-001',
        ejemplares: [],
        update: jest.fn()
      };
      mocks.Material.findByPk.mockResolvedValue(mockMaterial);
      mocks.Prestamo.findOne.mockResolvedValue(null);
      mocks.Revista.findOrCreate.mockResolvedValue([mockRevistaInst, false]);

      await serviceConArticulos.actualizar(1, {
        titulo: 'Revista Actualizada',
        tipo: 'revista',
        revista: { issn: '1234-5679', volumen: '1', numero: '1', fechaPublicacion: '2024-01-01' },
        articulos: [{ titulo: 'Artículo 1' }]
      }, 1);

      expect(mockRevistaInst.update).toHaveBeenCalled();
      expect(mockArticuloService.guardarArticulos).toHaveBeenCalledWith(
        mockRevistaInst.idRevista,
        [{ titulo: 'Artículo 1' }],
        expect.any(Object)
      );
    });

    it('debe actualizar tesis correctamente', async () => {
      const mockTesisInst = { update: jest.fn().mockResolvedValue(undefined) };
      const mockMaterial = {
        idMaterial: 1, titulo: 'Tesis Original', signatura: 'S-001',
        ejemplares: [],
        update: jest.fn()
      };
      mocks.Material.findByPk.mockResolvedValue(mockMaterial);
      mocks.Prestamo.findOne.mockResolvedValue(null);
      mocks.Tesis.findOrCreate.mockResolvedValue([mockTesisInst, false]);

      await materialService.actualizar(1, {
        titulo: 'Tesis Actualizada',
        tipo: 'tesis',
        tesis: { tutor: 'Dr. Pérez', gradoAcademico: 'Maestría', institucion: 'UNAM' }
      }, 1);

      expect(mocks.Tesis.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { materialId: 1 } })
      );
      expect(mockTesisInst.update).toHaveBeenCalledWith(
        expect.objectContaining({ tutor: 'Dr. Pérez' }),
        expect.any(Object)
      );
    });

    it('debe actualizar anuario correctamente', async () => {
      const mockAnuarioInst = { update: jest.fn().mockResolvedValue(undefined) };
      const mockMaterial = {
        idMaterial: 1, titulo: 'Anuario Original', signatura: 'S-001',
        ejemplares: [],
        update: jest.fn()
      };
      mocks.Material.findByPk.mockResolvedValue(mockMaterial);
      mocks.Prestamo.findOne.mockResolvedValue(null);
      mocks.Anuario.findOrCreate.mockResolvedValue([mockAnuarioInst, false]);

      await materialService.actualizar(1, {
        titulo: 'Anuario Actualizado',
        tipo: 'anuario',
        anuario: { anioEdicion: '2025' }
      }, 1);

      expect(mocks.Anuario.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { materialId: 1 } })
      );
      expect(mockAnuarioInst.update).toHaveBeenCalledWith(
        expect.objectContaining({ anioEdicion: '2025' }),
        expect.any(Object)
      );
    });

    it('debe agregar autores al actualizar', async () => {
      const mockMaterial = {
        idMaterial: 1, titulo: 'Original', signatura: 'S-001',
        ejemplares: [],
        update: jest.fn(),
        setAutores: jest.fn().mockResolvedValue(undefined)
      };
      mocks.Material.findByPk.mockResolvedValue(mockMaterial);
      mocks.Prestamo.findOne.mockResolvedValue(null);
      mocks.Libro.findOrCreate.mockResolvedValue([{ update: jest.fn() }, false]);
      mocks.Autor.findOrCreate.mockResolvedValue([{ idAutor: 1, nombre: 'Autor', apellido: 'Nuevo' }]);

      await materialService.actualizar(1, {
        titulo: 'Original',
        tipo: 'libro',
        libro: { isbn: '978-3-16-148410-0', editorial: 'Test' },
        autores: [{ nombre: 'Autor', apellido: 'Nuevo' }]
      }, 1);

      expect(mocks.Autor.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { nombre: 'Autor', apellido: 'Nuevo' } })
      );
      expect(mockMaterial.setAutores).toHaveBeenCalled();
    });

    it('debe agregar ejemplares al actualizar', async () => {
      const mockMaterial = {
        idMaterial: 1, titulo: 'Original', signatura: 'S-001',
        ejemplares: [],
        update: jest.fn()
      };
      mocks.Material.findByPk.mockResolvedValue(mockMaterial);
      mocks.Prestamo.findOne.mockResolvedValue(null);
      mocks.Libro.findOrCreate.mockResolvedValue([{ update: jest.fn() }, false]);

      await materialService.actualizar(1, {
        titulo: 'Original',
        tipo: 'libro',
        libro: { isbn: '978-3-16-148410-0', editorial: 'Test' },
        ejemplaresNuevos: [{ identificadorUnico: 'E-001' }]
      }, 1);

      expect(mocks.Ejemplar.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ identificadorUnico: 'E-001', estado: 'Disponible' })
        ]),
        expect.any(Object)
      );
    });

    it('debe hacer rollback de la transacción si falla la actualización', async () => {
      const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
      mocks.Material.sequelize.transaction.mockResolvedValue(mockTransaction);
      const mockMaterial = {
        idMaterial: 1, titulo: 'Original', signatura: 'S-001',
        ejemplares: [],
        update: jest.fn().mockRejectedValue(new Error('Error DB'))
      };
      mocks.Material.findByPk.mockResolvedValue(mockMaterial);
      mocks.Prestamo.findOne.mockResolvedValue(null);

      await expect(materialService.actualizar(1, {
        titulo: 'Nuevo',
        tipo: 'libro'
      }, 1)).rejects.toThrow('Error DB');

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('buscarEjemplares', () => {
    it('debe buscar ejemplares disponibles con filtros', async () => {
      const mockEjemplares = [{ idEjemplar: 1, identificadorUnico: 'E-001' }];
      mocks.Ejemplar.findAll.mockResolvedValue(mockEjemplares);

      const resultado = await materialService.buscarEjemplares({});
      expect(resultado).toEqual(mockEjemplares);
      expect(mocks.Ejemplar.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { estado: 'Disponible' },
          limit: 20
        })
      );
    });

    it('debe filtrar por identificador', async () => {
      const Op = mocks.Material.sequelize.constructor.Op;
      mocks.Ejemplar.findAll.mockResolvedValue([]);
      await materialService.buscarEjemplares({ identificador: 'E-001' });
      expect(mocks.Ejemplar.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estado: 'Disponible',
            identificadorUnico: { [Op.like]: '%E-001%' }
          })
        })
      );
    });

    it('debe filtrar por materialId', async () => {
      mocks.Ejemplar.findAll.mockResolvedValue([]);
      await materialService.buscarEjemplares({ materialId: 1 });
      expect(mocks.Ejemplar.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ materialId: 1 })
        })
      );
    });
  });

  describe('buscarDisponibles', () => {
    it('debe retornar arreglo vacío si no se proporciona título', async () => {
      const resultado = await materialService.buscarDisponibles('');
      expect(resultado).toEqual([]);
      expect(mocks.Material.findAll).not.toHaveBeenCalled();
    });

    it('debe retornar lista plana de ejemplares disponibles por título', async () => {
      const mockMateriales = [{
        titulo: 'Libro Test',
        tipo: 'libro',
        autores: [{ nombre: 'Juan', apellido: 'Pérez' }],
        ejemplares: [
          { idEjemplar: 1, identificadorUnico: 'E-001', estado: 'Disponible' },
          { idEjemplar: 2, identificadorUnico: 'E-002', estado: 'Disponible' }
        ]
      }];
      mocks.Material.findAll.mockResolvedValue(mockMateriales);

      const resultado = await materialService.buscarDisponibles('Libro Test');
      expect(resultado).toHaveLength(2);
      expect(resultado[0]).toEqual({
        id: 1,
        titulo: 'Libro Test',
        autores: 'Juan Pérez',
        tipo: 'libro',
        identificadorUnico: 'E-001'
      });
    });
  });
});
