/**
 * @requirement RF-30 (Auditoría de operaciones críticas)
 * @use_case CU-30
 * @description Middleware para registrar acciones en log_actividad
 */
const { LogActividad } = require('../models');

async function registrarAuditoria({ usuarioId, accion, tablaAfectada, registroId, valorAnterior, valorNuevo, motivo }) {
  try {
    await LogActividad.create({
      usuarioId,
      accion,
      tablaAfectada,
      registroId,
      valorAnterior: valorAnterior ? JSON.stringify(valorAnterior) : null,
      valorNuevo: valorNuevo ? JSON.stringify(valorNuevo) : null,
      motivo
    });
  } catch (err) {
    console.error('Error al registrar auditoría:', err.message);
  }
}

module.exports = { registrarAuditoria };
