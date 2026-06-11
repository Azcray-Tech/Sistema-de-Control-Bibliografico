/**
 * @requirement RF-14 (Registrar o cargar solicitante), RF-06 (Añadir ejemplares)
 * @use_case CU-14, CU-06
 * @description Pruebas unitarias del controlador de API JSON.
 */
const ApiController = require('../controllers/apiController');

describe('ApiController', () => {
  let controller;
  let mockSolicitanteService;
  let mockMaterialService;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockSolicitanteService = {
      buscarResponse: jest.fn(),
      crear: jest.fn(),
      buscarConPrestamos: jest.fn()
    };

    mockMaterialService = {
      buscarEjemplares: jest.fn(),
      buscarDisponibles: jest.fn()
    };

    controller = new ApiController(mockSolicitanteService, mockMaterialService);

    req = { query: {}, params: {}, body: {} };

    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    next = jest.fn();
  });

  describe('buscarSolicitante', () => {
    it('debe retornar JSON con datos del solicitante', async () => {
      mockSolicitanteService.buscarResponse.mockResolvedValue({
        existe: true, solicitante: { cedula: '123', nombre: 'Juan' }
      });
      req.query = { cedula: '123' };

      await controller.buscarSolicitante(req, res, next);

      expect(mockSolicitanteService.buscarResponse).toHaveBeenCalledWith('123');
      expect(res.json).toHaveBeenCalledWith({
        existe: true, solicitante: { cedula: '123', nombre: 'Juan' }
      });
    });

    it('debe retornar error 500 si falla', async () => {
      mockSolicitanteService.buscarResponse.mockRejectedValue(new Error('DB error'));

      await controller.buscarSolicitante(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al buscar solicitante' });
    });
  });

  describe('crearSolicitante', () => {
    it('debe crear y retornar JSON con éxito', async () => {
      mockSolicitanteService.crear.mockResolvedValue({ cedula: '456', nombre: 'Ana' });
      req.body = { cedula: '456', nombre: 'Ana', apellido: 'García' };

      await controller.crearSolicitante(req, res, next);

      expect(mockSolicitanteService.crear).toHaveBeenCalledWith({
        cedula: '456', nombre: 'Ana', apellido: 'García',
        correoElectronico: undefined, telefono: undefined
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true, solicitante: { cedula: '456', nombre: 'Ana' }
      });
    });

    it('debe retornar error 500 si falla', async () => {
      mockSolicitanteService.crear.mockRejectedValue(new Error('Ya existe'));

      await controller.crearSolicitante(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Ya existe' });
    });

    it('debe usar mensaje por defecto si error no tiene message', async () => {
      mockSolicitanteService.crear.mockRejectedValue({});

      await controller.crearSolicitante(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al crear solicitante' });
    });
  });

  describe('buscarEjemplar', () => {
    it('debe retornar JSON con ejemplares', async () => {
      mockMaterialService.buscarEjemplares.mockResolvedValue([{ idEjemplar: 1 }]);
      req.query = { identificador: 'EJ-001', materialId: '1' };

      await controller.buscarEjemplar(req, res, next);

      expect(mockMaterialService.buscarEjemplares).toHaveBeenCalledWith({
        identificador: 'EJ-001', materialId: '1'
      });
      expect(res.json).toHaveBeenCalledWith({ ejemplares: [{ idEjemplar: 1 }] });
    });

    it('debe retornar error 500 si falla', async () => {
      mockMaterialService.buscarEjemplares.mockRejectedValue(new Error('DB error'));

      await controller.buscarEjemplar(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('buscarSolicitantePrestamo', () => {
    it('debe retornar JSON con datos del solicitante para préstamo', async () => {
      mockSolicitanteService.buscarConPrestamos.mockResolvedValue({
        cedula: '123', prestamosActivos: 1
      });
      req.query = { cedula: '123' };

      await controller.buscarSolicitantePrestamo(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        encontrado: true,
        solicitante: { cedula: '123', prestamosActivos: 1 }
      });
    });

    it('debe retornar encontrado false si no existe', async () => {
      mockSolicitanteService.buscarConPrestamos.mockResolvedValue(null);

      await controller.buscarSolicitantePrestamo(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ encontrado: false });
    });

    it('debe retornar error 500 si falla', async () => {
      mockSolicitanteService.buscarConPrestamos.mockRejectedValue(new Error('DB error'));

      await controller.buscarSolicitantePrestamo(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('buscarEjemplaresDisponibles', () => {
    it('debe retornar JSON con ejemplares disponibles', async () => {
      mockMaterialService.buscarDisponibles.mockResolvedValue([{ idMaterial: 1, titulo: 'Libro' }]);
      req.query = { titulo: 'test' };

      await controller.buscarEjemplaresDisponibles(req, res, next);

      expect(mockMaterialService.buscarDisponibles).toHaveBeenCalledWith('test');
      expect(res.json).toHaveBeenCalledWith([{ idMaterial: 1, titulo: 'Libro' }]);
    });

    it('debe retornar [] en error 500 si falla', async () => {
      mockMaterialService.buscarDisponibles.mockRejectedValue(new Error('DB error'));

      await controller.buscarEjemplaresDisponibles(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });
});
