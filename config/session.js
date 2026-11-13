/**
 * @requirement RF-21 (Modificar parámetros globales), RF-39 (Aviso de expiración de sesión por inactividad)
 * @use_case CU-21 (Modificar parámetros globales del sistema), CU-39 (Aviso de expiración de sesión)
 * @description Configuración de sesión: tiempo de inactividad vigente (configurable desde
 * la tabla de parámetros), aviso previo y nombre de la cookie testigo que permite
 * distinguir una sesión expirada de una visita anónima.
 */

/** Tiempo de inactividad por defecto (15 minutos), usado si el parámetro no existe. */
const TTL_POR_DEFECTO_MS = 15 * 60 * 1000;

/** Tope del aviso previo: nunca más de 1 minuto antes de la expiración. */
const AVISO_PREVIO_MAXIMO_MS = 60 * 1000;

/**
 * Cookie testigo: se crea al iniciar sesión y sobrevive a la expiración de la sesión.
 * Su presencia indica que el usuario "tenía" sesión, no que nunca inició sesión.
 */
const NOMBRE_COOKIE_TESTIGO = 'ceela_auth';

let ttlMs = TTL_POR_DEFECTO_MS;

/** @returns {number} Tiempo de inactividad vigente en milisegundos. */
function obtenerTtlMs() {
  return ttlMs;
}

/**
 * @description Aplica un nuevo tiempo de inactividad. Ignora valores inválidos para
 * no dejar la sesión sin expiración.
 * @returns {boolean} true si el valor fue aplicado.
 */
function establecerTtlMs(valorMs) {
  const numero = Number(valorMs);
  if (!Number.isFinite(numero) || numero <= 0) {return false;}
  ttlMs = Math.floor(numero);
  return true;
}

/** @description Restaura el valor por defecto (útil en pruebas). */
function restablecerTtlMs() {
  ttlMs = TTL_POR_DEFECTO_MS;
}

/**
 * @description Antelación del aviso previo. Se limita a la mitad del TTL para que,
 * con tiempos de inactividad muy cortos, el aviso no aparezca de inmediato.
 */
function obtenerAvisoPrevioMs() {
  return Math.min(AVISO_PREVIO_MAXIMO_MS, Math.floor(ttlMs / 2));
}

/**
 * @description La cookie testigo vive el doble que la sesión para que siga presente
 * cuando la sesión ya expiró (si duraran lo mismo, morirían a la vez y el aviso nunca saldría).
 */
function obtenerMaxEdadCookieTestigo() {
  return ttlMs * 2;
}

module.exports = {
  TTL_POR_DEFECTO_MS,
  NOMBRE_COOKIE_TESTIGO,
  obtenerTtlMs,
  establecerTtlMs,
  restablecerTtlMs,
  obtenerAvisoPrevioMs,
  obtenerMaxEdadCookieTestigo
};
