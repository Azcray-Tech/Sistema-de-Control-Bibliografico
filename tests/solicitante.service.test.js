/**
 * @requirement RF-14 (Registrar o cargar solicitante), RF-20 (Suspender solicitante)
 * @use_case CU-14, CU-20
 * @description Pruebas unitarias del servicio de solicitantes con mocks Sequelize.
 */
const SolicitanteService = require('../services/solicitante.service');
const { crearMocksModelos } = require('./mocks/models');

describe('SolicitanteService', () => {
  let solicitanteService;
  let mocks;

  beforeEach(() => {
    mocks = crearMocksModelos();
    solicitanteService = new SolicitanteService(mocks);
  });

  describe('buscar', () => {
    it('debe retornar solicitante por cédula', async () => {
      const mockSolicitante = { cedula: '123', nombre: 'Juan', apellido: 'Perez' };
      mocks.Solicitante.findByPk.mockResolvedValue(mockSolicitante);

      const result = await solicitanteService.buscar('123');

      expect(mocks.Solicitante.findByPk).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockSolicitante);
    });

    it('debe retornar null si cédula vacía', async () => {
      const result = await solicitanteService.buscar('');
      expect(result).toBeNull();
    });

    it('debe retornar null si no existe', async () => {
      mocks.Solicitante.findByPk.mockResolvedValue(null);
      const result = await solicitanteService.buscar('999');
      expect(result).toBeNull();
    });
  });

  describe('buscarResponse', () => {
    it('debe retornar datos formateados si existe', async () => {
      mocks.Solicitante.findByPk.mockResolvedValue({
        cedula: '123', nombre: 'Juan', apellido: 'Perez',
        correoElectronico: 'juan@test.com', telefono: '555-0100',
        estado: 'Activo', fechaFinSuspension: null
      });

      const result = await solicitanteService.buscarResponse('123');

      expect(result.existe).toBe(true);
      expect(result.solicitante.nombre).toBe('Juan');
    });

    it('debe retornar existe=false si no existe', async () => {
      mocks.Solicitante.findByPk.mockResolvedValue(null);

      const result = await solicitanteService.buscarResponse('999');

      expect(result).toEqual({ existe: false });
    });
  });

  describe('buscarConPrestamos', () => {
    it('debe retornar solicitante con préstamos y sanciones activas', async () => {
      const mockSolicitante = {
        cedula: '123', nombre: 'Juan', apellido: 'Perez',
        correoElectronico: 'juan@test.com', telefono: '555-0100',
        estado: 'Activo', fechaFinSuspension: null,
        Prestamos: [{
          idPrestamo: 1,
          fechaDevolucionPrevista: new Date(),
          Ejemplar: { identificadorUnico: 'E-001', Material: { idMaterial: 1, titulo: 'Libro Test' } }
        }],
        Sancions: []
      };
      mocks.Solicitante.findByPk.mockResolvedValue(mockSolicitante);

      const result = await solicitanteService.buscarConPrestamos('123');

      expect(result.cedula).toBe('123');
      expect(result.prestamosActivos).toBe(1);
      expect(result.prestamos[0].material).toBe('Libro Test');
      expect(result.suspendido).toBe(false);
    });

    it('debe retornar null si no existe', async () => {
      mocks.Solicitante.findByPk.mockResolvedValue(null);

      const result = await solicitanteService.buscarConPrestamos('999');

      expect(result).toBeNull();
    });

    it('debe detectar suspensión permanente', async () => {
      mocks.Solicitante.findByPk.mockResolvedValue({
        cedula: '123', nombre: 'Juan', estado: 'Suspendido permanente',
        Prestamos: [], Sancions: []
      });

      const result = await solicitanteService.buscarConPrestamos('123');

      expect(result.suspendido).toBe(true);
    });

    it('debe detectar suspensión temporal vigente', async () => {
      const futuro = new Date();
      futuro.setDate(futuro.getDate() + 5);
      mocks.Solicitante.findByPk.mockResolvedValue({
        cedula: '123', nombre: 'Juan', estado: 'Suspendido temporal',
        fechaFinSuspension: futuro, Prestamos: [], Sancions: []
      });

      const result = await solicitanteService.buscarConPrestamos('123');

      expect(result.suspendido).toBe(true);
    });
  });

  describe('crear', () => {
    it('debe crear solicitante exitosamente', async () => {
      mocks.Solicitante.findByPk.mockResolvedValue(null);
      mocks.Solicitante.create.mockResolvedValue({ cedula: '123', nombre: 'Juan' });

      const result = await solicitanteService.crear({
        cedula: '123', nombre: 'Juan', apellido: 'Perez',
        correoElectronico: 'juan@test.com', telefono: '555-0100'
      });

      expect(mocks.Solicitante.create).toHaveBeenCalledWith(
        expect.objectContaining({ cedula: '123', estado: 'Activo' })
      );
      expect(result.cedula).toBe('123');
    });

    it('debe lanzar error si la cédula ya existe', async () => {
      mocks.Solicitante.findByPk.mockResolvedValue({ cedula: '123' });

      await expect(solicitanteService.crear({ cedula: '123' }))
        .rejects.toThrow('Ya existe un solicitante con esta cédula');
    });
  });

  describe('suspender', () => {
    it('debe actualizar estado a suspendido temporal', async () => {
      const fecha = new Date();
      await solicitanteService.suspender('123', fecha, 'motivo');

      expect(mocks.Solicitante.update).toHaveBeenCalledWith(
        { estado: 'Suspendido temporal', fechaFinSuspension: fecha },
        { where: { cedula: '123' } }
      );
    });
  });
});
