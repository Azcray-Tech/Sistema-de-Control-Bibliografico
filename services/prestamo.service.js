/**
 * @requirement RF-15, RF-17, RF-18
 * @use_case CU-15, CU-17, CU-18
 * @description Servicio de préstamos: registrar, renovar, devolver, calcular sanciones por retraso.
 */
class PrestamoService {
  constructor({ Prestamo, Solicitante, Ejemplar, Material, UsuarioSistema, Sancion }, auditoria, parametroService) {
    this.Prestamo = Prestamo;
    this.Solicitante = Solicitante;
    this.Ejemplar = Ejemplar;
    this.Material = Material;
    this.UsuarioSistema = UsuarioSistema;
    this.Sancion = Sancion;
    this.auditoria = auditoria;
    this.parametroService = parametroService;
  }

  async listarActivos() {
    return this.Prestamo.findAll({
      where: { estado: 'Activo' },
      include: [
        { model: this.Solicitante },
        { model: this.Ejemplar, include: [{ model: this.Material }] },
        { model: this.UsuarioSistema, as: 'prestamista' }
      ],
      order: [['fechaPrestamo', 'DESC']],
      limit: 100
    });
  }

  async registrar(solicitanteCedula, ejemplarId, usuarioPrestamistaId) {
    const solicitante = await this.Solicitante.findByPk(solicitanteCedula);
    if (!solicitante) throw new Error('Solicitante no encontrado');

    if (solicitante.estado === 'Suspendido permanente' ||
        (solicitante.estado === 'Suspendido temporal' && solicitante.fechaFinSuspension && new Date(solicitante.fechaFinSuspension) >= new Date())) {
      throw new Error('El solicitante está suspendido y no puede recibir préstamos');
    }

    const sancionActiva = await this.Sancion.findOne({
      where: {
        solicitanteCedula,
        fechaFin: { [this.Prestamo.sequelize.constructor.Op.gte]: new Date() }
      }
    });
    if (sancionActiva) throw new Error('El solicitante tiene una sanción activa');

    const maxPrestamos = await this.parametroService.obtener('max_prestamos_simultaneos', 3);
    const prestamosActivos = await this.Prestamo.count({
      where: { solicitanteCedula, estado: 'Activo' }
    });
    if (prestamosActivos >= maxPrestamos) {
      throw new Error(`Límite de préstamos alcanzado (máx: ${maxPrestamos})`);
    }

    const sequelize = this.Prestamo.sequelize;
    const t = await sequelize.transaction();

    try {
      const ejemplar = await this.Ejemplar.findByPk(ejemplarId, {
        include: [{ model: this.Material }],
        transaction: t,
        lock: t.LOCK.UPDATE
      });
      if (!ejemplar) throw new Error('Ejemplar no encontrado');
      if (ejemplar.estado !== 'Disponible') {
        throw new Error(`Ejemplar no disponible — estado: ${ejemplar.estado}`);
      }

      const diasPrestamo = await this.parametroService.obtener('dias_prestamo', 7);
      const fechaDev = new Date();
      fechaDev.setDate(fechaDev.getDate() + diasPrestamo);

      const prestamo = await this.Prestamo.create({
        solicitanteCedula, ejemplarId, usuarioPrestamistaId,
        fechaPrestamo: new Date(),
        fechaDevolucionPrevista: fechaDev,
        estado: 'Activo', renovaciones: 0
      }, { transaction: t });

      await ejemplar.update({ estado: 'Prestado' }, { transaction: t });

      await t.commit();

      if (this.auditoria) {
        await this.auditoria({
          usuarioId: usuarioPrestamistaId,
          accion: 'CREAR_PRESTAMO',
          tablaAfectada: 'prestamo',
          registroId: ejemplarId,
          valorNuevo: { solicitanteCedula, ejemplarId, fechaDevolucionPrevista: fechaDev }
        });
      }

      return prestamo;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async renovar(id) {
    const prestamo = await this.Prestamo.findByPk(id, {
      include: [{ model: this.Solicitante }]
    });
    if (!prestamo || prestamo.estado !== 'Activo') {
      throw new Error('Préstamo no encontrado o no está activo');
    }

    const renovacionesPermitidas = await this.parametroService.obtener('renovaciones_permitidas', 1);
    if (prestamo.renovaciones >= renovacionesPermitidas) {
      throw new Error('Límite de renovaciones alcanzado');
    }

    if (new Date(prestamo.fechaDevolucionPrevista) < new Date()) {
      throw new Error('No se puede renovar un préstamo vencido');
    }

    const diasPrestamo = await this.parametroService.obtener('dias_prestamo', 7);
    const nuevaFecha = new Date(prestamo.fechaDevolucionPrevista);
    nuevaFecha.setDate(nuevaFecha.getDate() + diasPrestamo);

    await prestamo.update({
      renovaciones: prestamo.renovaciones + 1,
      fechaDevolucionPrevista: nuevaFecha
    });

    return prestamo;
  }

  async devolver(id, usuarioId) {
    const prestamo = await this.Prestamo.findByPk(id, {
      include: [
        { model: this.Ejemplar },
        { model: this.Solicitante }
      ]
    });
    if (!prestamo || prestamo.estado !== 'Activo') {
      throw new Error('Préstamo no encontrado o ya fue devuelto');
    }

    const hoy = new Date();
    const fechaPrevista = new Date(prestamo.fechaDevolucionPrevista);
    const retraso = Math.max(0, Math.floor((hoy - fechaPrevista) / 86400000));

    await prestamo.update({ estado: 'Devuelto', fechaDevolucionReal: hoy });
    await prestamo.Ejemplar.update({ estado: 'Disponible' });

    if (retraso > 0) {
      const factorSancion = await this.parametroService.obtener('factor_sancion', 2);
      const suspensionMaxima = await this.parametroService.obtener('suspension_maxima', 30);
      const diasSancion = Math.min(retraso * factorSancion, suspensionMaxima);

      const fechaInicio = new Date();
      const fechaFin = new Date();
      fechaFin.setDate(fechaFin.getDate() + diasSancion);

      await this.Sancion.create({
        solicitanteCedula: prestamo.solicitanteCedula,
        usuarioGestionaId: usuarioId,
        motivo: `Retraso de ${retraso} días en devolución`,
        fechaInicio, diasSancion, fechaFin
      });

      await prestamo.Solicitante.update({
        estado: 'Suspendido temporal',
        fechaFinSuspension: fechaFin
      });
    }

    if (this.auditoria) {
      await this.auditoria({
        usuarioId,
        accion: 'DEVOLVER_PRESTAMO',
        tablaAfectada: 'prestamo',
        registroId: prestamo.idPrestamo,
        valorNuevo: { fechaDevolucionReal: hoy, retraso }
      });
    }

    return prestamo;
  }

  async historial() {
    return this.Prestamo.findAll({
      include: [
        { model: this.Solicitante },
        { model: this.Ejemplar, include: [{ model: this.Material }] },
        { model: this.UsuarioSistema, as: 'prestamista' }
      ],
      order: [['fechaPrestamo', 'DESC']]
    });
  }

  async listarSancionesActivas() {
    const Op = this.Prestamo.sequelize.constructor.Op;
    const hoy = new Date();
    return this.Solicitante.findAll({
      where: {
        [Op.or]: [
          { estado: 'Suspendido temporal', fechaFinSuspension: { [Op.gte]: hoy } },
          { estado: 'Suspendido permanente' }
        ]
      },
      include: [
        {
          model: this.Sancion,
          where: {
            [Op.or]: [
              { levantadaManualmente: false },
              { levantadaManualmente: { [Op.is]: null } }
            ]
          },
          required: false
        }
      ],
      order: [['apellido', 'ASC']]
    });
  }

  async levantarSancion(cedula, usuarioId, motivo) {
    if (!motivo || !motivo.trim()) {
      throw new Error('El motivo es obligatorio para levantar la suspensión');
    }

    const solicitante = await this.Solicitante.findByPk(cedula);
    if (!solicitante) throw new Error('Solicitante no encontrado');

    if (solicitante.estado === 'Activo') {
      throw new Error('El solicitante no tiene una suspensión activa');
    }

    const valorAnterior = {
      estado: solicitante.estado,
      fechaFinSuspension: solicitante.fechaFinSuspension
    };

    await solicitante.update({
      estado: 'Activo',
      fechaFinSuspension: null
    });

    await this.Sancion.update(
      {
        motivoLevantamiento: motivo,
        levantadaManualmente: true
      },
      {
        where: {
          solicitanteCedula: cedula,
          fechaFin: { [this.Prestamo.sequelize.constructor.Op.gte]: new Date() }
        }
      }
    );

    if (this.auditoria) {
      await this.auditoria({
        usuarioId,
        accion: 'LEVANTAR_SANCION',
        tablaAfectada: 'solicitante',
        registroId: cedula,
        valorAnterior,
        valorNuevo: { estado: 'Activo', motivo }
      });
    }

    return solicitante;
  }

  async obtenerVencidos() {
    const Op = this.Prestamo.sequelize.constructor.Op;
    const prestamosVencidos = await this.Prestamo.findAll({
      where: {
        [Op.or]: [
          { estado: 'Vencido' },
          { estado: 'Activo', fechaDevolucionPrevista: { [Op.lt]: new Date() } }
        ]
      },
      include: [
        { model: this.Solicitante },
        { model: this.Ejemplar, include: [{ model: this.Material }] }
      ],
      order: [['fechaDevolucionPrevista', 'ASC']]
    });

    const hoy = new Date();
    return prestamosVencidos.map(p => {
      const prevista = new Date(p.fechaDevolucionPrevista);
      const retraso = Math.max(0, Math.floor((hoy - prevista) / 86400000));
      return { ...p.toJSON(), retraso };
    });
  }
}

module.exports = PrestamoService;
