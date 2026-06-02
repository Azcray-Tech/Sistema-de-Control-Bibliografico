/**
 * @requirement RF-14 (Registrar o cargar solicitante)
 * @use_case CU-14 (Registrar o cargar solicitante por cédula)
 * @description Servicio de solicitantes: búsqueda, creación y suspensión.
 */
class SolicitanteService {
  constructor({ Solicitante, Prestamo, Sancion, Ejemplar, Material }) {
    this.Solicitante = Solicitante;
    this.Prestamo = Prestamo;
    this.Sancion = Sancion;
    this.Ejemplar = Ejemplar;
    this.Material = Material;
  }

  async buscar(cedula) {
    if (!cedula) return null;
    return this.Solicitante.findByPk(cedula);
  }

  async buscarResponse(cedula) {
    const s = await this.buscar(cedula);
    if (!s) return { existe: false };
    return {
      existe: true,
      solicitante: {
        cedula: s.cedula,
        nombre: s.nombre,
        apellido: s.apellido,
        correoElectronico: s.correoElectronico,
        telefono: s.telefono,
        estado: s.estado,
        fechaFinSuspension: s.fechaFinSuspension
      }
    };
  }

  async buscarConPrestamos(cedula) {
    if (!cedula) return null;

    const solicitante = await this.Solicitante.findByPk(cedula, {
      include: [
        {
          model: this.Prestamo,
          where: { estado: 'Activo' },
          required: false,
          include: [
            { model: this.Ejemplar, include: [{ model: this.Material, attributes: ['idMaterial', 'titulo'] }] }
          ]
        },
        {
          model: this.Sancion,
          where: { fechaFin: { [this.Sancion.sequelize.constructor.Op.gte]: new Date() } },
          required: false
        }
      ]
    });

    if (!solicitante) return null;

    const prestamosActivos = solicitante.Prestamos || [];
    const sancionesActivas = solicitante.Sancions || [];

    const suspendido = solicitante.estado === 'Suspendido permanente' ||
      (solicitante.estado === 'Suspendido temporal' && solicitante.fechaFinSuspension && new Date(solicitante.fechaFinSuspension) >= new Date());

    return {
      cedula: solicitante.cedula,
      nombre: solicitante.nombre,
      apellido: solicitante.apellido,
      correoElectronico: solicitante.correoElectronico,
      telefono: solicitante.telefono,
      estado: solicitante.estado,
      fechaFinSuspension: solicitante.fechaFinSuspension,
      suspendido,
      prestamosActivos: prestamosActivos.length,
      prestamos: prestamosActivos.map(p => ({
        id: p.idPrestamo,
        material: p.Ejemplar?.Material?.titulo || '-',
        ejemplar: p.Ejemplar?.identificadorUnico || '-',
        fechaDevolucionPrevista: p.fechaDevolucionPrevista
      })),
      sanciones: sancionesActivas.map(s => ({
        id: s.idSancion,
        motivo: s.motivo,
        fechaFin: s.fechaFin
      }))
    };
  }

  async crear({ cedula, nombre, apellido, correoElectronico, telefono }) {
    const existente = await this.Solicitante.findByPk(cedula);
    if (existente) {
      throw new Error('Ya existe un solicitante con esta cédula');
    }

    return this.Solicitante.create({
      cedula, nombre, apellido, correoElectronico, telefono, estado: 'Activo'
    });
  }

  async suspender(solicitanteCedula, fechaFin, motivo) {
    return this.Solicitante.update(
      { estado: 'Suspendido temporal', fechaFinSuspension: fechaFin },
      { where: { cedula: solicitanteCedula } }
    );
  }
}

module.exports = SolicitanteService;
