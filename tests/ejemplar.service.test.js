/**
 * @requirement RF-06 (Agregar ejemplares), RF-07 (Cambiar estado de ejemplar)
 * @use_case CU-06, CU-07
 * @description Pruebas unitarias del servicio de ejemplares con mocks de modelos Sequelize.
 */
const EjemplarService = require('../services/ejemplar.service');
const { crearMocksModelos, mockAuditoria } = require('./mocks/models');

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
      mocks.Material.findByPk.mockResolvedValue({ idMaterial: 1, titulo: 'Test', tipo: 'libro' });
      mocks.Ejemplar.findAll.mockResolvedValue([
        { idEjemplar: 1, identificadorUnico: 'E-001', Material: { titulo: 'Test' } }
      ]);

      const result = await ejemplarService.listarPorMaterial(1);

      expect(result.material.idMaterial).toBe(1);
      expect(result.ejemplares).toHaveLength(1);
    });

    it('debe lanzar error si material no existe', async () => {
      mocks.Material.findByPk.mockResolvedValue(null);

      await expect(ejemplarService.listarPorMaterial(999)).rejects.toThrow('Material no encontrado');
    });
  });

  describe('agregar', () => {
    it('debe crear ejemplares y registrar auditoría', async () => {
      mocks.Material.findByPk.mockResolvedValue({ idMaterial: 1 });
      mocks.Ejemplar.findAll.mockResolvedValue([]);
      mocks.Ejemplar.bulkCreate.mockResolvedValue([{ idEjemplar: 1 }]);

      const result = await ejemplarService.agregar(1, ['E-001'], 1);

      expect(result).toHaveLength(1);
      expect(mocks.Ejemplar.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ identificadorUnico: 'E-001' })])
      );
      expect(mockAuditoria).toHaveBeenCalledWith(expect.objectContaining({ accion: 'AGREGAR_EJEMPLARES' }));
    });

    it('debe lanzar error si material no existe', async () => {
      mocks.Material.findByPk.mockResolvedValue(null);

      await expect(ejemplarService.agregar(999, ['E-001'], 1)).rejects.toThrow('Material no encontrado');
    });

    it('debe lanzar error si hay identificadores duplicados', async () => {
      mocks.Material.findByPk.mockResolvedValue({ idMaterial: 1 });
      mocks.Ejemplar.findAll.mockResolvedValue([{ identificadorUnico: 'E-001' }]);

      await expect(ejemplarService.agregar(1, ['E-001'], 1)).rejects.toThrow('ya existen');
    });
  });

  describe('_validarCambioEstado', () => {
    it('debe rechazar cambio si ejemplar está prestado', () => {
      expect(() => ejemplarService._validarCambioEstado(
        { estado: 'Prestado' }, 'Disponible', false, '')
      ).toThrow('No se puede cambiar el estado de un ejemplar Prestado');
    });

    it('debe rechazar cambio si ejemplar está dado de baja', () => {
      expect(() => ejemplarService._validarCambioEstado(
        { estado: 'Dado de baja' }, 'Disponible', false, '')
      ).toThrow('No se puede cambiar el estado de un ejemplar dado de baja');
    });

    it('debe requerir admin para recuperar ejemplar perdido', () => {
      expect(() => ejemplarService._validarCambioEstado(
        { estado: 'Perdido' }, 'Disponible', false, 'motivo')
      ).toThrow('Solo un Administrador puede recuperar un ejemplar perdido');
    });

    it('debe permitir a admin recuperar ejemplar perdido', () => {
      expect(() => ejemplarService._validarCambioEstado(
        { estado: 'Perdido' }, 'Disponible', true, 'motivo')
      ).not.toThrow();
    });

    it('debe requerir motivo para estado Dañado', () => {
      expect(() => ejemplarService._validarCambioEstado(
        { estado: 'Disponible' }, 'Dañado', false, '')
      ).toThrow('Debe ingresar un motivo');
    });

    it('debe requerir motivo para estado Perdido', () => {
      expect(() => ejemplarService._validarCambioEstado(
        { estado: 'Disponible' }, 'Perdido', false, '')
      ).toThrow('Debe ingresar un motivo');
    });
  });

  describe('cambiarEstado', () => {
    it('debe cambiar estado y registrar auditoría', async () => {
      const mockEjemplar = {
        estado: 'Disponible',
        update: jest.fn()
      };
      mocks.Ejemplar.findByPk.mockResolvedValue(mockEjemplar);

      const result = await ejemplarService.cambiarEstado(1, 'Dañado', 1, 'Golpeado');

      expect(mockEjemplar.update).toHaveBeenCalledWith({ estado: 'Dañado' });
      expect(mockAuditoria).toHaveBeenCalledWith(expect.objectContaining({ accion: 'CAMBIAR_ESTADO_EJEMPLAR' }));
    });

    it('debe lanzar error si ejemplar no existe', async () => {
      mocks.Ejemplar.findByPk.mockResolvedValue(null);

      await expect(ejemplarService.cambiarEstado(999, 'Disponible', 1, '')).rejects.toThrow('Ejemplar no encontrado');
    });

    it('debe lanzar error si validación falla', async () => {
      mocks.Ejemplar.findByPk.mockResolvedValue({ estado: 'Prestado', update: jest.fn() });

      await expect(ejemplarService.cambiarEstado(1, 'Disponible', 1, '')).rejects.toThrow('No se puede cambiar el estado de un ejemplar Prestado');
    });
  });
});
