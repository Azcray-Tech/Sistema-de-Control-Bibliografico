/**
 * @requirement RF-21 (Modificar parámetros globales), RF-39 (Aviso de expiración de sesión por inactividad)
 * @use_case CU-21 (Modificar parámetros globales del sistema), CU-39 (Aviso de expiración de sesión)
 * @description Pruebas unitarias de la configuración dinámica de sesión.
 */
const {
  TTL_POR_DEFECTO_MS,
  NOMBRE_COOKIE_TESTIGO,
  obtenerTtlMs,
  establecerTtlMs,
  restablecerTtlMs,
  obtenerAvisoPrevioMs,
  obtenerMaxEdadCookieTestigo
} = require('../config/session');

describe('config/session', () => {
  beforeEach(() => restablecerTtlMs());
  afterAll(() => restablecerTtlMs());

  it('arranca con 15 minutos por defecto', () => {
    expect(TTL_POR_DEFECTO_MS).toBe(15 * 60 * 1000);
    expect(obtenerTtlMs()).toBe(15 * 60 * 1000);
  });

  it('aplica un tiempo de inactividad válido', () => {
    expect(establecerTtlMs(20 * 60 * 1000)).toBe(true);
    expect(obtenerTtlMs()).toBe(20 * 60 * 1000);
  });

  it('ignora valores inválidos y conserva el valor anterior', () => {
    expect(establecerTtlMs(0)).toBe(false);
    expect(establecerTtlMs(-5)).toBe(false);
    expect(establecerTtlMs('abc')).toBe(false);
    expect(obtenerTtlMs()).toBe(TTL_POR_DEFECTO_MS);
  });

  it('el aviso previo es de 1 minuto con el TTL por defecto', () => {
    expect(obtenerAvisoPrevioMs()).toBe(60000);
  });

  it('el aviso previo se reduce a la mitad con un TTL corto', () => {
    establecerTtlMs(60000);
    expect(obtenerAvisoPrevioMs()).toBe(30000);
  });

  it('la cookie testigo dura el doble que la sesión', () => {
    expect(obtenerMaxEdadCookieTestigo()).toBe(2 * TTL_POR_DEFECTO_MS);
    establecerTtlMs(60000);
    expect(obtenerMaxEdadCookieTestigo()).toBe(120000);
  });

  it('restablecerTtlMs vuelve al valor por defecto', () => {
    establecerTtlMs(60000);
    restablecerTtlMs();
    expect(obtenerTtlMs()).toBe(TTL_POR_DEFECTO_MS);
  });

  it('expone el nombre de la cookie testigo', () => {
    expect(NOMBRE_COOKIE_TESTIGO).toBe('ceela_auth');
  });
});
