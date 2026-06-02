/**
 * @requirement RF-19 (Suspensión automática por morosidad extrema), RF-29 (Backup automático diario)
 * @use_case CU-19, CU-29
 * @description Pruebas unitarias del servicio de tareas programadas (cron).
 */
const fs = require('fs');
const path = require('path');

jest.mock('node-cron');

const cron = require('node-cron');

const CronService = require('../services/cron.service');
const { crearMocksModelos, mockAuditoria } = require('./mocks/models');
const BackupService = require('../services/backup.service');

const crearParametroServiceMock = () => ({
  obtener: jest.fn().mockImplementation(async (clave, defecto) => {
    const valores = {
      factor_sancion: 2,
      suspension_maxima: 30,
      backup_auto_habilitado: '1'
    };
    return valores[clave] ?? defecto;
  }),
  obtenerTexto: jest.fn().mockResolvedValue('09:00'),
  obtenerTodos: jest.fn().mockResolvedValue([]),
  actualizar: jest.fn().mockResolvedValue(undefined)
});

describe('CronService', () => {
  let cronService;
  let mocks;
  let mockParametroService;
  let mockBackupService;
  let mockTask;

  beforeEach(() => {
    mocks = crearMocksModelos();
    mockParametroService = crearParametroServiceMock();
    mockBackupService = {
      generarBackup: jest.fn().mockResolvedValue({
        nombre: 'backup_2024-01-01_120000.zip',
        ruta: '/tmp/backup.zip'
      }),
      limpiarBackup: jest.fn()
    };

    mockTask = {
      destroy: jest.fn()
    };
    cron.schedule = jest.fn().mockReturnValue(mockTask);

    cronService = new CronService(mocks, mockAuditoria, mockBackupService, mockParametroService);
    mockAuditoria.mockClear();

    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.readdirSync = jest.fn().mockReturnValue([]);
    fs.statSync = jest.fn().mockReturnValue({ mtime: new Date(), size: 1234 });
    fs.copyFileSync = jest.fn();
    fs.unlinkSync = jest.fn();
  });

  describe('ejecutarSuspensionAutomatica', () => {
    it('debe crear sanción para préstamos vencidos', async () => {
      const hoy = new Date();
      const fechaPasada = new Date(hoy);
      fechaPasada.setDate(fechaPasada.getDate() - 15);

      const mockSolicitante = {
        cedula: '123',
        estado: 'Activo',
        update: jest.fn().mockResolvedValue(undefined)
      };

      mocks.Prestamo.findAll = jest.fn().mockResolvedValue([
        {
          idPrestamo: 1,
          fechaDevolucionPrevista: fechaPasada,
          fechaDevolucionReal: null,
          estado: 'Activo',
          Solicitante: mockSolicitante
        }
      ]);
      mocks.Sancion.create = jest.fn().mockResolvedValue({});
      mocks.Solicitante.findAll = jest.fn().mockResolvedValue([]);

      await cronService.ejecutarSuspensionAutomatica();

      expect(mocks.Sancion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          solicitanteCedula: '123',
          diasSancion: expect.any(Number)
        })
      );
      expect(mockSolicitante.update).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'Suspendido temporal' })
      );
      expect(mockAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'SUSPENSION_AUTOMATICA' })
      );
    });

    it('debe calcular sanción con factor y tope', async () => {
      mockParametroService.obtener.mockImplementation(async (clave, defecto) => {
        if (clave === 'factor_sancion') return 5;
        if (clave === 'suspension_maxima') return 20;
        return defecto;
      });

      const hoy = new Date();
      const fechaPasada = new Date(hoy);
      fechaPasada.setDate(fechaPasada.getDate() - 10);

      const mockSolicitante = {
        cedula: '123',
        estado: 'Activo',
        update: jest.fn().mockResolvedValue(undefined)
      };

      mocks.Prestamo.findAll = jest.fn().mockResolvedValue([
        {
          idPrestamo: 1,
          fechaDevolucionPrevista: fechaPasada,
          fechaDevolucionReal: null,
          estado: 'Activo',
          Solicitante: mockSolicitante
        }
      ]);
      mocks.Sancion.create = jest.fn().mockResolvedValue({});
      mocks.Solicitante.findAll = jest.fn().mockResolvedValue([]);

      await cronService.ejecutarSuspensionAutomatica();

      // 10 retraso * 5 factor = 50, tope 20 → debe ser 20
      expect(mocks.Sancion.create).toHaveBeenCalledWith(
        expect.objectContaining({ diasSancion: 20 })
      );
    });

    it('debe transicionar temporales a permanentes si vencen con préstamos activos', async () => {
      const hoy = new Date();
      const fechaVencida = new Date(hoy);
      fechaVencida.setDate(fechaVencida.getDate() - 1);

      mocks.Prestamo.findAll = jest.fn().mockResolvedValue([]);

      const mockSolicitantePer = {
        cedula: '456',
        estado: 'Suspendido temporal',
        fechaFinSuspension: fechaVencida,
        Prestamos: [{ idPrestamo: 1 }],
        update: jest.fn().mockResolvedValue(undefined)
      };

      mocks.Solicitante.findAll = jest.fn().mockResolvedValue([mockSolicitantePer]);

      await cronService.ejecutarSuspensionAutomatica();

      expect(mockSolicitantePer.update).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'Suspendido permanente' })
      );
      expect(mockAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'SUSPENSION_PERMANENTE' })
      );
    });

    it('debe saltar solicitantes sin préstamos activos al transicionar a permanente', async () => {
      const hoy = new Date();
      const fechaVencida = new Date(hoy);
      fechaVencida.setDate(fechaVencida.getDate() - 1);

      mocks.Prestamo.findAll = jest.fn().mockResolvedValue([]);

      const mockSinPrestamos = {
        cedula: '789',
        estado: 'Suspendido temporal',
        fechaFinSuspension: fechaVencida,
        Prestamos: [],
        update: jest.fn()
      };

      mocks.Solicitante.findAll = jest.fn().mockResolvedValue([mockSinPrestamos]);

      await cronService.ejecutarSuspensionAutomatica();

      expect(mockSinPrestamos.update).not.toHaveBeenCalled();
    });
  });

  describe('ejecutarBackupAutomatico', () => {
    it('debe salir si está deshabilitado', async () => {
      mockParametroService.obtener.mockResolvedValue('0');

      await cronService.ejecutarBackupAutomatico();

      expect(mockBackupService.generarBackup).not.toHaveBeenCalled();
    });

    it('debe salir si no hay ruta configurada', async () => {
      mockParametroService.obtenerTexto.mockResolvedValue('');

      await cronService.ejecutarBackupAutomatico();

      expect(mockBackupService.generarBackup).not.toHaveBeenCalled();
    });

    it('debe salir si la ruta no es accesible', async () => {
      fs.existsSync = jest.fn().mockReturnValue(false);

      await cronService.ejecutarBackupAutomatico();

      expect(mockBackupService.generarBackup).not.toHaveBeenCalled();
    });

    it('debe salir si ya existe backup del día', async () => {
      const hoy = new Date();
      const y = hoy.getFullYear();
      const M = String(hoy.getMonth() + 1).padStart(2, '0');
      const d = String(hoy.getDate()).padStart(2, '0');
      fs.readdirSync = jest.fn().mockReturnValue([`backup_${y}-${M}-${d}_000000.zip`]);

      await cronService.ejecutarBackupAutomatico();

      expect(mockBackupService.generarBackup).not.toHaveBeenCalled();
    });

    it('debe generar backup y copiar a la ruta destino', async () => {
      fs.readdirSync = jest.fn().mockReturnValue([]);

      await cronService.ejecutarBackupAutomatico();

      expect(mockBackupService.generarBackup).toHaveBeenCalledWith(null);
      expect(fs.copyFileSync).toHaveBeenCalled();
      expect(mockBackupService.limpiarBackup).toHaveBeenCalled();
    });

    it('debe rotar a 7 backups si hay más', async () => {
      const archivos = [];
      for (let i = 0; i < 10; i++) {
        archivos.push({ nombre: `backup_2024-01-${String(i + 1).padStart(2, '0')}_120000.zip`, ruta: `/ruta/backup_${i}.zip`, mtime: new Date(2024, 0, i + 1) });
      }
      fs.readdirSync = jest.fn().mockReturnValue(archivos.map(a => a.nombre));
      fs.statSync = jest.fn().mockImplementation((ruta) => {
        const idx = archivos.findIndex(a => a.ruta === ruta);
        return { mtime: idx >= 0 ? archivos[idx].mtime : new Date(), size: 1234 };
      });

      // We need to mock fs.readdirSync's filtering in ejecutarBackupAutomatico
      // The actual implementation filters by startsWith('backup_') and endsWith('.zip')
      // Our mock names already match that pattern
      // But fs.statSync will be called on the joined path, so we need to handle it
      const unlinkSync = jest.fn();
      fs.unlinkSync = unlinkSync;
      // The implementation joins ruta + nombre, so our statSync needs to handle /ruta/backup_X.zip
      fs.statSync = jest.fn().mockImplementation((p) => {
        // Find matching archivo by ruta
        const match = archivos.find(a => a.ruta === p);
        return { mtime: match ? match.mtime : new Date(), size: 1234 };
      });

      await cronService.ejecutarBackupAutomatico();

      // Deberían eliminarse 3 (10 - 7 = 3)
      expect(fs.unlinkSync).toHaveBeenCalledTimes(3);
    });

    it('debe no rotar si hay exactamente 7 o menos backups', async () => {
      const archivos = [];
      for (let i = 0; i < 5; i++) {
        archivos.push({ nombre: `backup_2024-01-${String(i + 1).padStart(2, '0')}_120000.zip`, ruta: `/ruta/backup_${i}.zip`, mtime: new Date(2024, 0, i + 1) });
      }
      fs.readdirSync = jest.fn().mockReturnValue(archivos.map(a => a.nombre));
      fs.statSync = jest.fn().mockImplementation((p) => {
        const match = archivos.find(a => a.ruta === p);
        return { mtime: match ? match.mtime : new Date(), size: 1234 };
      });
      fs.unlinkSync = jest.fn();

      await cronService.ejecutarBackupAutomatico();

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('debe no fallar si el backupService lanza error', async () => {
      mockBackupService.generarBackup.mockRejectedValue(new Error('Error de conexión'));

      await expect(cronService.ejecutarBackupAutomatico()).resolves.not.toThrow();
    });
  });

  describe('reprogramarBackup', () => {
    it('debe destruir tarea anterior y programar nueva según hora', async () => {
      cronService.reprogramarBackup();

      // Esperar a que la promesa se resuelva
      await new Promise(process.nextTick);

      expect(mockTask.destroy).not.toHaveBeenCalled(); // primera vez, no hay tarea previa
      expect(cron.schedule).toHaveBeenCalled();
      expect(mockParametroService.obtenerTexto).toHaveBeenCalledWith('hora_backup_automatico', '09:00');
    });

    it('debe destruir tarea existente si ya hay una', async () => {
      cronService._backupTask = mockTask;

      cronService.reprogramarBackup();

      await new Promise(process.nextTick);

      expect(mockTask.destroy).toHaveBeenCalled();
    });
  });

  describe('verificarRutaBackup', () => {
    it('debe indicar que no está configurada si no hay ruta', async () => {
      mockParametroService.obtenerTexto.mockResolvedValue('');
      const resultado = await cronService.verificarRutaBackup();
      expect(resultado).toEqual({ configurada: false, accesible: false, mensaje: 'Ruta no configurada' });
    });

    it('debe indicar ruta configurada pero no accesible', async () => {
      mockParametroService.obtenerTexto.mockResolvedValue('D:\\backups');
      fs.existsSync = jest.fn().mockReturnValue(false);
      const resultado = await cronService.verificarRutaBackup();
      expect(resultado).toEqual({
        configurada: true, accesible: false, tieneBackupHoy: false,
        mensaje: 'La ruta configurada no es accesible'
      });
    });

    it('debe indicar ruta accesible con backup del día', async () => {
      mockParametroService.obtenerTexto.mockResolvedValue('D:\\backups');
      fs.existsSync = jest.fn().mockReturnValue(true);
      const hoy = new Date();
      const y = hoy.getFullYear();
      const M = String(hoy.getMonth() + 1).padStart(2, '0');
      const d = String(hoy.getDate()).padStart(2, '0');
      fs.readdirSync = jest.fn().mockReturnValue([`backup_${y}-${M}-${d}_000000.zip`]);

      const resultado = await cronService.verificarRutaBackup();
      expect(resultado).toEqual({
        configurada: true, accesible: true, tieneBackupHoy: true,
        mensaje: null
      });
    });
  });

  describe('_horaAExpresionCron', () => {
    it('debe convertir HH:MM a expresión cron', () => {
      const expr = cronService._horaAExpresionCron('14:30');
      expect(expr).toBe('30 14 * * *');
    });

    it('debe manejar medianoche', () => {
      const expr = cronService._horaAExpresionCron('00:00');
      expect(expr).toBe('0 0 * * *');
    });
  });
});
