/**
 * @requirement RF-31, RF-32, RF-33, RF-34, RF-35, RF-36, RF-37
 * @use_case CU-31, CU-32, CU-33, CU-34, CU-35, CU-36, CU-37
 * @description Pruebas unitarias del controlador de reportes.
 */
const ReporteController = require('../controllers/reporteController');

describe('ReporteController', () => {
  let controller;
  let mockService;
  let req;
  let res;

  const mockResultado = {
    buffer: Buffer.from('test'),
    nombre: 'reporte.pdf',
    extension: 'pdf'
  };

  beforeEach(() => {
    mockService = {
      Categoria: { findAll: jest.fn().mockResolvedValue([]) },
      generarInventario: jest.fn().mockResolvedValue(mockResultado),
      generarPrestamosActivos: jest.fn().mockResolvedValue(mockResultado),
      generarHistorialSolicitante: jest.fn().mockResolvedValue(mockResultado),
      generarRanking: jest.fn().mockResolvedValue(mockResultado),
      generarVencidosContacto: jest.fn().mockResolvedValue(mockResultado),
      generarEstadisticas: jest.fn().mockResolvedValue(mockResultado),
      generarSuspendidos: jest.fn().mockResolvedValue(mockResultado)
    };
    controller = new ReporteController(mockService);

    req = {
      session: { usuarioId: 1 },
      query: {},
      body: {},
      params: {}
    };
    res = {
      render: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      attachment: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  describe('mostrarPanel', () => {
    it('debe renderizar la vista reportes', async () => {
      await controller.mostrarPanel(req, res);
      expect(res.render).toHaveBeenCalledWith('admin/reportes', expect.objectContaining({
        page: 'reportes'
      }));
    });

    it('debe pasar error y success desde query params', async () => {
      req.query.error = 'Algo salió mal';
      req.query.success = 'ok';
      await controller.mostrarPanel(req, res);
      expect(res.render).toHaveBeenCalledWith('admin/reportes', expect.objectContaining({
        error: 'Algo salió mal',
        success: 'ok'
      }));
    });
  });

  describe('mostrarPanel error', () => {
    it('debe llamar a next si Categoria.findAll falla', async () => {
      const next = jest.fn();
      mockService.Categoria.findAll.mockRejectedValue(new Error('DB error'));
      await controller.mostrarPanel(req, res, next);
      expect(next).toHaveBeenCalledWith(new Error('DB error'));
    });
  });

  describe('generarInventario', () => {
    it('debe llamar al servicio y enviar archivo', async () => {
      req.body = { tipo: 'libro', formato: 'pdf' };
      await controller.generarInventario(req, res);
      expect(mockService.generarInventario).toHaveBeenCalledWith(
        { tipo: 'libro', categoriaId: undefined }, 'pdf'
      );
      expect(res.attachment).toHaveBeenCalledWith('reporte.pdf');
      expect(res.send).toHaveBeenCalledWith(mockResultado.buffer);
    });

    it('debe redirigir con error si el servicio falla', async () => {
      mockService.generarInventario.mockRejectedValue(new Error('Error de prueba'));
      req.body = { formato: 'pdf' };
      await controller.generarInventario(req, res);
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('Error%20de%20prueba'));
    });
  });

  describe('generarPrestamosActivos', () => {
    it('debe llamar al servicio y enviar archivo', async () => {
      req.body = { soloVencidos: 'true', formato: 'excel' };
      await controller.generarPrestamosActivos(req, res);
      expect(mockService.generarPrestamosActivos).toHaveBeenCalledWith(
        { soloVencidos: 'true' }, 'excel'
      );
      expect(res.attachment).toHaveBeenCalled();
    });

    it('debe redirigir con error si falla', async () => {
      mockService.generarPrestamosActivos.mockRejectedValue(new Error('Error'));
      await controller.generarPrestamosActivos(req, res);
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error='));
    });
  });

  describe('generarHistorialSolicitante', () => {
    it('debe llamar al servicio con la cédula', async () => {
      req.body = { cedula: '123', formato: 'pdf' };
      await controller.generarHistorialSolicitante(req, res);
      expect(mockService.generarHistorialSolicitante).toHaveBeenCalledWith('123', 'pdf');
    });

    it('debe redirigir con error si falla', async () => {
      mockService.generarHistorialSolicitante.mockRejectedValue(new Error('Error'));
      await controller.generarHistorialSolicitante(req, res);
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error='));
    });
  });

  describe('generarRanking', () => {
    it('debe llamar al servicio con filtros', async () => {
      req.body = { periodo: 'mes', topN: '10', formato: 'excel' };
      await controller.generarRanking(req, res);
      expect(mockService.generarRanking).toHaveBeenCalledWith(
        { periodo: 'mes', topN: '10' }, 'excel'
      );
    });

    it('debe redirigir con error si falla', async () => {
      mockService.generarRanking.mockRejectedValue(new Error('Error'));
      await controller.generarRanking(req, res);
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error='));
    });
  });

  describe('generarVencidosContacto', () => {
    it('debe llamar al servicio', async () => {
      req.body = { diasMinimo: '5', formato: 'pdf' };
      await controller.generarVencidosContacto(req, res);
      expect(mockService.generarVencidosContacto).toHaveBeenCalledWith(
        { diasMinimo: '5' }, 'pdf'
      );
    });

    it('debe redirigir con error si falla', async () => {
      mockService.generarVencidosContacto.mockRejectedValue(new Error('Error'));
      await controller.generarVencidosContacto(req, res);
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error='));
    });
  });

  describe('generarEstadisticas', () => {
    it('debe llamar al servicio con fechas', async () => {
      req.body = { fechaDesde: '2026-01-01', fechaHasta: '2026-12-31', formato: 'excel' };
      await controller.generarEstadisticas(req, res);
      expect(mockService.generarEstadisticas).toHaveBeenCalledWith(
        { fechaDesde: '2026-01-01', fechaHasta: '2026-12-31' }, 'excel'
      );
    });

    it('debe redirigir con error si falla', async () => {
      mockService.generarEstadisticas.mockRejectedValue(new Error('Error'));
      await controller.generarEstadisticas(req, res);
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error='));
    });
  });

  describe('generarSuspendidos', () => {
    it('debe llamar al servicio con filtro', async () => {
      req.body = { tipoSuspension: 'permanente', formato: 'pdf' };
      await controller.generarSuspendidos(req, res);
      expect(mockService.generarSuspendidos).toHaveBeenCalledWith(
        { tipoSuspension: 'permanente' }, 'pdf'
      );
    });

    it('debe redirigir con error si falla', async () => {
      mockService.generarSuspendidos.mockRejectedValue(new Error('Error'));
      await controller.generarSuspendidos(req, res);
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error='));
    });
  });
});
