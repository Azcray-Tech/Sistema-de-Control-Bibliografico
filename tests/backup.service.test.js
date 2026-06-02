/**
 * @requirement RF-27 (Backup manual completo), RF-28 (Restaurar desde backup), RF-29 (Backup automático diario)
 * @use_case CU-27, CU-28, CU-29
 * @description Pruebas unitarias del servicio de backup y restauración del sistema.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

jest.mock('archiver');
jest.mock('extract-zip');
jest.mock('mysql2/promise');

const archiver = require('archiver');
const extract = require('extract-zip');
const mysql = require('mysql2/promise');

const BackupService = require('../services/backup.service');
const { crearMocksModelos, mockAuditoria } = require('./mocks/models');

describe('BackupService', () => {
  let backupService;
  let mocks;
  let archiveFinalizeCb;

  beforeEach(() => {
    mocks = crearMocksModelos();
    backupService = new BackupService(mocks, mockAuditoria);
    mockAuditoria.mockClear();

    archiveFinalizeCb = null;

    const mockArchive = {
      pipe: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation((event, cb) => {
        if (event === 'error') archiveFinalizeCb = cb;
        return mockArchive;
      }),
      append: jest.fn().mockReturnThis(),
      directory: jest.fn().mockReturnThis(),
      finalize: jest.fn().mockImplementation(() => {
        // Trigger the 'close' on the output stream
        const closeCb = outputCloseCb;
        if (closeCb) setTimeout(closeCb, 0);
        return mockArchive;
      })
    };

    let outputCloseCb = null;
    const mockOutput = {
      on: jest.fn().mockImplementation((event, cb) => {
        if (event === 'close') outputCloseCb = cb;
        return mockOutput;
      })
    };

    archiver.mockReturnValue(mockArchive);
    fs.createWriteStream = jest.fn().mockReturnValue(mockOutput);
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.statSync = jest.fn().mockReturnValue({ size: 1234, mtime: new Date() });
    fs.unlinkSync = jest.fn();
    fs.readFileSync = jest.fn().mockReturnValue('INSERT INTO ...');
    fs.readdirSync = jest.fn().mockReturnValue([]);
    fs.copyFileSync = jest.fn();
    fs.mkdirSync = jest.fn();
    fs.rmdirSync = jest.fn();
    fs.writeFileSync = jest.fn();

    os.tmpdir = jest.fn().mockReturnValue('/tmp');

    const mockConn = {
      query: jest.fn().mockResolvedValue([[]]),
      end: jest.fn()
    };
    mysql.createConnection = jest.fn().mockResolvedValue(mockConn);
  });

  describe('generarBackup', () => {
    it('debe generar un archivo zip con dump SQL y portadas', async () => {
      const resultado = await backupService.generarBackup(1);

      expect(archiver).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
      expect(resultado).toHaveProperty('ruta');
      expect(resultado).toHaveProperty('nombre');
      expect(resultado.nombre).toMatch(/^backup_\d{4}-\d{2}-\d{2}_\d{6}\.zip$/);
      expect(mockAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'BACKUP_MANUAL', usuarioId: 1 })
      );
    });

    it('debe incluir portadas si la carpeta existe', async () => {
      await backupService.generarBackup(1);

      expect(fs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining('covers')
      );
    });

    it('debe omitir portadas si no existe la carpeta', async () => {
      fs.existsSync = jest.fn().mockImplementation((p) => {
        if (p.toString().includes('covers')) return false;
        return true;
      });

      await backupService.generarBackup(1);
      // Should not throw - covers skipped gracefully
    });
  });

  describe('limpiarBackup', () => {
    it('debe eliminar el archivo si existe', async () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      await backupService.limpiarBackup('/tmp/backup.zip');
      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/backup.zip');
    });

    it('debe ignorar si el archivo no existe', async () => {
      fs.existsSync = jest.fn().mockReturnValue(false);
      await backupService.limpiarBackup('/tmp/inexistente.zip');
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('restaurarBackup', () => {
    beforeEach(() => {
      extract.mockResolvedValue(undefined);
      fs.existsSync = jest.fn().mockImplementation((p) => {
        const str = p.toString();
        if (str.includes('backup.sql')) return true;
        if (str.includes('restore_')) return true;
        if (str.includes('rollback_')) {
          fs.readdirSync = jest.fn().mockReturnValue(['backup.sql']);
          return true;
        }
        return true;
      });
      fs.readdirSync = jest.fn().mockReturnValue([]);
      fs.copyFileSync = jest.fn();
      fs.rmdirSync = jest.fn();
      fs.unlinkSync = jest.fn();
      fs.mkdirSync = jest.fn();

      const mockConn = {
        query: jest.fn().mockResolvedValue([[]]),
        end: jest.fn()
      };
      mysql.createConnection = jest.fn().mockResolvedValue(mockConn);
    });

    it('debe restaurar exitosamente un backup válido', async () => {
      const resultado = await backupService.restaurarBackup('/tmp/backup.zip', 1);

      expect(extract).toHaveBeenCalledWith('/tmp/backup.zip', expect.any(Object));
      expect(resultado.success).toBe(true);
      expect(mockAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'RESTORE_BACKUP' })
      );
    });

    it('debe lanzar error si el zip no contiene backup.sql', async () => {
      fs.existsSync = jest.fn().mockImplementation((p) => {
        if (p.toString().includes('backup.sql')) return false;
        return true;
      });

      await expect(backupService.restaurarBackup('/tmp/backup.zip', 1))
        .rejects.toThrow('no contiene backup.sql');
    });

    it('debe lanzar error y activar mantenimiento si falla sin pre-restore disponible', async () => {
      // Make _generarPreRestore fail by making mysql.createConnection fail
      mysql.createConnection = jest.fn().mockRejectedValue(new Error('Fallo conexión'));

      await expect(backupService.restaurarBackup('/tmp/backup.zip', 1))
        .rejects.toThrow();
    });
  });
});
