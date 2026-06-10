/**
 * @requirement RF-21 (Modificar parámetros globales)
 * @use_case CU-21 (Modificar parámetros globales del sistema)
 * @description Controlador para el panel de configuración de parámetros del sistema.
 */
class ParametroController {
  constructor(parametroService) {
    this.parametroService = parametroService;
    this.cronService = null;
  }

  setCronService(cronService) {
    this.cronService = cronService;
  }

  /**
   * @requirement RF-21
   * @use_case CU-21
   */
  mostrarFormulario = async (req, res, next) => {
    try {
      const parametros = await this.parametroService.obtenerTodos();
      const paramsObj = {};
      parametros.forEach(p => { paramsObj[p.clave] = p.valor; });

      res.render('admin/parametros', {
        page: 'configuracion',
        parametros: paramsObj,
        error: null,
        success: req.query.success
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * @requirement RF-21
   * @use_case CU-21
   */
  guardar = async (req, res, _next) => {
    try {
      const datos = { ...req.body };
      // Checkbox unchecked = no enviado → convertir a '0'
      if (!('backup_auto_habilitado' in datos)) {
        datos.backup_auto_habilitado = '0';
      }
      const usuarioId = req.session.usuarioId;
      const horaAnterior = await this.parametroService.obtenerTexto('hora_backup_automatico');
      await this.parametroService.actualizar(datos, usuarioId);
      if (this.cronService && datos.hora_backup_automatico && datos.hora_backup_automatico !== horaAnterior) {
        this.cronService.reprogramarBackup();
      }
      res.redirect('/admin/configuracion?success=actualizado');
    } catch (err) {
      const parametros = await this.parametroService.obtenerTodos();
      const paramsObj = {};
      parametros.forEach(p => { paramsObj[p.clave] = p.valor; });
      res.render('admin/parametros', {
        page: 'configuracion',
        parametros: paramsObj,
        error: err.message,
        success: null
      });
    }
  };
}

module.exports = ParametroController;
