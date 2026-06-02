/**
 * @requirement RF-21 (Modificar parámetros globales)
 * @use_case CU-21
 * @description Pruebas unitarias del controlador de parámetros del sistema.
 */
const ParametroController = require('../controllers/parametroController');

describe('ParametroController', () => {
  let controller;
  let mockParametroService;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockParametroService = {
      obtenerTodos: jest.fn().mockResolvedValue([
        { clave: 'dias_prestamo', valor: '7' },
        { clave: 'factor_sancion', valor: '2' }
      ]),
      obtenerTexto: jest.fn().mockResolvedValue('09:00'),
      actualizar: jest.fn().mockResolvedValue(undefined)
    };

    controller = new ParametroController(mockParametroService);

    req = {
      query: {},
      params: {},
      body: {},
      session: { usuarioId: 1 }
    };

    res = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };

    next = jest.fn();
  });

  describe('mostrarFormulario', () => {
    it('debe renderizar admin/parametros con los parámetros cargados', async () => {
      await controller.mostrarFormulario(req, res, next);

      expect(mockParametroService.obtenerTodos).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith('admin/parametros', expect.objectContaining({
        page: 'configuracion',
        parametros: expect.objectContaining({
          dias_prestamo: '7',
          factor_sancion: '2'
        })
      }));
    });

    it('debe llamar a next si el servicio falla', async () => {
      const error = new Error('DB error');
      mockParametroService.obtenerTodos.mockRejectedValue(error);

      await controller.mostrarFormulario(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('guardar', () => {
    it('debe actualizar parámetros y redirigir con éxito', async () => {
      req.body = {
        dias_prestamo: '10',
        factor_sancion: '3',
        hora_backup_automatico: '09:00'
      };

      await controller.guardar(req, res, next);

      expect(mockParametroService.actualizar).toHaveBeenCalledWith(
        expect.objectContaining({ dias_prestamo: '10', factor_sancion: '3' }),
        1
      );
      expect(res.redirect).toHaveBeenCalledWith('/admin/configuracion?success=actualizado');
    });

    it('debe convertir checkbox no marcado a "0"', async () => {
      req.body = { dias_prestamo: '7' };

      await controller.guardar(req, res, next);

      expect(mockParametroService.actualizar).toHaveBeenCalledWith(
        expect.objectContaining({ backup_auto_habilitado: '0' }),
        1
      );
    });

    it('debe reprogramar el cron si la hora de backup cambió', async () => {
      const mockCronService = { reprogramarBackup: jest.fn() };
      controller.setCronService(mockCronService);

      mockParametroService.obtenerTexto.mockResolvedValue('09:00');
      req.body = { hora_backup_automatico: '14:30' };

      await controller.guardar(req, res, next);

      expect(mockCronService.reprogramarBackup).toHaveBeenCalled();
    });

    it('debe NO reprogramar el cron si la hora no cambió', async () => {
      const mockCronService = { reprogramarBackup: jest.fn() };
      controller.setCronService(mockCronService);

      mockParametroService.obtenerTexto.mockResolvedValue('09:00');
      req.body = { hora_backup_automatico: '09:00' };

      await controller.guardar(req, res, next);

      expect(mockCronService.reprogramarBackup).not.toHaveBeenCalled();
    });

    it('debe re-renderizar el formulario con error si la actualización falla', async () => {
      mockParametroService.actualizar.mockRejectedValue(new Error('Formato de hora inválido'));
      req.body = { hora_backup_automatico: '25:00' };

      await controller.guardar(req, res, next);

      expect(res.render).toHaveBeenCalledWith('admin/parametros', expect.objectContaining({
        page: 'configuracion',
        error: 'Formato de hora inválido'
      }));
    });
  });
});
