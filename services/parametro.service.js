/**
 * @requirement RF-21 (Modificar parámetros globales)
 * @use_case CU-21 (Modificar parámetros globales del sistema)
 * @description Servicio de parámetros del sistema: lectura de configuración clave-valor.
 */
class ParametroService {
  constructor({ Parametro }) {
    this.Parametro = Parametro;
  }

  async obtener(clave, defecto) {
    const p = await this.Parametro.findByPk(clave);
    return p ? parseInt(p.valor, 10) : defecto;
  }

  async obtenerTexto(clave, defecto = '') {
    const p = await this.Parametro.findByPk(clave);
    return p ? p.valor : defecto;
  }
}

module.exports = ParametroService;
