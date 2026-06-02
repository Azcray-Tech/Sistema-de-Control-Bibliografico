/**
 * @requirement RF-31, RF-32
 * @use_case CU-31, CU-32
 * @description Servicio del panel de administración: estadísticas de materiales, préstamos y tendencias.
 */
class DashboardService {
  constructor({ sequelize, Material, Ejemplar, Prestamo, Solicitante, Categoria }) {
    this.sequelize = sequelize;
    this.Material = Material;
    this.Ejemplar = Ejemplar;
    this.Prestamo = Prestamo;
    this.Solicitante = Solicitante;
    this.Categoria = Categoria;
  }

  async obtenerEstadisticas(periodo = '12meses') {
    const Op = this.Prestamo.sequelize.constructor.Op;
    const fn = this.sequelize.fn;
    const col = this.sequelize.col;
    const literal = this.sequelize.literal;

    const totalMateriales = await this.Material.count();
    const prestamosActivos = await this.Prestamo.count({ where: { estado: 'Activo' } });
    const disponibles = await this.Ejemplar.count({ where: { estado: 'Disponible' } });
    const vencidos = await this.Prestamo.count({
      where: {
        estado: 'Activo',
        fechaDevolucionPrevista: { [Op.lt]: new Date() }
      }
    });

    const topRaw = await this.Prestamo.findAll({
      attributes: [
        [col('ejemplar_id'), 'ejemplarId'],
        [fn('COUNT', col('ejemplar_id')), 'total_prestamos']
      ],
      group: ['ejemplar_id'],
      order: [[literal('total_prestamos'), 'DESC']],
      limit: 7,
      raw: true,
      subQuery: false
    });

    const topConTitulo = await Promise.all(
      topRaw.map(async (item) => {
        const ejemplar = await this.Ejemplar.findByPk(item.ejemplarId, {
          include: [{ model: this.Material, attributes: ['titulo'] }]
        });
        return {
          total_prestamos: parseInt(item.total_prestamos, 10),
          titulo: ejemplar?.Material?.titulo || 'Sin título'
        };
      })
    );

    const materialesPorTipo = await this.Material.findAll({
      attributes: ['tipo', [fn('COUNT', col('tipo')), 'total']],
      group: ['tipo'],
      raw: true
    });

    let fechaInicio;
    switch (periodo) {
      case 'hoy':
        fechaInicio = new Date();
        fechaInicio.setHours(0, 0, 0, 0);
        break;
      case '1semana':
        fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - 7);
        break;
      case '1mes':
        fechaInicio = new Date();
        fechaInicio.setMonth(fechaInicio.getMonth() - 1);
        break;
      default:
        fechaInicio = new Date();
        fechaInicio.setFullYear(fechaInicio.getFullYear() - 1);
    }

    const prestamosPorMes = await this.Prestamo.findAll({
      attributes: [
        [fn('DATE_FORMAT', col('fecha_prestamo'), '%Y-%m'), 'mes'],
        [fn('COUNT', col('id_prestamo')), 'total']
      ],
      where: { fechaPrestamo: { [Op.gte]: fechaInicio } },
      group: [literal('mes')],
      order: [[literal('mes'), 'ASC']],
      raw: true
    });

    return {
      totalMateriales, prestamosActivos, disponibles, vencidos,
      topMateriales: topConTitulo,
      materialesPorTipo,
      prestamosPorMes,
      periodo
    };
  }
}

module.exports = DashboardService;
