/**
 * @requirement RF-14 (Registrar o cargar solicitante)
 * @use_case CU-14
 * @description Pruebas unitarias del servicio de solicitantes.
 */
const SolicitanteService = require('../services/solicitante.service');
const { crearMocksModelos, mockAuditoria } = require('./mocks/models');

const crearSolicitanteMock = (cedula = '123', overrides = {}) => ({
  cedula,
  nombre: 'Juan',
  apellido: 'Pérez',
  correoElectronico: 'juan@test.com',
  telefono: '04121234567',
  estado: 'Activo',
  fechaFinSuspension: null,
  Prestamos: [],
  Sancions: [],
  update: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('SolicitanteService', () => {
  let solicitanteService;
  let mocks;

  beforeEach(() => {
    mocks = crearMocksModelos();
    solicitanteService = new SolicitanteService(mocks);
    mockAuditoria.mockClear();
  });

  describe('buscar', () => {
    it('debe retornar solicitante por cédula', async () => {
      const mockSolicitante = crearSolicitanteMock('123');
      mocks.Solicitante.findByPk.mockResolvedValue(mockSolicitante);

      const resultado = await solicitanteService.buscar('123');

      expect(mocks.Solicitante.findByPk).toHaveBeenCalledWith('123');
      expect(resultado).toBe(mockSolicitante);
    });

    it('debe retornar null si la cédula está vacía', async () => {
      const resultado = await solicitanteService.buscar('');
      expect(resultado).toBeNull();
    });

    it('debe retornar null si el solicitante no existe', async () => {
      mocks.Solicitante.findByPk.mockResolvedValue(null);

      const resultado = await solicitanteService.buscar('999');
      expect(resultado).toBeNull();
    });
  });

  describe('buscarResponse', () => {
    it('debe retornar datos del solicitante si existe', async () => {
      const mockSolicitante = crearSolicitanteMock('123', { telefono: '04140000000' });
      mocks.Solicitante.findByPk.mockResolvedValue(mockSolicitante);

      const resultado = await solicitanteService.buscarResponse('123');

      expect(resultado).toEqual({
        existe: true,
        solicitante: {
          cedula: '123',
          nombre: 'Juan',
          apellido: 'Pérez',
          correoElectronico: 'juan@test.com',
          telefono: '04140000000',
          estado: 'Activo',
          fechaFinSuspension: null
        }
      });
    });

    it('debe retornar existe false si no existe', async () => {
      mocks.Solicitante.findByPk.mockResolvedValue(null);

      const resultado = await solicitanteService.buscarResponse('999');

      expect(resultado).toEqual({ existe: false });
    });
  });

  describe('buscarConPrestamos', () => {
    it('debe retornar null si la cédula está vacía', async () => {
      const resultado = await solicitanteService.buscarConPrestamos('');
      expect(resultado).toBeNull();
    });

    it('debe retornar null si el solicitante no existe', async () => {
      mocks.Solicitante.findByPk.mockResolvedValue(null);

      const resultado = await solicitanteService.buscarConPrestamos('999');
      expect(resultado).toBeNull();
    });

    it('debe retornar solicitante con préstamos y sanciones activas', async () => {
      const mockSolicitante = crearSolicitanteMock('123', {
        Prestamos: [
          {
            idPrestamo: 1,
            fechaDevolucionPrevista: new Date('2024-02-01'),
            Ejemplar: { identificadorUnico: 'EJ-001', Material: { idMaterial: 1, titulo: 'Libro A' } }
          }
        ],
        Sancions: [{ idSancion: 1, motivo: 'Retraso', fechaFin: new Date('2024-03-01') }]
      });
      mocks.Solicitante.findByPk.mockResolvedValue(mockSolicitante);

      const resultado = await solicitanteService.buscarConPrestamos('123');

      expect(resultado.cedula).toBe('123');
      expect(resultado.prestamosActivos).toBe(1);
      expect(resultado.prestamos[0].material).toBe('Libro A');
      expect(resultado.suspendido).toBe(false);
    });

    it('debe marcar como suspendido si estado es Suspendido permanente', async () => {
      const mockSolicitante = crearSolicitanteMock('123', { estado: 'Suspendido permanente' });
      mocks.Solicitante.findByPk.mockResolvedValue(mockSolicitante);

      const resultado = await solicitanteService.buscarConPrestamos('123');

      expect(resultado.suspendido).toBe(true);
    });
  });

  describe('crear', () => {
    it('debe crear un solicitante nuevo', async () => {
      mocks.Solicitante.findByPk.mockResolvedValue(null);
      const mockCreado = crearSolicitanteMock('456', { nombre: 'Ana' });
      mocks.Solicitante.create.mockResolvedValue(mockCreado);

      const resultado = await solicitanteService.crear({
        cedula: '456', nombre: 'Ana', apellido: 'García',
        correoElectronico: 'ana@test.com', telefono: '04141111111'
      });

      expect(mocks.Solicitante.findByPk).toHaveBeenCalledWith('456');
      expect(mocks.Solicitante.create).toHaveBeenCalledWith({
        cedula: '456', nombre: 'Ana', apellido: 'García',
        correoElectronico: 'ana@test.com', telefono: '04141111111',
        estado: 'Activo'
      });
      expect(resultado).toBe(mockCreado);
    });

    it('debe lanzar error si el solicitante ya existe', async () => {
      mocks.Solicitante.findByPk.mockResolvedValue(crearSolicitanteMock('456'));

      await expect(solicitanteService.crear({
        cedula: '456', nombre: 'Ana', apellido: 'García'
      })).rejects.toThrow('Ya existe un solicitante con esta cédula');
    });
  });

  describe('suspender', () => {
    it('debe suspender temporalmente al solicitante', async () => {
      const fechaFin = new Date('2024-03-01');
      mocks.Solicitante.update.mockResolvedValue([1]);

      await solicitanteService.suspender('123', fechaFin, 'Retraso en devolución');

      expect(mocks.Solicitante.update).toHaveBeenCalledWith(
        { estado: 'Suspendido temporal', fechaFinSuspension: fechaFin },
        { where: { cedula: '123' } }
      );
    });
  });
});
