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

  async _obtenerContadores() {
    const Op = this.Prestamo.sequelize.constructor.Op;
    const [totalMateriales, prestamosActivos, disponibles, vencidos] = await Promise.all([
      this.Material.count(),
      this.Prestamo.count({ where: { estado: 'Activo' } }),
      this.Ejemplar.count({ where: { estado: 'Disponible' } }),
      this.Prestamo.count({
        where: { estado: 'Activo', fechaDevolucionPrevista: { [Op.lt]: new Date() } }
      })
    ]);
    return { totalMateriales, prestamosActivos, disponibles, vencidos };
  }

  async _obtenerTopMateriales() {
    const fn = this.sequelize.fn;
    const col = this.sequelize.col;
    const literal = this.sequelize.literal;

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

    return Promise.all(
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
  }

  async _obtenerMaterialesPorTipo() {
    const fn = this.sequelize.fn;
    const col = this.sequelize.col;
    return this.Material.findAll({
      attributes: ['tipo', [fn('COUNT', col('tipo')), 'total']],
      group: ['tipo'],
      raw: true
    });
  }

  _periodoHoy(ahora) {
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();
    const allPeriods = [];
    for (let h = 0; h < 24; h++) {
      allPeriods.push({
        sortKey: `${anioActual}-${String(mesActual+1).padStart(2,'0')}-${String(ahora.getDate()).padStart(2,'0')} ${String(h).padStart(2,'0')}:00`,
        label: `${String(h).padStart(2,'0')}:00`
      });
    }
    return { dateFormat: '%Y-%m-%d %H:00', fechaInicio: new Date(anioActual, mesActual, ahora.getDate()), allPeriods };
  }

  _periodoSemana(ahora) {
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();
    const allPeriods = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(anioActual, mesActual, ahora.getDate() - i);
      allPeriods.push({
        sortKey: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
        label: `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
      });
    }
    return { dateFormat: '%Y-%m-%d', fechaInicio: new Date(anioActual, mesActual, ahora.getDate() - 6), allPeriods };
  }

  _periodoMes(ahora) {
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();
    const allPeriods = [];
    const diasMes = new Date(anioActual, mesActual + 1, 0).getDate();
    for (let dia = 1; dia <= diasMes; dia++) {
      allPeriods.push({
        sortKey: `${anioActual}-${String(mesActual+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`,
        label: `${String(dia).padStart(2,'0')}/${String(mesActual+1).padStart(2,'0')}`
      });
    }
    return { dateFormat: '%Y-%m-%d', fechaInicio: new Date(anioActual, mesActual, 1), allPeriods };
  }

  _periodoAnio(ahora) {
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();
    const nombresMeses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const allPeriods = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(anioActual, mesActual - i, 1);
      allPeriods.push({
        sortKey: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
        label: `${nombresMeses[d.getMonth()]} ${d.getFullYear()}`
      });
    }
    return { dateFormat: '%Y-%m', fechaInicio: new Date(anioActual, mesActual - 11, 1), allPeriods };
  }

  _configurarPeriodo(periodo) {
    const ahora = new Date();
    if (periodo === 'hoy') {return this._periodoHoy(ahora);}
    if (periodo === '1semana') {return this._periodoSemana(ahora);}
    if (periodo === '1mes') {return this._periodoMes(ahora);}
    return this._periodoAnio(ahora);
  }

  async _obtenerTendenciasPrestamos(periodo) {
    const Op = this.Prestamo.sequelize.constructor.Op;
    const fn = this.sequelize.fn;
    const col = this.sequelize.col;
    const literal = this.sequelize.literal;
    const { dateFormat, fechaInicio, allPeriods } = this._configurarPeriodo(periodo);

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

    return allPeriods.map(p => ({
      mes: p.label,
      total: lookup[p.sortKey] || 0
    }));
  }

  async obtenerEstadisticas(periodo = '12meses') {
    const [contadores, topMateriales, materialesPorTipo, prestamosPorMes] = await Promise.all([
      this._obtenerContadores(),
      this._obtenerTopMateriales(),
      this._obtenerMaterialesPorTipo(),
      this._obtenerTendenciasPrestamos(periodo)
    ]);
    return { ...contadores, topMateriales, materialesPorTipo, prestamosPorMes, periodo };
  }
}

module.exports = DashboardService;
