/**
 * @requirement RF-21 (Modificar parámetros globales)
 * @use_case CU-21 (Modificar parámetros globales del sistema)
 * @description Servicio de parámetros del sistema: lectura/escritura de configuración clave-valor.
 */
class ParametroService {
  constructor({ Parametro }, auditoria) {
    this.Parametro = Parametro;
    this.auditoria = auditoria;
  }

  async obtener(clave, defecto) {
    const p = await this.Parametro.findByPk(clave);
    return p ? parseInt(p.valor, 10) : defecto;
  }

  async obtenerTexto(clave, defecto = '') {
    const p = await this.Parametro.findByPk(clave);
    return p ? p.valor : defecto;
  }

  async obtenerTodos() {
    return this.Parametro.findAll({ order: [['clave', 'ASC']] });
  }

  _validarParametro(clave, valor) {
    if (['hora_backup_automatico', 'ruta_backup_automatico', 'backup_auto_habilitado'].includes(clave)) {
      if (clave === 'hora_backup_automatico' && !/^\d{2}:\d{2}$/.test(valor)) {
        throw new Error('Formato de hora inválido. Use HH:MM');
      }
      return;
    }
    const num = parseInt(valor, 10);
    const min = clave === 'renovaciones_permitidas' ? 0 : 1;
    if (isNaN(num) || num < min) {
      throw new Error(`El parámetro "${clave}" debe ser un entero >= ${min}`);
    }
  }

  async actualizar(datos, usuarioId) {
    const PARAMETROS_VALIDOS = [
      'dias_prestamo', 'max_prestamos_simultaneos', 'factor_sancion',
      'suspension_maxima', 'renovaciones_permitidas', 'tiempo_inactividad',
      'hora_backup_automatico', 'ruta_backup_automatico', 'backup_auto_habilitado'
    ];

    for (const [clave, valor] of Object.entries(datos)) {
      if (!PARAMETROS_VALIDOS.includes(clave)) {continue;}

      this._validarParametro(clave, valor);

      const anterior = await this.Parametro.findByPk(clave);

      await this.Parametro.upsert({ clave, valor: String(valor) });

      if (this.auditoria) {
        await this.auditoria({
          usuarioId,
          accion: 'ACTUALIZAR_PARAMETRO',
          tablaAfectada: 'parametro',
          registroId: clave,
          valorAnterior: anterior ? { valor: anterior.valor } : null,
          valorNuevo: { valor: String(valor) }
        });
      }
    }
  }
}

module.exports = ParametroService;
