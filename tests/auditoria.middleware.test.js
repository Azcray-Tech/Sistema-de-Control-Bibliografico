const mockCreate = jest.fn();
jest.mock('../models', () => ({
  LogActividad: { create: mockCreate }
}));

const { registrarAuditoria } = require('../middleware/auditoria');

describe('registrarAuditoria', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('crea registro de auditoría exitosamente', async () => {
    mockCreate.mockResolvedValue({ idLog: 1 });
    await registrarAuditoria({
      usuarioId: 1,
      accion: 'INSERT',
      tablaAfectada: 'material',
      registroId: 42
    });
    expect(mockCreate).toHaveBeenCalledWith({
      usuarioId: 1,
      accion: 'INSERT',
      tablaAfectada: 'material',
      registroId: 42,
      valorAnterior: null,
      valorNuevo: null,
      motivo: undefined
    });
  });

  it('serializa valorAnterior y valorNuevo a JSON', async () => {
    mockCreate.mockResolvedValue({});
    await registrarAuditoria({
      usuarioId: 1,
      accion: 'UPDATE',
      tablaAfectada: 'material',
      registroId: 1,
      valorAnterior: { titulo: 'Old' },
      valorNuevo: { titulo: 'New' },
      motivo: 'Corrección'
    });
    expect(mockCreate).toHaveBeenCalledWith({
      usuarioId: 1,
      accion: 'UPDATE',
      tablaAfectada: 'material',
      registroId: 1,
      valorAnterior: '{"titulo":"Old"}',
      valorNuevo: '{"titulo":"New"}',
      motivo: 'Corrección'
    });
  });

  it('no lanza error si create falla', async () => {
    mockCreate.mockRejectedValue(new Error('DB error'));
    await expect(registrarAuditoria({
      usuarioId: 1,
      accion: 'DELETE',
      tablaAfectada: 'prestamo',
      registroId: 5
    })).resolves.toBeUndefined();
  });
});
