/**
 * @requirement RF-06 (Agregar ejemplares), RF-07 (Cambiar estado de ejemplar)
 * @use_case CU-06, CU-07
 * @description Pruebas unitarias del servicio de ejemplares.
 */
const EjemplarService = require('../services/ejemplar.service');
const { crearMocksModelos, mockAuditoria } = require('./mocks/models');

const crearEjemplarMock = (id = 1, overrides = {}) => ({
  idEjemplar: id,
  materialId: 1,
  identificadorUnico: 'EJ-' + id,
  estado: 'Disponible',
  Material: { idMaterial: 1, titulo: 'Material Test', tipo: 'Libro' },
  update: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const crearMaterialMock = (id = 1, overrides = {}) => ({
  idMaterial: id,
  titulo: 'Material ' + id,
  tipo: 'Libro',
  ...overrides
});

describe('EjemplarService', () => {
  let ejemplarService;
  let mocks;

  beforeEach(() => {
    mocks = crearMocksModelos();
    ejemplarService = new EjemplarService(mocks, mockAuditoria);
    mockAuditoria.mockClear();
  });

  describe('listarPorMaterial', () => {
    it('debe retornar material con sus ejemplares', async () => {
      const mockMaterial = crearMaterialMock(1);
      const mockEjemplares = [crearEjemplarMock(1), crearEjemplarMock(2)];
      mocks.Material.findByPk.mockResolvedValue(mockMaterial);
      mocks.Ejemplar.findAll.mockResolvedValue(mockEjemplares);

      const resultado = await ejemplarService.listarPorMaterial(1);

      expect(mocks.Material.findByPk).toHaveBeenCalledWith(1);
      expect(resultado.material).toBe(mockMaterial);
      expect(resultado.ejemplares).toHaveLength(2);
    });

    it('debe lanzar error si el material no existe', async () => {
      mocks.Material.findByPk.mockResolvedValue(null);

      await expect(ejemplarService.listarPorMaterial(999))
        .rejects.toThrow('Material no encontrado');
    });
  });

  describe('agregar', () => {
    it('debe agregar ejemplares nuevos', async () => {
      const mockMaterial = crearMaterialMock(1);
      const mockEjemplares = [crearEjemplarMock(1), crearEjemplarMock(2)];
      mocks.Material.findByPk.mockResolvedValue(mockMaterial);
      mocks.Ejemplar.findAll.mockResolvedValue([]);
      mocks.Ejemplar.bulkCreate.mockResolvedValue(mockEjemplares);

      const resultado = await ejemplarService.agregar(1, ['EJ-001', 'EJ-002'], 1);

      expect(mocks.Material.findByPk).toHaveBeenCalledWith(1);
      expect(mocks.Ejemplar.bulkCreate).toHaveBeenCalledWith([
        { materialId: 1, identificadorUnico: 'EJ-001', estado: 'Disponible' },
        { materialId: 1, identificadorUnico: 'EJ-002', estado: 'Disponible' }
      ]);
      expect(mockAuditoria).toHaveBeenCalledWith({
        usuarioId: 1, accion: 'AGREGAR_EJEMPLARES',
        tablaAfectada: 'ejemplar', registroId: 1,
        valorNuevo: { cantidad: 2, identificadores: ['EJ-001', 'EJ-002'] }
      });
      expect(resultado).toEqual(mockEjemplares);
    });

    it('debe lanzar error si el material no existe', async () => {
      mocks.Material.findByPk.mockResolvedValue(null);

      await expect(ejemplarService.agregar(999, ['EJ-001'], 1))
        .rejects.toThrow('Material no encontrado');
    });

    it('debe lanzar error si algún identificador ya existe', async () => {
      mocks.Material.findByPk.mockResolvedValue(crearMaterialMock(1));
      mocks.Ejemplar.findAll.mockResolvedValue([crearEjemplarMock(1)]);

      await expect(ejemplarService.agregar(1, ['EJ-001', 'EJ-002'], 1))
        .rejects.toThrow('Los siguientes identificadores ya existen para este material');
    });
  });

  describe('cambiarEstado', () => {
    it('debe cambiar estado de Disponible a Dañado con motivo', async () => {
      const mockEjemplar = crearEjemplarMock(1);
      mocks.Ejemplar.findByPk.mockResolvedValue(mockEjemplar);

      await ejemplarService.cambiarEstado(1, 'Dañado', 1, 'Páginas rotas');

      expect(mockEjemplar.update).toHaveBeenCalledWith({ estado: 'Dañado' });
      expect(mockAuditoria).toHaveBeenCalledWith({
        usuarioId: 1, accion: 'CAMBIAR_ESTADO_EJEMPLAR',
        tablaAfectada: 'ejemplar', registroId: 1,
        valorAnterior: { estado: 'Disponible' },
        valorNuevo: { estado: 'Dañado', motivo: 'Páginas rotas' }
      });
    });

    it('debe lanzar error si el ejemplar no existe', async () => {
      mocks.Ejemplar.findByPk.mockResolvedValue(null);

      await expect(ejemplarService.cambiarEstado(999, 'Disponible', 1))
        .rejects.toThrow('Ejemplar no encontrado');
    });

    it('debe lanzar error si se intenta cambiar estado de Prestado', async () => {
      mocks.Ejemplar.findByPk.mockResolvedValue(crearEjemplarMock(1, { estado: 'Prestado' }));

      await expect(ejemplarService.cambiarEstado(1, 'Disponible', 1))
        .rejects.toThrow('No se puede cambiar el estado de un ejemplar Prestado');
    });

    it('debe lanzar error si se intenta cambiar estado de Dado de baja', async () => {
      mocks.Ejemplar.findByPk.mockResolvedValue(crearEjemplarMock(1, { estado: 'Dado de baja' }));

      await expect(ejemplarService.cambiarEstado(1, 'Disponible', 1))
        .rejects.toThrow('No se puede cambiar el estado de un ejemplar dado de baja');
    });

    it('debe lanzar error si no-admin intenta recuperar Perdido a Disponible', async () => {
      mocks.Ejemplar.findByPk.mockResolvedValue(crearEjemplarMock(1, { estado: 'Perdido' }));

      await expect(ejemplarService.cambiarEstado(1, 'Disponible', 1, 'Encontrado'))
        .rejects.toThrow('Solo un Administrador puede recuperar un ejemplar perdido');
    });

    it('debe permitir a admin recuperar Perdido a Disponible', async () => {
      const mockEjemplar = crearEjemplarMock(1, { estado: 'Perdido' });
      mocks.Ejemplar.findByPk.mockResolvedValue(mockEjemplar);

      await ejemplarService.cambiarEstado(1, 'Disponible', 1, 'Encontrado', true);

      expect(mockEjemplar.update).toHaveBeenCalledWith({ estado: 'Disponible' });
    });

    it('debe lanzar error si falta motivo para Dañado/Perdido', async () => {
      mocks.Ejemplar.findByPk.mockResolvedValue(crearEjemplarMock(1));

      await expect(ejemplarService.cambiarEstado(1, 'Dañado', 1, ''))
        .rejects.toThrow('Debe ingresar un motivo cuando el estado es "Dañado" o "Perdido"');
    });
  });
});
