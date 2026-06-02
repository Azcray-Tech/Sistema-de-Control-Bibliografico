/**
 * @requirement RF-21 (Modificar parámetros globales)
 * @use_case CU-21
 * @description Pruebas unitarias del servicio de parámetros del sistema.
 */
const ParametroService = require('../services/parametro.service');
const { crearMocksModelos, mockAuditoria } = require('./mocks/models');

describe('ParametroService', () => {
  let parametroService;
  let mocks;

  beforeEach(() => {
    mocks = crearMocksModelos();
    parametroService = new ParametroService(mocks, mockAuditoria);
    mockAuditoria.mockClear();
  });

  describe('obtener', () => {
    it('debe retornar el valor como número si el parámetro existe', async () => {
      mocks.Parametro.findByPk.mockResolvedValue({ clave: 'dias_prestamo', valor: '7' });
      const resultado = await parametroService.obtener('dias_prestamo', 7);
      expect(resultado).toBe(7);
    });

    it('debe retornar el valor por defecto si el parámetro no existe', async () => {
      mocks.Parametro.findByPk.mockResolvedValue(null);
      const resultado = await parametroService.obtener('inexistente', 99);
      expect(resultado).toBe(99);
    });

    it('debe convertir el valor string a entero', async () => {
      mocks.Parametro.findByPk.mockResolvedValue({ clave: 'factor_sancion', valor: '3' });
      const resultado = await parametroService.obtener('factor_sancion', 2);
      expect(resultado).toBe(3);
    });
  });

  describe('obtenerTexto', () => {
    it('debe retornar el valor textual si el parámetro existe', async () => {
      mocks.Parametro.findByPk.mockResolvedValue({ clave: 'ruta_backup_automatico', valor: 'D:\\backups' });
      const resultado = await parametroService.obtenerTexto('ruta_backup_automatico');
      expect(resultado).toBe('D:\\backups');
    });

    it('debe retornar cadena vacía por defecto si no existe', async () => {
      mocks.Parametro.findByPk.mockResolvedValue(null);
      const resultado = await parametroService.obtenerTexto('inexistente');
      expect(resultado).toBe('');
    });

    it('debe retornar el defecto personalizado si no existe', async () => {
      mocks.Parametro.findByPk.mockResolvedValue(null);
      const resultado = await parametroService.obtenerTexto('hora_backup_automatico', '09:00');
      expect(resultado).toBe('09:00');
    });
  });

  describe('obtenerTodos', () => {
    it('debe retornar todos los parámetros ordenados por clave', async () => {
      const paramsMock = [
        { clave: 'dias_prestamo', valor: '7' },
        { clave: 'factor_sancion', valor: '2' }
      ];
      mocks.Parametro.findAll.mockResolvedValue(paramsMock);
      const resultado = await parametroService.obtenerTodos();
      expect(resultado).toEqual(paramsMock);
      expect(mocks.Parametro.findAll).toHaveBeenCalledWith({ order: [['clave', 'ASC']] });
    });
  });

  describe('actualizar', () => {
    it('debe actualizar múltiples parámetros y auditar cada uno', async () => {
      mocks.Parametro.findByPk
        .mockResolvedValueOnce({ clave: 'dias_prestamo', valor: '5' })
        .mockResolvedValueOnce({ clave: 'factor_sancion', valor: '1' });

      await parametroService.actualizar({
        dias_prestamo: '7',
        factor_sancion: '2'
      }, 1);

      expect(mocks.Parametro.upsert).toHaveBeenCalledTimes(2);
      expect(mocks.Parametro.upsert).toHaveBeenCalledWith({ clave: 'dias_prestamo', valor: '7' });
      expect(mockAuditoria).toHaveBeenCalledTimes(2);
      expect(mockAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'ACTUALIZAR_PARAMETRO', usuarioId: 1, registroId: 'dias_prestamo' })
      );
    });

    it('debe ignorar claves no válidas', async () => {
      await parametroService.actualizar({ clave_invalida: '1', dias_prestamo: '7' }, 1);
      expect(mocks.Parametro.upsert).toHaveBeenCalledTimes(1);
      expect(mocks.Parametro.upsert).toHaveBeenCalledWith({ clave: 'dias_prestamo', valor: '7' });
    });

    it('debe rechazar un valor numérico menor al mínimo (excepto renovaciones)', async () => {
      await expect(parametroService.actualizar({ dias_prestamo: '0' }, 1))
        .rejects.toThrow('debe ser un entero >= 1');
    });

    it('debe aceptar renovaciones_permitidas = 0', async () => {
      mocks.Parametro.findByPk.mockResolvedValue({ clave: 'renovaciones_permitidas', valor: '1' });
      await parametroService.actualizar({ renovaciones_permitidas: '0' }, 1);
      expect(mocks.Parametro.upsert).toHaveBeenCalledWith(
        { clave: 'renovaciones_permitidas', valor: '0' }
      );
    });

    it('debe rechazar formato de hora inválido', async () => {
      await expect(parametroService.actualizar({ hora_backup_automatico: '9:00' }, 1))
        .rejects.toThrow('Formato de hora inválido');
    });

    it('debe aceptar formato de hora válido HH:MM', async () => {
      mocks.Parametro.findByPk.mockResolvedValue(null);
      await parametroService.actualizar({ hora_backup_automatico: '14:30' }, 1);
      expect(mocks.Parametro.upsert).toHaveBeenCalledWith(
        { clave: 'hora_backup_automatico', valor: '14:30' }
      );
    });

    it('debe pasar por alto parámetros de texto (ruta_backup_automatico, backup_auto_habilitado) sin validación numérica', async () => {
      mocks.Parametro.findByPk.mockResolvedValue(null);
      await parametroService.actualizar({
        ruta_backup_automatico: 'D:\\backups',
        backup_auto_habilitado: '1'
      }, 1);
      expect(mocks.Parametro.upsert).toHaveBeenCalledTimes(2);
    });
  });
});
