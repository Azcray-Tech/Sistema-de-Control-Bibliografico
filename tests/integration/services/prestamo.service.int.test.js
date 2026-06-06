require('../setup');

const models = require('../../../models');
const PrestamoService = require('../../../services/prestamo.service');
const ParametroService = require('../../../services/parametro.service');
const { registrarAuditoria } = require('../../../middleware/auditoria');
const { limpiarDatosTransaccionales } = require('../../../tests/e2e/helpers/clean');
const { crearSolicitante, crearMaterialCompleto } = require('../../../tests/e2e/helpers/seed');

describe('PrestamoService - integración con BD real', () => {
  const parametroService = new ParametroService(models, registrarAuditoria);
  const service = new PrestamoService(models, registrarAuditoria, parametroService);

  afterAll(async () => {
    await limpiarDatosTransaccionales();
  });

  test('debe listar préstamos activos (vacíos al inicio)', async () => {
    const activos = await service.listarActivos();
    expect(Array.isArray(activos)).toBe(true);
  });

  test('debe registrar un préstamo correctamente', async () => {
    const solicitante = await crearSolicitante();
    const { material, ejemplar } = await crearMaterialCompleto('libro');
    const userAdmin = await models.UsuarioSistema.findOne({ where: { nombreUsuario: 'admin' } });

    const prestamo = await service.registrar(solicitante.cedula, ejemplar.idEjemplar, userAdmin.idUsuario);
    expect(prestamo).toBeDefined();
    expect(prestamo.estado).toBe('Activo');
    expect(prestamo.solicitanteCedula).toBe(solicitante.cedula);
    expect(prestamo.ejemplarId).toBe(ejemplar.idEjemplar);

    const ejemplarActualizado = await models.Ejemplar.findByPk(ejemplar.idEjemplar);
    expect(ejemplarActualizado.estado).toBe('Prestado');
  });

  test('debe rechazar préstamo a solicitante inexistente', async () => {
    const userAdmin = await models.UsuarioSistema.findOne({ where: { nombreUsuario: 'admin' } });
    await expect(service.registrar('V-00000000', 1, userAdmin.idUsuario))
      .rejects
      .toThrow('Solicitante no encontrado');
  });

  test('debe devolver un préstamo y calcular sanción si vencido', async () => {
    const solicitante = await crearSolicitante();
    const { material, ejemplar } = await crearMaterialCompleto('libro');
    const userAdmin = await models.UsuarioSistema.findOne({ where: { nombreUsuario: 'admin' } });

    const prestamo = await service.registrar(solicitante.cedula, ejemplar.idEjemplar, userAdmin.idUsuario);

    const devuelto = await service.devolver(prestamo.idPrestamo, userAdmin.idUsuario);
    expect(devuelto.estado).toBe('Devuelto');

    const ejemplarActualizado = await models.Ejemplar.findByPk(ejemplar.idEjemplar);
    expect(ejemplarActualizado.estado).toBe('Disponible');
  });

  test('debe renovar un préstamo activo', async () => {
    const solicitante = await crearSolicitante();
    const { material, ejemplar } = await crearMaterialCompleto('libro');
    const userAdmin = await models.UsuarioSistema.findOne({ where: { nombreUsuario: 'admin' } });

    const prestamo = await service.registrar(solicitante.cedula, ejemplar.idEjemplar, userAdmin.idUsuario);
    const renovado = await service.renovar(prestamo.idPrestamo);
    expect(renovado.renovaciones).toBe(1);
  });

  test('debe listar el historial de préstamos', async () => {
    const historial = await service.historial();
    expect(Array.isArray(historial)).toBe(true);
  });

  test('debe listar sanciones activas', async () => {
    const sanciones = await service.listarSancionesActivas();
    expect(Array.isArray(sanciones)).toBe(true);
  });
});
