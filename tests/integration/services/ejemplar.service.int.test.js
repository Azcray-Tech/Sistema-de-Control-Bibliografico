require('../setup');

const models = require('../../../models');
const EjemplarService = require('../../../services/ejemplar.service');
const { registrarAuditoria } = require('../../../middleware/auditoria');
const { limpiarDatosTransaccionales } = require('../../../tests/e2e/helpers/clean');
const { crearMaterialCompleto, crearEjemplar } = require('../../../tests/e2e/helpers/seed');

describe('EjemplarService - integración con BD real', () => {
  const service = new EjemplarService(models, registrarAuditoria);

  afterAll(async () => {
    await limpiarDatosTransaccionales();
  });

  test('debe listar ejemplares por material', async () => {
    const { material } = await crearMaterialCompleto('libro');
    const { ejemplares } = await service.listarPorMaterial(material.idMaterial);
    expect(Array.isArray(ejemplares)).toBe(true);
    expect(ejemplares.length).toBeGreaterThanOrEqual(1);
  });

  test('debe cambiar estado de un ejemplar a Dañado', async () => {
    const { material, ejemplar } = await crearMaterialCompleto('libro');
    const resultado = await service.cambiarEstado(ejemplar.idEjemplar, 'Dañado', 1, 'Prueba integración');
    expect(resultado.estado).toBe('Dañado');

    const enBD = await models.Ejemplar.findByPk(ejemplar.idEjemplar);
    expect(enBD.estado).toBe('Dañado');
  });

  test('debe cambiar estado a En restauración', async () => {
    const { material, ejemplar } = await crearMaterialCompleto('libro');
    const resultado = await service.cambiarEstado(ejemplar.idEjemplar, 'En restauración', 1, 'Mantenimiento');
    expect(resultado.estado).toBe('En restauración');
  });

  test('debe cambiar estado a Perdido', async () => {
    const { material, ejemplar } = await crearMaterialCompleto('libro');
    const resultado = await service.cambiarEstado(ejemplar.idEjemplar, 'Perdido', 1, 'Extraviado');
    expect(resultado.estado).toBe('Perdido');
  });

  test('debe rechazar cambio de estado sin motivo', async () => {
    const { material, ejemplar } = await crearMaterialCompleto('libro');
    await expect(service.cambiarEstado(ejemplar.idEjemplar, 'Dañado', 1, ''))
      .rejects
      .toThrow('Debe ingresar un motivo cuando el estado es "Dañado" o "Perdido"');
  });

  test('debe rechazar cambio de estado desde Dado de baja', async () => {
    const { material, ejemplar } = await crearMaterialCompleto('libro');
    await service.cambiarEstado(ejemplar.idEjemplar, 'Dado de baja', 1, 'Baja por deterioro');
    await expect(service.cambiarEstado(ejemplar.idEjemplar, 'Disponible', 1, 'Intento recuperar'))
      .rejects
      .toThrow();
  });
});
