/**
 * @requirement RF-27 (Backup manual completo), RF-28 (Restaurar desde backup)
 * @use_case CU-27, CU-28
 * @description Pruebas unitarias del controlador de backup y restauración.
 */
const BackupController = require('../controllers/backupController');

describe('BackupController', () => {
  let controller;
  let mockBackupService;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockBackupService = {
      generarBackup: jest.fn(),
      limpiarBackup: jest.fn(),
      restaurarBackup: jest.fn()
    };

    controller = new BackupController(mockBackupService);

    req = {
      query: {},
      params: {},
      body: {},
      session: { usuarioId: 1 },
      file: null
    };

    res = {
      render: jest.fn(),
      redirect: jest.fn(),
      download: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };

    next = jest.fn();
  });

  describe('mostrarPanel', () => {
    it('debe renderizar admin/backup sin estado de backup', async () => {
      await controller.mostrarPanel(req, res, next);

      expect(res.render).toHaveBeenCalledWith('admin/backup', {
        page: 'backup',
        error: null,
        success: undefined,
        estadoBackup: null
      });
    });

    it('debe incluir estado de backup si cronService está seteado', async () => {
      const mockCronService = {
        verificarRutaBackup: jest.fn().mockResolvedValue({
          configurada: true, accesible: false, tieneBackupHoy: false,
          mensaje: 'Ruta no accesible'
        })
      };
      controller.setCronService(mockCronService);

      await controller.mostrarPanel(req, res, next);

      expect(mockCronService.verificarRutaBackup).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith('admin/backup', expect.objectContaining({
        estadoBackup: expect.objectContaining({ configurada: true, accesible: false })
      }));
    });

    it('debe llamar a next si el servicio falla', async () => {
      const error = new Error('Error');
      controller.cronService = { verificarRutaBackup: jest.fn().mockRejectedValue(error) };

      await controller.mostrarPanel(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('generar', () => {
    it('debe generar backup y descargar archivo', async () => {
      mockBackupService.generarBackup.mockResolvedValue({
        nombre: 'backup_2024-01-01_120000.zip',
        ruta: '/tmp/backup.zip',
        timestamp: '2024-01-01_120000'
      });
      res.download.mockImplementation((ruta, nombre, cb) => cb(null));

      await controller.generar(req, res, next);

      expect(mockBackupService.generarBackup).toHaveBeenCalledWith(1);
      expect(res.download).toHaveBeenCalledWith(
        '/tmp/backup.zip',
        'backup_2024-01-01_120000.zip',
        expect.any(Function)
      );
      expect(mockBackupService.limpiarBackup).toHaveBeenCalledWith('/tmp/backup.zip');
    });

    it('debe limpiar backup incluso si hay error en descarga', async () => {
      mockBackupService.generarBackup.mockResolvedValue({
        nombre: 'backup.zip', ruta: '/tmp/backup.zip'
      });
      res.download.mockImplementation((ruta, nombre, cb) => cb(new Error('download error')));

      await controller.generar(req, res, next);

      expect(mockBackupService.limpiarBackup).toHaveBeenCalledWith('/tmp/backup.zip');
      expect(next).toHaveBeenCalledWith(new Error('download error'));
    });

    it('debe redirigir con error si el servicio falla', async () => {
      mockBackupService.generarBackup.mockRejectedValue(new Error('Error al generar backup'));

      await controller.generar(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(
        '/admin/backup?error=Error%20al%20generar%20backup'
      );
    });
  });

  describe('mostrarRestaurar', () => {
    it('debe renderizar admin/restaurar', async () => {
      await controller.mostrarRestaurar(req, res, next);

      expect(res.render).toHaveBeenCalledWith('admin/restaurar', {
        page: 'restaurar',
        error: undefined,
        success: undefined
      });
    });
  });

  describe('restaurar', () => {
    it('debe restaurar desde archivo subido y redirigir con éxito', async () => {
      req.file = { path: '/tmp/upload.zip', originalname: 'backup.zip' };
      mockBackupService.restaurarBackup.mockResolvedValue({
        success: true, preRestore: '/tmp/pre_restore.zip'
      });

      await controller.restaurar(req, res, next);

      expect(mockBackupService.restaurarBackup).toHaveBeenCalledWith('/tmp/upload.zip', 1);
      expect(res.redirect).toHaveBeenCalledWith(
        '/admin/restaurar?success=Backup restaurado exitosamente'
      );
    });

    it('debe redirigir con error si no se subió archivo', async () => {
      await controller.restaurar(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('Debe seleccionar un archivo')
      );
    });

    it('debe redirigir con error si la restauración falla', async () => {
      req.file = { path: '/tmp/upload.zip' };
      mockBackupService.restaurarBackup.mockRejectedValue(new Error('SQL inválido'));

      await controller.restaurar(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('SQL%20inv%C3%A1lido')
      );
    });
  });
});
