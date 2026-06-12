/**
 * @requirement RF-27 (Backup manual completo), RF-28 (Restaurar desde backup), RF-29 (Backup automático diario)
 * @use_case CU-27, CU-28, CU-29
 * @description Pruebas unitarias del servicio de backup y restauración del sistema.
 */
const fs = require('fs');
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

  beforeEach(() => {
    mocks = crearMocksModelos();
    backupService = new BackupService(mocks, mockAuditoria);
    mockAuditoria.mockClear();

    const mockArchive = {
      pipe: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation((_event, _cb) => {
        return mockArchive;
      }),
      append: jest.fn().mockReturnThis(),
      directory: jest.fn().mockReturnThis(),
      finalize: jest.fn().mockImplementation(() => {
        // Trigger the 'close' on the output stream
        const closeCb = outputCloseCb;
        if (closeCb) {setTimeout(closeCb, 0);}
        return mockArchive;
      })
    };

    let outputCloseCb = null;
    const mockOutput = {
      on: jest.fn().mockImplementation((event, cb) => {
        if (event === 'close') {outputCloseCb = cb;}
        return mockOutput;
      })
    };

    archiver.mockReturnValue(mockArchive);
    fs.createWriteStream = jest.fn().mockReturnValue(mockOutput);
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.statSync = jest.fn().mockReturnValue({ size: 1234, mtime: new Date(), mtimeMs: Date.now(), isDirectory: () => false });
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
        if (p.toString().includes('covers')) {return false;}
        return true;
      });

      await backupService.generarBackup(1);
      // Should not throw - covers skipped gracefully
    });

    it('debe generar INSERTs con tipos variados en dump SQL', async () => {
      const mockConn = {
        query: jest.fn().mockImplementation(async (sql) => {
          if (sql.includes('categoria')) {
            return [[{ idCategoria: 1, nombre: 'Ficción', activa: true }]];
          }
          if (sql.includes('material')) {
            return [[{
              idMaterial: 1, titulo: 'Libro X', tipo: 'libro',
              anioPublicacion: 2024, precio: 29.99,
              fechaCreacion: new Date('2024-06-01'), sinopsis: null
            }]];
          }
          return [[]];
        }),
        end: jest.fn()
      };
      mysql.createConnection = jest.fn().mockResolvedValue(mockConn);

      await backupService.generarBackup(1);

      const archiveInstance = archiver();
      expect(archiveInstance.append).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO `categoria`"),
        { name: 'backup.sql' }
      );
      expect(archiveInstance.append).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO `material`"),
        { name: 'backup.sql' }
      );
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

    it('debe capturar error si unlinkSync lanza excepción', async () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.unlinkSync = jest.fn().mockImplementation(() => { throw new Error('Permiso denegado'); });

      await expect(backupService.limpiarBackup('/tmp/backup.zip')).resolves.not.toThrow();
    });
  });

  describe('restaurarBackup', () => {
    beforeEach(() => {
      extract.mockResolvedValue(undefined);
      fs.existsSync = jest.fn().mockImplementation((p) => {
        const str = p.toString();
        if (str.includes('backup.sql')) {return true;}
        if (str.includes('restore_')) {return true;}
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
        if (p.toString().includes('backup.sql')) {return false;}
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

    it('debe copiar portadas durante restore si existen', async () => {
      fs.readdirSync = jest.fn().mockImplementation((p) => {
        const str = p.toString();
        if (str.includes('portadas')) {return ['cubierta.jpg'];}
        return [];
      });
      fs.copyFileSync = jest.fn();

      await backupService.restaurarBackup('/tmp/backup.zip', 1);

      expect(fs.copyFileSync).toHaveBeenCalledWith(
        expect.stringContaining('cubierta.jpg'),
        expect.stringContaining('covers')
      );
    });

    it('debe resetear auto-increment de tablas durante restore', async () => {
      const mockConn = {
        query: jest.fn().mockImplementation(async (sql) => {
          if (sql.includes('INFORMATION_SCHEMA')) {
            return [[{ TABLE_NAME: 'categoria' }, { TABLE_NAME: 'material' }]];
          }
          return [[]];
        }),
        end: jest.fn()
      };
      mysql.createConnection = jest.fn().mockResolvedValue(mockConn);

      await backupService.restaurarBackup('/tmp/backup.zip', 1);

      const connCall = await mysql.createConnection.mock.results[0].value;
      expect(connCall.query).toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE')
      );
    });

    it('debe limpiar directorio temporal recursivamente con subdirectorios', async () => {
      fs.readdirSync = jest.fn().mockImplementation((p) => {
        const str = p.toString();
        if (str.includes('subdir') && !str.includes('inner.txt')) {
          return ['inner.txt'];
        }
        if (str.includes('restore_') && !str.includes('inner.txt')) {
          return ['subdir', 'file.txt'];
        }
        return [];
      });
      fs.statSync = jest.fn().mockImplementation((p) => {
        const str = p.toString();
        if (str.includes('subdir') && !str.includes('inner.txt') && !str.includes('file.txt')) {
          return { isDirectory: () => true, mtime: new Date(), mtimeMs: Date.now() };
        }
        if (str.includes('restore_') && !str.includes('subdir') && !str.includes('file.txt')) {
          return { isDirectory: () => true, mtime: new Date(), mtimeMs: Date.now() };
        }
        return { isDirectory: () => false, mtime: new Date(), size: 100, mtimeMs: Date.now() };
      });

      await backupService.restaurarBackup('/tmp/backup.zip', 1);

      expect(fs.rmdirSync).toHaveBeenCalled();
    });

    it('debe hacer rollback automático si restore falla con pre-restore disponible', async () => {
      const mockConnOk = {
        query: jest.fn().mockResolvedValue([[]]),
        end: jest.fn()
      };
      mysql.createConnection = jest.fn()
        .mockResolvedValueOnce(mockConnOk)   // _generarDumpSQL en _generarPreRestore
        .mockRejectedValueOnce(new Error('Error al ejecutar SQL'))  // _ejecutarSqlScript original
        .mockResolvedValue(mockConnOk);      // _ejecutarSqlScript en rollback

      await expect(backupService.restaurarBackup('/tmp/backup.zip', 1))
        .rejects.toThrow('Falló la restauración');

      expect(mockAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'RESTORE_FALLIDO_CON_ROLLBACK' })
      );
    });

    it('debe activar mantenimiento si restore falla y rollback también falla', async () => {
      const mockConnOk = {
        query: jest.fn().mockResolvedValue([[]]),
        end: jest.fn()
      };
      mysql.createConnection = jest.fn()
        .mockResolvedValueOnce(mockConnOk)   // _generarDumpSQL en _generarPreRestore
        .mockRejectedValueOnce(new Error('Error al ejecutar SQL'));  // _ejecutarSqlScript
      extract
        .mockResolvedValueOnce(undefined)    // extract inicial en restaurarBackup (éxito)
        .mockRejectedValueOnce(new Error('Error al extraer rollback'));  // extract en rollback

      await expect(backupService.restaurarBackup('/tmp/backup.zip', 1))
        .rejects.toThrow('FALLO CRÍTICO');

      expect(mockAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'RESTORE_FALLIDO_SIN_ROLLBACK' })
      );
    });
  });
});
