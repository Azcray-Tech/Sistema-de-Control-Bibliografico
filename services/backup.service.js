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
      if (rows.length === 0) {continue;}

      const columns = Object.keys(rows[0]);
      const colNames = columns.map(c => `\`${c}\``).join(', ');

      for (const row of rows) {
        const values = columns.map(c => {
          const v = row[c];
          if (v === null || v === undefined) {return 'NULL';}
          if (typeof v === 'number') {return v;}
          if (v instanceof Date) {return `'${v.toISOString().split('T')[0]}'`;}
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
      if (fs.existsSync(ruta)) {fs.unlinkSync(ruta);}
    } catch (err) {
      /* Se ignora el fallo si el archivo ya fue eliminado o no existe */
    }
  }

  _getPreRestoreDir() {
    const dir = path.join(os.tmpdir(), 'ceela_pre_restore');
    if (!fs.existsSync(dir)) {fs.mkdirSync(dir, { recursive: true });}
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
    try { 
      if (fs.existsSync(this._rutaMantenimiento())) {fs.unlinkSync(this._rutaMantenimiento());} 
    } catch (err) {
      /* Se ignora si el archivo de mantenimiento no existe */
    }
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
    try { 
      fs.unlinkSync(rutaTemp); 
    } catch (err) {
      /* Se ignora si falló la limpieza del archivo temporal intermedio */
    }

    return destino;
  }

  async _ejecutarSqlScript(sqlPath) {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const connection = await this._getConnection();
    try {
      await this._borrarDatosExistentes();
      await connection.query(sql);
    } finally {
      await connection.end();
    }
  }

  async _copiarPortadas(origen) {
    if (!fs.existsSync(origen)) {return;}
    const archivos = fs.readdirSync(origen);
    for (const archivo of archivos) {
      fs.copyFileSync(path.join(origen, archivo), path.join(this.coversPath, archivo));
    }
  }

  async _resetAutoIncrement() {
    const conn = await this._getConnection();
    try {
      const [tables] = await conn.query(
        "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND AUTO_INCREMENT IS NOT NULL",
        [process.env.DB_NAME || 'ceela_biblioteca']
      );
      for (const t of tables) {
        await conn.query(`ALTER TABLE \`${t.TABLE_NAME}\` AUTO_INCREMENT = 0`);
      }
    } finally {
      await conn.end();
    }
  }

  _eliminarDirectorio(dir) {
    if (!fs.existsSync(dir)) {return;}
    fs.readdirSync(dir).forEach(e => {
      const full = path.join(dir, e);
      if (fs.statSync(full).isDirectory()) {this._eliminarDirectorio(full);}
      else {fs.unlinkSync(full);}
    });
    fs.rmdirSync(dir);
  }

  async _manejarFalloRestore(errorOriginal, preRestorePath, usuarioId) {
    if (preRestorePath && fs.existsSync(preRestorePath)) {
      try {
        const tempRollback = path.join(os.tmpdir(), `rollback_${Date.now()}`);
        fs.mkdirSync(tempRollback, { recursive: true });
        await extract(preRestorePath, { dir: tempRollback });

        await this._ejecutarSqlScript(path.join(tempRollback, 'backup.sql'));

        const prePortadas = path.join(tempRollback, 'portadas');
        await this._copiarPortadas(prePortadas);

        this._eliminarDirectorio(tempRollback);
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
    this._activarModoMantenimiento();
    throw new Error(errorOriginal);
  }

  async restaurarBackup(archivoZip, usuarioId) {
    const tempDir = path.join(os.tmpdir(), `restore_${Date.now()}`);
    const dirPortadas = path.join(tempDir, 'portadas');
    let preRestorePath = null;

    try {
      await extract(archivoZip, { dir: tempDir });

      const sqlPath = path.join(tempDir, 'backup.sql');
      if (!fs.existsSync(sqlPath)) {
        throw new Error('El archivo de backup no contiene backup.sql');
      }

      preRestorePath = await this._generarPreRestore();

      await this._ejecutarSqlScript(sqlPath);

      await this._copiarPortadas(dirPortadas);

      await this._resetAutoIncrement();

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
      await this._manejarFalloRestore(err.message, preRestorePath, usuarioId);
    } finally {
      this._eliminarDirectorio(tempDir);
    }
  }
  
  // SE ELIMINÓ EL SEGUNDO MÉTODO 'limpiarBackup' QUE CAUSABA EL ERROR DUPLICATE
}

module.exports = BackupService;