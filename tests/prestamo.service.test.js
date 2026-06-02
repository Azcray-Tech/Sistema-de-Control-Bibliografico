/**
 * @requirement RF-18 (Devolver préstamo), RF-19 (Suspensión automática), RF-20 (Levantar suspensión)
 * @use_case CU-18, CU-19, CU-20
 * @description Pruebas unitarias del servicio de préstamos: devolución, sanciones y levantamiento.
 */
const PrestamoService = require('../services/prestamo.service');
const { crearMocksModelos, mockAuditoria } = require('./mocks/models');

const crearParametroServiceMock = () => ({
  obtener: jest.fn().mockImplementation(async (clave, defecto) => {
    const valores = {
      factor_sancion: 2,
      suspension_maxima: 30,
      max_prestamos_simultaneos: 3,
      dias_prestamo: 7,
      renovaciones_permitidas: 1
    };
    return valores[clave] ?? defecto;
  }),
  obtenerTexto: jest.fn().mockResolvedValue(''),
  obtenerTodos: jest.fn().mockResolvedValue([]),
  actualizar: jest.fn().mockResolvedValue(undefined)
});

describe('PrestamoService', () => {
  let prestamoService;
  let mocks;
  let mockParametroService;

  beforeEach(() => {
    mocks = crearMocksModelos();
    mockParametroService = crearParametroServiceMock();
    prestamoService = new PrestamoService(mocks, mockAuditoria, mockParametroService);
    mockAuditoria.mockClear();
  });

  describe('devolver', () => {
    it('debe devolver un préstamo sin retraso y sin crear sanción', async () => {
      const mockPrestamo = {
        idPrestamo: 1,
        estado: 'Activo',
        fechaDevolucionPrevista: new Date(),
        solicitanteCedula: '123',
        Ejemplar: { update: jest.fn().mockResolvedValue(undefined) },
        Solicitante: { update: jest.fn().mockResolvedValue(undefined) },
        update: jest.fn().mockResolvedValue(undefined)
      };
      mocks.Prestamo.findByPk.mockResolvedValue(mockPrestamo);

      const resultado = await prestamoService.devolver(1, 1);

      expect(mockPrestamo.update).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'Devuelto' })
      );
      expect(mockPrestamo.Ejemplar.update).toHaveBeenCalledWith({ estado: 'Disponible' });
      expect(mocks.Sancion.create).not.toHaveBeenCalled();
      expect(mockAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'DEVOLVER_PRESTAMO', usuarioId: 1 })
      );
      expect(resultado).toBe(mockPrestamo);
    });

    it('debe crear sanción si hay retraso y marcar suspendido temporal', async () => {
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 5);
      const mockPrestamo = {
        idPrestamo: 1,
        estado: 'Activo',
        fechaDevolucionPrevista: ayer,
        solicitanteCedula: '123',
        Ejemplar: { update: jest.fn().mockResolvedValue(undefined) },
        Solicitante: { update: jest.fn().mockResolvedValue(undefined) },
        update: jest.fn().mockResolvedValue(undefined)
      };
      mocks.Prestamo.findByPk.mockResolvedValue(mockPrestamo);

      await prestamoService.devolver(1, 1);

      expect(mocks.Sancion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          solicitanteCedula: '123',
          motivo: expect.stringContaining('Retraso de 5 días')
        })
      );
      expect(mockPrestamo.Solicitante.update).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'Suspendido temporal' })
      );
    });

    it('debe calcular días de sanción con factor y tope máximo', async () => {
      mockParametroService.obtener.mockImplementation(async (clave, defecto) => {
        if (clave === 'factor_sancion') return 10;
        if (clave === 'suspension_maxima') return 30;
        return defecto;
      });

      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 10);
      const mockPrestamo = {
        idPrestamo: 1,
        estado: 'Activo',
        fechaDevolucionPrevista: ayer,
        solicitanteCedula: '123',
        Ejemplar: { update: jest.fn().mockResolvedValue(undefined) },
        Solicitante: { update: jest.fn().mockResolvedValue(undefined) },
        update: jest.fn().mockResolvedValue(undefined)
      };
      mocks.Prestamo.findByPk.mockResolvedValue(mockPrestamo);

      await prestamoService.devolver(1, 1);

      // 10 retraso * 10 factor = 100, tope 30 → debe ser 30
      expect(mocks.Sancion.create).toHaveBeenCalledWith(
        expect.objectContaining({ diasSancion: 30 })
      );
    });

    it('debe lanzar error si el préstamo no existe', async () => {
      mocks.Prestamo.findByPk.mockResolvedValue(null);
      await expect(prestamoService.devolver(999, 1)).rejects.toThrow('Préstamo no encontrado');
    });

    it('debe lanzar error si el préstamo ya fue devuelto', async () => {
      mocks.Prestamo.findByPk.mockResolvedValue({ estado: 'Devuelto' });
      await expect(prestamoService.devolver(1, 1)).rejects.toThrow('o ya fue devuelto');
    });
  });

  describe('listarSancionesActivas', () => {
    it('debe retornar solicitantes suspendidos con sus sanciones', async () => {
      const mockSanciones = [{ idSancion: 1, levantadaManualmente: false }];
      const mockSuspendidos = [
        { cedula: '123', estado: 'Suspendido temporal', Sancions: mockSanciones },
        { cedula: '456', estado: 'Suspendido permanente', Sancions: [] }
      ];
      mocks.Solicitante.findAll.mockResolvedValue(mockSuspendidos);

      const resultado = await prestamoService.listarSancionesActivas();

      expect(resultado).toEqual(mockSuspendidos);
      expect(mocks.Solicitante.findAll).toHaveBeenCalledTimes(1);
      const args = mocks.Solicitante.findAll.mock.calls[0][0];
      expect(args).toHaveProperty('where');
      expect(args).toHaveProperty('include');
      expect(args).toHaveProperty('order');
    });
  });

  describe('levantarSancion', () => {
    it('debe levantar sanción exitosamente con motivo', async () => {
      const mockSolicitante = {
        cedula: '123',
        estado: 'Suspendido temporal',
        fechaFinSuspension: new Date(),
        update: jest.fn().mockResolvedValue(undefined)
      };
      mocks.Solicitante.findByPk.mockResolvedValue(mockSolicitante);

      const resultado = await prestamoService.levantarSancion('123', 1, 'Pago de multa');

      expect(mockSolicitante.update).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'Activo', fechaFinSuspension: null })
      );
      expect(mocks.Sancion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          motivoLevantamiento: 'Pago de multa',
          levantadaManualmente: true
        }),
        expect.objectContaining({
          where: expect.objectContaining({ solicitanteCedula: '123' })
        })
      );
      expect(mockAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'LEVANTAR_SANCION', usuarioId: 1, registroId: '123' })
      );
      expect(resultado).toBe(mockSolicitante);
    });

    it('debe lanzar error si el motivo está vacío', async () => {
      await expect(prestamoService.levantarSancion('123', 1, ''))
        .rejects.toThrow('El motivo es obligatorio');
    });

    it('debe lanzar error si el solicitante no existe', async () => {
      mocks.Solicitante.findByPk.mockResolvedValue(null);
      await expect(prestamoService.levantarSancion('999', 1, 'Motivo'))
        .rejects.toThrow('Solicitante no encontrado');
    });

    it('debe lanzar error si el solicitante no está suspendido', async () => {
      mocks.Solicitante.findByPk.mockResolvedValue({
        cedula: '123', estado: 'Activo', update: jest.fn()
      });
      await expect(prestamoService.levantarSancion('123', 1, 'Motivo'))
        .rejects.toThrow('no tiene una suspensión activa');
    });
  });

  describe('obtenerVencidos', () => {
    it('debe retornar préstamos vencidos con días de retraso', async () => {
      const fechaVencida = new Date();
      fechaVencida.setDate(fechaVencida.getDate() - 10);

      const mockPrestamos = [
        {
          idPrestamo: 1,
          estado: 'Activo',
          fechaDevolucionPrevista: fechaVencida,
          toJSON: jest.fn().mockReturnThis(),
          Solicitante: {},
          Ejemplar: { Material: {} }
        }
      ];
      mocks.Prestamo.findAll.mockResolvedValue(mockPrestamos);

      const resultado = await prestamoService.obtenerVencidos();

      expect(resultado).toHaveLength(1);
      expect(resultado[0].retraso).toBe(10);
    });
  });
});
