/**
 * @requirement RF-06 (Agregar ejemplares), RF-07 (Cambiar estado de ejemplar)
 * @use_case CU-06, CU-07
 * @description Servicio para gestión de ejemplares: listar, agregar y cambiar estado manualmente.
 */
class EjemplarService {
  constructor({ Material, Ejemplar, Prestamo }, auditoria) {
    this.Material = Material;
    this.Ejemplar = Ejemplar;
    this.Prestamo = Prestamo;
    this.auditoria = auditoria;
  }

  async listarPorMaterial(materialId) {
    const material = await this.Material.findByPk(materialId);
    if (!material) throw new Error('Material no encontrado');

    const ejemplares = await this.Ejemplar.findAll({
      where: { materialId },
      include: [{ model: this.Material, attributes: ['idMaterial', 'titulo', 'tipo'] }],
      order: [['identificadorUnico', 'ASC']]
    });

    return { material, ejemplares };
  }

  async agregar(materialId, identificadores, usuarioId) {
    const material = await this.Material.findByPk(materialId);
    if (!material) throw new Error('Material no encontrado');

    const existentes = await this.Ejemplar.findAll({
      where: { materialId, identificadorUnico: identificadores }
    });
    if (existentes.length > 0) {
      throw new Error(`Los siguientes identificadores ya existen para este material: ${existentes.map(e => e.identificadorUnico).join(', ')}`);
    }

    const ejemplares = await this.Ejemplar.bulkCreate(
      identificadores.map(id => ({
        materialId,
        identificadorUnico: id,
        estado: 'Disponible'
      }))
    );

    if (this.auditoria) {
      await this.auditoria({
        usuarioId, accion: 'AGREGAR_EJEMPLARES',
        tablaAfectada: 'ejemplar', registroId: materialId,
        valorNuevo: { cantidad: identificadores.length, identificadores }
      });
    }

    return ejemplares;
  }

  async cambiarEstado(ejemplarId, nuevoEstado, usuarioId, motivo, esAdmin = false) {
    const ejemplar = await this.Ejemplar.findByPk(ejemplarId, {
      include: [{ model: this.Material }]
    });
    if (!ejemplar) throw new Error('Ejemplar no encontrado');

    const estadoAnterior = ejemplar.estado;

    if (estadoAnterior === 'Prestado' && nuevoEstado !== 'Prestado') {
      throw new Error('No se puede cambiar el estado de un ejemplar Prestado. Debe registrar la devolución primero.');
    }

    if (estadoAnterior === 'Dado de baja') {
      throw new Error('No se puede cambiar el estado de un ejemplar dado de baja');
    }

    if (estadoAnterior === 'Perdido' && nuevoEstado === 'Disponible' && !esAdmin) {
      throw new Error('Solo un Administrador puede recuperar un ejemplar perdido');
    }

    if (nuevoEstado === 'Dañado' || nuevoEstado === 'Perdido') {
      if (!motivo || !motivo.trim()) {
        throw new Error('Debe ingresar un motivo cuando el estado es "Dañado" o "Perdido"');
      }
    }

    await ejemplar.update({ estado: nuevoEstado });

    if (this.auditoria) {
      await this.auditoria({
        usuarioId,
        accion: 'CAMBIAR_ESTADO_EJEMPLAR',
        tablaAfectada: 'ejemplar',
        registroId: ejemplarId,
        valorAnterior: { estado: estadoAnterior },
        valorNuevo: { estado: nuevoEstado, motivo: motivo || null }
      });
    }

    return ejemplar;
  }
}

module.exports = EjemplarService;
