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

    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();
    const nombresMeses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    let dateFormat, fechaInicio;
    const allPeriods = [];

    if (periodo === 'hoy') {
      dateFormat = '%Y-%m-%d %H:00';
      fechaInicio = new Date(anioActual, mesActual, ahora.getDate());
      for (let h = 0; h < 24; h++) {
        const sortKey = `${anioActual}-${String(mesActual+1).padStart(2,'0')}-${String(ahora.getDate()).padStart(2,'0')} ${String(h).padStart(2,'0')}:00`;
        allPeriods.push({ sortKey, label: `${String(h).padStart(2,'0')}:00` });
      }
    } else if (periodo === '1semana') {
      dateFormat = '%Y-%m-%d';
      fechaInicio = new Date(anioActual, mesActual, ahora.getDate() - 6);
      for (let i = 6; i >= 0; i--) {
        const d = new Date(anioActual, mesActual, ahora.getDate() - i);
        const sortKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        allPeriods.push({ sortKey, label: `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}` });
      }
    } else if (periodo === '1mes') {
      dateFormat = '%Y-%m-%d';
      fechaInicio = new Date(anioActual, mesActual, 1);
      const diasMes = new Date(anioActual, mesActual + 1, 0).getDate();
      for (let dia = 1; dia <= diasMes; dia++) {
        const sortKey = `${anioActual}-${String(mesActual+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
        allPeriods.push({ sortKey, label: `${String(dia).padStart(2,'0')}/${String(mesActual+1).padStart(2,'0')}` });
      }
    } else {
      dateFormat = '%Y-%m';
      fechaInicio = new Date(anioActual, mesActual - 11, 1);
      for (let i = 11; i >= 0; i--) {
        const d = new Date(anioActual, mesActual - i, 1);
        const sortKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        allPeriods.push({ sortKey, label: `${nombresMeses[d.getMonth()]} ${d.getFullYear()}` });
      }
    }

    const raw = await this.Prestamo.findAll({
      attributes: [
        [fn('DATE_FORMAT', col('fecha_prestamo'), dateFormat), 'periodo'],
        [fn('COUNT', col('id_prestamo')), 'total']
      ],
      where: { fechaPrestamo: { [Op.gte]: fechaInicio } },
      group: ['periodo'],
      order: [[literal('periodo'), 'ASC']],
      raw: true
    });

    const lookup = {};
    raw.forEach(r => { lookup[r.periodo] = parseInt(r.total, 10); });

    const prestamosPorMes = allPeriods.map(p => ({
      mes: p.label,
      total: lookup[p.sortKey] || 0
    }));

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
