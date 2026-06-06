require('../setup');

const models = require('../../../models');
const SolicitanteService = require('../../../services/solicitante.service');
const { registrarAuditoria } = require('../../../middleware/auditoria');
const { limpiarDatosTransaccionales } = require('../../../tests/e2e/helpers/clean');

describe('SolicitanteService - integración con BD real', () => {
  const service = new SolicitanteService(models, registrarAuditoria);

  afterAll(async () => {
    await limpiarDatosTransaccionales();
  });

  test('debe crear un solicitante', async () => {
    const data = {
      cedula: 'V-INTEGRA-001',
      nombre: 'Pedro',
      apellido: 'Integración',
      correoElectronico: 'pedro@test.com',
      telefono: '555-0101',
    };
    const resultado = await service.crear(data);
    expect(resultado.cedula).toBe('V-INTEGRA-001');
    expect(resultado.nombre).toBe('Pedro');
    expect(resultado.estado).toBe('Activo');
  });

  test('debe buscar un solicitante por cédula', async () => {
    const buscado = await service.buscar('V-INTEGRA-001');
    expect(buscado).toBeDefined();
    expect(buscado.nombre).toBe('Pedro');
  });

  test('debe retornar null para cédula inexistente', async () => {
    const buscado = await service.buscar('V-INEXISTENTE');
    expect(buscado).toBeNull();
  });

  test('debe rechazar cédula duplicada', async () => {
    const data = {
      cedula: 'V-INTEGRA-001',
      nombre: 'Otro',
      apellido: 'Nombre',
    };
    await expect(service.crear(data)).rejects.toThrow();
  });

  test('debe buscar un solicitante con préstamos', async () => {
    const completo = await service.buscarConPrestamos('V-INTEGRA-001');
    expect(completo).toBeDefined();
    expect(completo.cedula).toBe('V-INTEGRA-001');
  });
});
