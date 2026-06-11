/**
 * @requirement RF-27 (Backup manual completo), RF-28 (Restaurar desde backup)
 * @use_case CU-27 (Generar backup manual completo), CU-28 (Restaurar sistema)
 * @description Controlador para generación, descarga y restauración de backups del sistema.
 */
const fs = require('fs').promises; // Usamos la API de promesas para evitar bloquear el hilo principal

class BackupController {
  constructor(backupService) {
    this.backupService = backupService;
    this.cronService = null;
  }

  setCronService(cronService) {
    this.cronService = cronService;
  }

  /**
   * @requirement RF-27
   * @use_case CU-27
   * @description Muestra el panel de gestión de backups con estado del backup automático.
   */
  mostrarPanel = async (req, res, next) => {
    try {
      let estadoBackup = null;
      if (this.cronService) {
        estadoBackup = await this.cronService.verificarRutaBackup();
      }
      res.render('admin/backup', { page: 'backup', error: null, success: req.query.success, estadoBackup });
    } catch (err) {
      next(err);
    }
  };

  /**
   * @requirement RF-27
   * @use_case CU-27
   * @description Genera un backup manual completo y lo descarga.
   */
  generar = async (req, res, next) => {
    try {
      const usuarioId = req.session.usuarioId;
      const backup = await this.backupService.generarBackup(usuarioId);

      res.download(backup.ruta, backup.nombre, async (err) => {
        if (err) {
          next(err);
        }
        // Limpieza del backup generado después de la descarga
        await this.backupService.limpiarBackup(backup.ruta);
      });
    } catch (err) {
      res.redirect(`/admin/backup?error=${encodeURIComponent(err.message)}`);
    }
  };

  /**
   * @requirement RF-28
   * @use_case CU-28
   * @description Muestra el formulario para restaurar un backup.
   */
  mostrarRestaurar = async (req, res, next) => {
    try {
      res.render('admin/restaurar', { page: 'restaurar', error: req.query.error, success: req.query.success });
    } catch (err) {
      next(err);
    }
  };

  /**
   * @requirement RF-28
   * @use_case CU-28
   * @description Procesa la restauración del sistema desde un archivo de backup.
   */
  restaurar = async (req, res, _next) => {
    // 1. Validación temprana: Si no hay archivo, detenemos la ejecución inmediatamente
    if (!req.file) {
      return res.redirect('/admin/restaurar?error=Debe seleccionar un archivo de backup');
    }

    try {
      const usuarioId = req.session.usuarioId;
      
      // 2. Procesar la restauración
      await this.backupService.restaurarBackup(req.file.path, usuarioId);

      // 3. Limpieza asíncrona del archivo subido (best-effort)
      await fs.unlink(req.file.path).catch(err => console.warn('Limpieza backup upload:', err.message));
      
      res.redirect('/admin/restaurar?success=Backup restaurado exitosamente');
    } catch (err) {
      // 4. Respaldo de seguridad: Si la restauración falla, intentamos borrar el archivo temporal
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkErr) {
        console.warn('Limpieza backup upload (catch):', unlinkErr.message);
      }

      res.redirect(`/admin/restaurar?error=${encodeURIComponent(err.message)}`);
    }
  };
}

module.exports = BackupController;