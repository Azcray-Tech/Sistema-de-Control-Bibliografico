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

      // 3. Limpieza asíncrona exitosa del archivo subido
      await fs.unlink(req.file.path);
      
      res.redirect('/admin/restaurar?success=Backup restaurado exitosamente');
    } catch (err) {
      // 4. Respaldo de seguridad: Si la restauración falla, intentamos borrar el archivo temporal
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkErr) {
        // ESLint no-empty solucionado con un comentario explicativo
        /* El archivo pudo no existir o ya haber sido borrado; ignoramos para no solapar el error principal */
      }

      res.redirect(`/admin/restaurar?error=${encodeURIComponent(err.message)}`);
    }
  };
}

module.exports = BackupController;