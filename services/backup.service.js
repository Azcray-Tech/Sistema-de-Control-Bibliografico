/**
 * @requirement RF-27 (Backup manual completo), RF-28 (Restaurar desde backup), RF-29 (Backup automático diario)
 * @use_case CU-27, CU-28, CU-29
 * @description Servicio de backup y restore: generación de .zip con dump SQL + portadas, restauración y rotación.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const archiver = require('archiver');
const extract = require('extract-zip');
const mysql = require('mysql2/promise');

class BackupService {
  constructor(models, auditoria) {
    this.models = models;
    this.sequelize = models.sequelize;
    this.auditoria = auditoria;
    this.coversPath = path.join(__dirname, '..', 'public', 'images', 'covers');
    this.backupDir = path.join(__dirname, '..', 'backup');
  }

  async _generarDumpSQL() {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'ceela_biblioteca',
      multipleStatements: true
    });

    const tables = [
      'categoria', 'material', 'libro', 'revista', 'tesis', 'anuario',
      'articulo', 'autor', 'material_autor', 'articulo_autor',
      'ejemplar', 'solicitante', 'usuario_sistema', 'prestamo',
      'sancion', 'log_actividad', 'parametro'
    ];

    let sql = `-- Backup generado el ${new Date().toISOString()}\n`;
    sql += `-- Sistema de Control Bibliográfico CEELA\n\n`;
    sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    for (const table of tables) {
      const [rows] = await connection.query(`SELECT * FROM \`${table}\``);
      if (rows.length === 0) continue;

      const columns = Object.keys(rows[0]);
      const colNames = columns.map(c => `\`${c}\``).join(', ');

      for (const row of rows) {
        const values = columns.map(c => {
          const v = row[c];
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'number') return v;
          if (v instanceof Date) return `'${v.toISOString().split('T')[0]}'`;
          return `'${String(v).replace(/'/g, "\\'")}'`;
        }).join(', ');
        sql += `INSERT INTO \`${table}\` (${colNames}) VALUES (${values});\n`;
      }
      sql += '\n';
    }

    sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    await connection.end();
    return sql;
  }

  async generarBackup(usuarioId) {
    const now = new Date();
    const y = now.getFullYear();
    const M = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${y}-${M}-${d}_${h}${m}${s}`;
    const nombre = `backup_${timestamp}.zip`;
    const rutaTemp = path.join(os.tmpdir(), nombre);
    const output = fs.createWriteStream(rutaTemp);
    const archive = archiver('zip', { zlib: { level: 9 } });

    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);

      // Dump SQL
      archive.append('Generando dump SQL...', { name: 'info.txt' });

      // Generar dump y agregarlo al zip
      this._generarDumpSQL().then(sql => {
        archive.append(sql, { name: 'backup.sql' });

        // Agregar carpeta de portadas si existe
        if (fs.existsSync(this.coversPath)) {
          archive.directory(this.coversPath, 'portadas');
        }

        archive.finalize();
      }).catch(reject);
    });

    if (this.auditoria) {
      await this.auditoria({
        usuarioId,
        accion: 'BACKUP_MANUAL',
        tablaAfectada: 'sistema',
        valorNuevo: { nombre, tamaño: fs.statSync(rutaTemp).size }
      });
    }

    return { nombre, ruta: rutaTemp, timestamp };
  }

  async limpiarBackup(ruta) {
    try {
      if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
    } catch { /* ignore */ }
  }

  _getPreRestoreDir() {
    const dir = path.join(os.tmpdir(), 'ceela_pre_restore');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  _limpiarPreRestoresViejos() {
    const dir = this._getPreRestoreDir();
    const ahora = Date.now();
    const limite = 24 * 60 * 60 * 1000;
    fs.readdirSync(dir).forEach(f => {
      const full = path.join(dir, f);
      if (fs.statSync(full).isFile() && ahora - fs.statSync(full).mtimeMs > limite) {
        fs.unlinkSync(full);
      }
    });
  }

  _rutaMantenimiento() {
    return path.join(os.tmpdir(), 'ceela_MAINTENANCE_MODE');
  }

  _activarModoMantenimiento() {
    fs.writeFileSync(this._rutaMantenimiento(), `Sistema en mantenimiento — ${new Date().toISOString()}`);
  }

  _desactivarModoMantenimiento() {
    try { if (fs.existsSync(this._rutaMantenimiento())) fs.unlinkSync(this._rutaMantenimiento()); } catch { }
  }

  async _getConnection() {
    return mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'ceela_biblioteca',
      multipleStatements: true
    });
  }

  async _borrarDatosExistentes() {
    const connection = await this._getConnection();
    try {
      const tables = [
        'articulo_autor', 'material_autor', 'articulo', 'ejemplar',
        'prestamo', 'sancion', 'log_actividad', 'autor',
        'anuario', 'tesis', 'revista', 'libro', 'material',
        'solicitante', 'usuario_sistema', 'categoria', 'parametro'
      ];
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const t of tables) {
        await connection.query(`DELETE FROM \`${t}\``);
      }
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      await connection.end();
    }
  }

  async _generarPreRestore() {
    this._limpiarPreRestoresViejos();
    const now = new Date();
    const y = now.getFullYear();
    const M = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const nombre = `backup_pre_restore_${y}-${M}-${d}_${h}${m}${s}.zip`;

    const rutaTemp = path.join(os.tmpdir(), nombre);
    const output = fs.createWriteStream(rutaTemp);
    const archive = archiver('zip', { zlib: { level: 9 } });

    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);

      this._generarDumpSQL().then(sql => {
        archive.append(sql, { name: 'backup.sql' });
        if (fs.existsSync(this.coversPath)) {
          archive.directory(this.coversPath, 'portadas');
        }
        archive.finalize();
      }).catch(reject);
    });

    const destino = path.join(this._getPreRestoreDir(), nombre);
    fs.copyFileSync(rutaTemp, destino);
    try { fs.unlinkSync(rutaTemp); } catch { }

    return destino;
  }

  async restaurarBackup(archivoZip, usuarioId) {
    const tempDir = path.join(os.tmpdir(), `restore_${Date.now()}`);
    const dirPortadas = path.join(tempDir, 'portadas');
    let preRestorePath = null;

    try {
      // Extraer zip subido
      await extract(archivoZip, { dir: tempDir });

      const sqlPath = path.join(tempDir, 'backup.sql');
      if (!fs.existsSync(sqlPath)) {
        throw new Error('El archivo de backup no contiene backup.sql');
      }

      // 1. Generar backup pre-restore
      preRestorePath = await this._generarPreRestore();

      // 2. Ejecutar restore
      const sql = fs.readFileSync(sqlPath, 'utf8');
      const connection = await this._getConnection();
      try {
        await this._borrarDatosExistentes();
        await connection.query(sql);
      } finally {
        await connection.end();
      }

      // 3. Restaurar portadas
      if (fs.existsSync(dirPortadas)) {
        const archivos = fs.readdirSync(dirPortadas);
        for (const archivo of archivos) {
          const src = path.join(dirPortadas, archivo);
          const dst = path.join(this.coversPath, archivo);
          fs.copyFileSync(src, dst);
        }
      }

      // 4. Resetear secuencias auto-incrementales
      const connection2 = await this._getConnection();
      try {
        const [tables] = await connection2.query(
          "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND AUTO_INCREMENT IS NOT NULL",
          [process.env.DB_NAME || 'ceela_biblioteca']
        );
        for (const t of tables) {
          await connection2.query(`ALTER TABLE \`${t.TABLE_NAME}\` AUTO_INCREMENT = 0`);
        }
      } finally {
        await connection2.end();
      }

      // 5. Éxito — limpiar modo mantenimiento y auditar
      this._desactivarModoMantenimiento();

      if (this.auditoria) {
        await this.auditoria({
          usuarioId,
          accion: 'RESTORE_BACKUP',
          tablaAfectada: 'sistema',
          valorNuevo: { archivo: path.basename(archivoZip), preRestore: path.basename(preRestorePath) }
        });
      }

      return { success: true, preRestore: preRestorePath };
    } catch (err) {
      // 6. Falló — intentar restaurar desde pre-restore
      const errorOriginal = err.message;

      if (preRestorePath && fs.existsSync(preRestorePath)) {
        try {
          const tempRollback = path.join(os.tmpdir(), `rollback_${Date.now()}`);
          fs.mkdirSync(tempRollback, { recursive: true });
          await extract(preRestorePath, { dir: tempRollback });

          const rollbackSql = fs.readFileSync(path.join(tempRollback, 'backup.sql'), 'utf8');
          const conn = await this._getConnection();
          try {
            await this._borrarDatosExistentes();
            await conn.query(rollbackSql);
          } finally {
            await conn.end();
          }

          // Restaurar portadas del pre-restore
          const prePortadas = path.join(tempRollback, 'portadas');
          if (fs.existsSync(prePortadas)) {
            fs.readdirSync(prePortadas).forEach(f => {
              fs.copyFileSync(path.join(prePortadas, f), path.join(this.coversPath, f));
            });
          }

          // Limpiar temp rollback
          const eliminar = (dir) => {
            if (fs.existsSync(dir)) {
              fs.readdirSync(dir).forEach(e => {
                const full = path.join(dir, e);
                if (fs.statSync(full).isDirectory()) eliminar(full);
                else fs.unlinkSync(full);
              });
              fs.rmdirSync(dir);
            }
          };
          eliminar(tempRollback);

          this._activarModoMantenimiento();

          const errorMsg = `Falló la restauración y se realizó rollback automático. Error original: ${errorOriginal}`;
          if (this.auditoria) {
            await this.auditoria({
              usuarioId,
              accion: 'RESTORE_FALLIDO_CON_ROLLBACK',
              tablaAfectada: 'sistema',
              valorNuevo: { error: errorOriginal, preRestoreUsado: path.basename(preRestorePath) }
            });
          }
          throw new Error(errorMsg);
        } catch (rollbackErr) {
          // Incluso el rollback falló — modo mantenimiento extremo
          this._activarModoMantenimiento();
          const critico = `FALLO CRÍTICO: Restauración y rollback fallaron. Error original: ${errorOriginal}. Error rollback: ${rollbackErr.message}. Sistema en modo mantenimiento.`;
          console.error(critico);
          if (this.auditoria) {
            await this.auditoria({
              usuarioId,
              accion: 'RESTORE_FALLIDO_SIN_ROLLBACK',
              tablaAfectada: 'sistema',
              valorNuevo: { error: errorOriginal, errorRollback: rollbackErr.message }
            });
          }
          throw new Error(critico);
        }
      }

      // No había pre-restore disponible
      this._activarModoMantenimiento();
      throw err;
    } finally {
      // Limpiar directorio temporal
      if (fs.existsSync(tempDir)) {
        const eliminar = (dir) => {
          if (fs.existsSync(dir)) {
            fs.readdirSync(dir).forEach(entry => {
              const full = path.join(dir, entry);
              if (fs.statSync(full).isDirectory()) eliminar(full);
              else fs.unlinkSync(full);
            });
            fs.rmdirSync(dir);
          }
        };
        eliminar(tempDir);
      }
    }
  }

  async limpiarBackup(ruta) {
    try {
      if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
    } catch { /* ignore */ }
  }
}

module.exports = BackupService;
