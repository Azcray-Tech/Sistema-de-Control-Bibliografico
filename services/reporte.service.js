/**
 * @requirement RF-31, RF-32, RF-33, RF-34, RF-35, RF-36, RF-37
 * @use_case CU-31, CU-32, CU-33, CU-34, CU-35, CU-36, CU-37
 * @description Servicio de reportes: genera archivos PDF/Excel para los 7 reportes del Ciclo 4.
 */
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

class ReporteService {
  constructor({ Material, Ejemplar, Prestamo, Solicitante, Categoria, Autor, Sancion, sequelize }) {
    this.Material = Material;
    this.Ejemplar = Ejemplar;
    this.Prestamo = Prestamo;
    this.Solicitante = Solicitante;
    this.Categoria = Categoria;
    this.Autor = Autor;
    this.Sancion = Sancion;
    this.sequelize = sequelize;
  }

  async _generarExcel({ columns, data, name, sheetName = 'Reporte', highlightFn }) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Bibliográfico CEELA';
    const ws = workbook.addWorksheet(sheetName);

    ws.columns = columns.map(c => ({
      header: c.header, key: c.key, width: c.width || 20, style: c.style
    }));

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
    headerRow.alignment = { horizontal: 'center' };
    headerRow.height = 24;

    data.forEach((row, _ri) => {
      const r = ws.addRow(row);
      if (highlightFn && highlightFn(row)) {
        r.eachCell(c => {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCDD2' } };
          c.font = { color: { argb: 'FFB71C1C' } };
        });
      }
    });

    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: data.length + 1, column: columns.length } };

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer, nombre: `${name}.xlsx`, extension: 'xlsx' };
  }

  async _generarPDF({ columns, data, name, title, highlightFn }) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 40, size: 'A4',
        layout: columns.length > 5 ? 'landscape' : 'portrait',
        bufferPages: true
      });
      const buffers = [];
      doc.on('data', c => buffers.push(c));
      doc.on('end', () => resolve({ buffer: Buffer.concat(buffers), nombre: `${name}.pdf`, extension: 'pdf' }));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 80;
      const leftMargin = 40;

      const colWidths = columns.map(c => Math.max(c.width || 20, c.header.length * 0.65));
      const totalBase = colWidths.reduce((a, b) => a + b, 0);
      const scale = pageWidth / totalBase;
      const widths = colWidths.map(w => Math.max(w * scale, 14));

      const headerBg = '#1a237e';
      const headerFg = '#FFFFFF';
      const borderColor = '#B0BEC5';
      const evenBg = '#F5F7FA';
      const oddBg = '#FFFFFF';
      const highlightBg = '#FFCDD2';
      const textColor = '#263238';
      const highlightTextColor = '#B71C1C';
      const rowPadding = 4;

      let yPos = doc.y;
      let pageNum = 0;

      const drawFooter = () => {
        doc.fontSize(7).font('Helvetica').fillColor('#78909C');
        doc.text(
          `Sistema Bibliográfico CEELA · Generado: ${new Date().toLocaleDateString()} · Pág. ${pageNum}`,
          leftMargin, doc.page.height - 30,
          { width: pageWidth, align: 'center' }
        );
      };

      const drawHeader = () => {
        let xPos = leftMargin;
        columns.forEach((c, i) => {
          doc.save();
          doc.rect(xPos, yPos, widths[i], 18);
          doc.fillColor(headerBg).fill();
          doc.rect(xPos, yPos, widths[i], 18).lineWidth(0.5).strokeColor(borderColor).stroke();
          doc.clip();
          doc.fillColor(headerFg).fontSize(7.5).font('Helvetica-Bold').text(
            c.header, xPos + rowPadding, yPos + 4,
            { width: widths[i] - rowPadding * 2, align: 'left' }
          );
          doc.restore();
          xPos += widths[i];
        });
        yPos += 18;
      };

      doc.fontSize(14).font('Helvetica-Bold').fillColor(headerBg).text(title, { align: 'center' });
      doc.moveDown(0.4);
      doc.fontSize(7.5).font('Helvetica').fillColor('#78909C').text(
        `Generado: ${new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        { align: 'right' }
      );
      doc.moveDown(0.5);
      yPos = doc.y;

      if (data.length === 0) {
        doc.fontSize(10).font('Helvetica').fillColor('#78909C').text('No hay datos disponibles para este reporte.', { align: 'center' });
        drawFooter();
        doc.end();
        return;
      }

      pageNum++;
      drawHeader();

      for (let ri = 0; ri < data.length; ri++) {
        const row = data[ri];
        const hl = highlightFn ? highlightFn(row) : false;
        const rowBg = hl ? highlightBg : (ri % 2 === 0 ? evenBg : oddBg);
        const rowFg = hl ? highlightTextColor : textColor;
        const rowH = 15;

        if (yPos + rowH > doc.page.height - 50) {
          drawFooter();
          doc.addPage();
          pageNum++;
          yPos = doc.y;
          drawHeader();
        }

        let xPos = leftMargin;
        columns.forEach((c, i) => {
          doc.save();
          doc.rect(xPos, yPos, widths[i], rowH);
          doc.fillColor(rowBg).fill();
          doc.rect(xPos, yPos, widths[i], rowH).lineWidth(0.5).strokeColor(borderColor).stroke();
          doc.clip();
          const val = c.formatter ? c.formatter(row[c.key]) : (row[c.key] !== null && row[c.key] !== undefined ? String(row[c.key]) : '');
          doc.fillColor(rowFg).fontSize(7).font('Helvetica').text(
            val, xPos + rowPadding, yPos + 3,
            { width: widths[i] - rowPadding * 2, height: rowH - 3, align: 'left', ellipsis: true }
          );
          doc.restore();
          xPos += widths[i];
        });
        yPos += rowH;
      }

      drawFooter();
      doc.end();
    });
  }

  async generarInventario({ tipo, categoriaId } = {}, formato = 'pdf') {
    const where = {};

    if (tipo) {where.tipo = tipo;}
    if (categoriaId) {where.categoriaId = parseInt(categoriaId, 10);}

    const materiales = await this.Material.findAll({
      where,
      include: [
        { model: this.Categoria, attributes: ['nombre'] },
        { model: this.Autor, as: 'autores', attributes: ['nombre', 'apellido'], through: { attributes: [] } },
        { model: this.Ejemplar, as: 'ejemplares', attributes: ['idEjemplar', 'estado'], required: false }
      ],
      order: [['titulo', 'ASC']]
    });

    const data = materiales.map(m => {
      const total = m.ejemplares ? m.ejemplares.length : 0;
      const disponibles = m.ejemplares ? m.ejemplares.filter(e => e.estado === 'Disponible').length : 0;
      const autores = m.autores ? m.autores.map(a => `${a.apellido}, ${a.nombre}`).join(', ') : '';
      return {
        titulo: m.titulo,
        tipo: m.tipo,
        categoria: m.Categorium ? m.Categorium.nombre : '',
        autores,
        anio: m.anioPublicacion,
        signatura: m.signatura,
        totalEjemplares: total,
        disponibles
      };
    });

    const columns = [
      { header: 'Título', key: 'titulo', width: 40 },
      { header: 'Tipo', key: 'tipo', width: 12 },
      { header: 'Categoría', key: 'categoria', width: 18 },
      { header: 'Autores', key: 'autores', width: 35 },
      { header: 'Año', key: 'anio', width: 8 },
      { header: 'Signatura', key: 'signatura', width: 15 },
      { header: 'Total Ej.', key: 'totalEjemplares', width: 10 },
      { header: 'Disponibles', key: 'disponibles', width: 10 }
    ];

    if (formato === 'excel') {
      return this._generarExcel({ columns, data, name: 'inventario', sheetName: 'Inventario' });
    }
    return this._generarPDF({ columns, data, name: 'inventario', title: 'Reporte de Inventario Completo' });
  }

  async generarPrestamosActivos({ soloVencidos } = {}, formato = 'pdf') {
    const where = { estado: 'Activo' };

    const prestamos = await this.Prestamo.findAll({
      where,
      include: [
        { model: this.Solicitante, attributes: ['cedula', 'nombre', 'apellido'] },
        {
          model: this.Ejemplar,
          include: [{ model: this.Material, attributes: ['titulo'] }],
          attributes: ['identificadorUnico']
        }
      ],
      order: [['fechaDevolucionPrevista', 'ASC']]
    });

    const hoy = new Date();
    let data = prestamos.map(p => {
      const vencida = new Date(p.fechaDevolucionPrevista) < hoy;
      return {
        titulo: p.Ejemplar?.Material?.titulo || '',
        ejemplar: p.Ejemplar?.identificadorUnico || '',
        solicitante: `${p.Solicitante?.apellido || ''}, ${p.Solicitante?.nombre || ''}`,
        fechaPrestamo: p.fechaPrestamo,
        fechaVencimiento: p.fechaDevolucionPrevista,
        vencida: vencida ? 'Sí' : 'No'
      };
    });

    if (soloVencidos === 'true' || soloVencidos === true) {
      data = data.filter(d => d.vencida === 'Sí');
    }

    const columns = [
      { header: 'Título', key: 'titulo', width: 40 },
      { header: 'Ejemplar', key: 'ejemplar', width: 14 },
      { header: 'Solicitante', key: 'solicitante', width: 30 },
      { header: 'Fecha Préstamo', key: 'fechaPrestamo', width: 16, formatter: v => v ? new Date(v).toLocaleDateString() : '' },
      { header: 'Fecha Vencimiento', key: 'fechaVencimiento', width: 16, formatter: v => v ? new Date(v).toLocaleDateString() : '' },
      { header: 'Vencida', key: 'vencida', width: 10 }
    ];

    if (formato === 'excel') {
      const wbData = data.map(d => ({ ...d }));
      return this._generarExcel({ columns, data: wbData, name: 'prestamos_activos', sheetName: 'Préstamos', highlightFn: row => row.vencida === 'Sí' });
    }
    return this._generarPDF({
      columns, data, name: 'prestamos_activos', title: 'Reporte de Préstamos Activos',
      highlightFn: row => row.vencida === 'Sí'
    });
  }

  async generarHistorialSolicitante(cedula, formato = 'pdf') {
    if (!cedula) {throw new Error('La cédula del solicitante es obligatoria');}

    const solicitante = await this.Solicitante.findByPk(cedula);
    if (!solicitante) {throw new Error('No se encontró un solicitante con esa cédula');}

    const prestamos = await this.Prestamo.findAll({
      where: { solicitanteCedula: cedula },
      include: [
        {
          model: this.Ejemplar,
          include: [{ model: this.Material, attributes: ['titulo'] }],
          attributes: ['identificadorUnico']
        }
      ],
      order: [['fechaPrestamo', 'DESC']]
    });

    const hoy = new Date();
    const data = prestamos.map(p => {
      const diasRetraso = p.fechaDevolucionReal
        ? Math.max(0, Math.floor((new Date(p.fechaDevolucionReal) - new Date(p.fechaDevolucionPrevista)) / 86400000))
        : (p.estado === 'Activo' ? Math.max(0, Math.floor((hoy - new Date(p.fechaDevolucionPrevista)) / 86400000)) : null);
      return {
        titulo: p.Ejemplar?.Material?.titulo || '',
        ejemplar: p.Ejemplar?.identificadorUnico || '',
        fechaPrestamo: p.fechaPrestamo,
        fechaVencimiento: p.fechaDevolucionPrevista,
        fechaDevolucion: p.fechaDevolucionReal || 'Pendiente',
        estado: p.estado,
        diasRetraso: diasRetraso !== null && diasRetraso !== undefined ? diasRetraso : '-'
      };
    });

    const columns = [
      { header: 'Título', key: 'titulo', width: 40 },
      { header: 'Ejemplar', key: 'ejemplar', width: 14 },
      { header: 'Fecha Préstamo', key: 'fechaPrestamo', width: 16, formatter: v => v ? new Date(v).toLocaleDateString() : '' },
      { header: 'Vencimiento', key: 'fechaVencimiento', width: 16, formatter: v => v ? new Date(v).toLocaleDateString() : '' },
      { header: 'Devolución', key: 'fechaDevolucion', width: 16, formatter: v => v && v !== 'Pendiente' ? new Date(v).toLocaleDateString() : v },
      { header: 'Días Retraso', key: 'diasRetraso', width: 10 },
      { header: 'Estado', key: 'estado', width: 12 }
    ];

    const statusLabel = {
      'ACTIVO': 'Activo',
      'SUSPENDIDO_TEMPORAL': 'Suspendido temporal',
      'SUSPENDIDO_PERMANENTE': 'Suspendido permanente'
    }[solicitante.estado] || solicitante.estado;

    if (formato === 'excel') {
      return this._generarExcel({ columns, data, name: `historial_${cedula}`, sheetName: 'Historial' });
    }
    return this._generarPDF({
      columns, data, name: `historial_${cedula}`,
      title: `Historial de Préstamos - ${solicitante.nombre} ${solicitante.apellido} (${statusLabel})`
    });
  }

  async generarRanking({ periodo, topN } = {}, formato = 'pdf') {
    if (!periodo) {throw new Error('El período (mes, anio o fecha personalizada) es obligatorio');}

    const Op = this.Prestamo.sequelize.constructor.Op;
    const fn = this.sequelize.fn;
    const col = this.sequelize.col;
    const literal = this.sequelize.literal;

    let fechaInicio;
    const hoy = new Date();
    if (periodo === 'mes') {
      fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    } else if (periodo === 'anio') {
      fechaInicio = new Date(hoy.getFullYear(), 0, 1);
    } else if (periodo === 'todo') {
      fechaInicio = new Date(0);
    } else {
      fechaInicio = new Date(periodo);
    }

    const limit = topN ? parseInt(topN, 10) : null;

    const raw = await this.Prestamo.findAll({
      attributes: [
        [col('ejemplar_id'), 'ejemplarId'],
        [fn('COUNT', col('id_prestamo')), 'total']
      ],
      where: { fechaPrestamo: { [Op.gte]: fechaInicio } },
      group: ['ejemplar_id'],
      order: [[literal('total'), 'DESC']],
      limit: limit || undefined,
      raw: true,
      subQuery: false
    });

    const data = await Promise.all(raw.map(async (item) => {
      const ejemplar = await this.Ejemplar.findByPk(item.ejemplarId, {
        include: [
          { model: this.Material, include: [{ model: this.Autor, as: 'autores', through: { attributes: [] } }] }
        ]
      });
      const m = ejemplar?.Material;
      const autores = m?.autores ? m.autores.map(a => `${a.apellido}, ${a.nombre}`).join(', ') : '';
      return {
        titulo: m?.titulo || 'Sin título',
        tipo: m?.tipo || '',
        autores,
        totalPrestamos: parseInt(item.total, 10)
      };
    }));

    const columns = [
      { header: '#', key: 'pos', width: 6, formatter: v => v },
      { header: 'Título', key: 'titulo', width: 45 },
      { header: 'Tipo', key: 'tipo', width: 12 },
      { header: 'Autores', key: 'autores', width: 35 },
      { header: 'Préstamos', key: 'totalPrestamos', width: 12 }
    ];

    if (formato === 'excel') {
      const wbData = data.map((d, i) => ({ pos: i + 1, ...d }));
      return this._generarExcel({ columns, data: wbData, name: 'ranking', sheetName: 'Ranking' });
    }
    return this._generarPDF({ columns, data: data.map((d, i) => ({ pos: i + 1, ...d })), name: 'ranking', title: 'Ranking de Materiales Más Prestados' });
  }

  async generarVencidosContacto({ diasMinimo } = {}, formato = 'pdf') {
    const Op = this.Prestamo.sequelize.constructor.Op;
    const hoy = new Date();

    const prestamos = await this.Prestamo.findAll({
      where: { estado: 'Activo', fechaDevolucionPrevista: { [Op.lt]: hoy } },
      include: [
        { model: this.Solicitante, attributes: ['cedula', 'nombre', 'apellido', 'correoElectronico', 'telefono'] },
        {
          model: this.Ejemplar,
          include: [{ model: this.Material, attributes: ['titulo'] }],
          attributes: ['identificadorUnico']
        }
      ],
      order: [['fechaDevolucionPrevista', 'ASC']]
    });

    let data = prestamos.map(p => {
      const prevista = new Date(p.fechaDevolucionPrevista);
      const retraso = Math.max(0, Math.floor((hoy - prevista) / 86400000));
      return {
        solicitante: `${p.Solicitante?.apellido || ''}, ${p.Solicitante?.nombre || ''}`,
        cedula: p.Solicitante?.cedula || '',
        correo: p.Solicitante?.correoElectronico || '',
        telefono: p.Solicitante?.telefono || '',
        titulo: p.Ejemplar?.Material?.titulo || '',
        ejemplar: p.Ejemplar?.identificadorUnico || '',
        fechaPrestamo: p.fechaPrestamo,
        fechaVencimiento: p.fechaDevolucionPrevista,
        diasRetraso: retraso
      };
    });

    if (diasMinimo) {
      const min = parseInt(diasMinimo, 10);
      if (!isNaN(min) && min > 0) {
        data = data.filter(d => d.diasRetraso >= min);
      }
    }

    const columns = [
      { header: 'Solicitante', key: 'solicitante', width: 28 },
      { header: 'Cédula', key: 'cedula', width: 14 },
      { header: 'Correo', key: 'correo', width: 30 },
      { header: 'Teléfono', key: 'telefono', width: 14 },
      { header: 'Título', key: 'titulo', width: 35 },
      { header: 'Ejemplar', key: 'ejemplar', width: 12 },
      { header: 'Días Retraso', key: 'diasRetraso', width: 12 }
    ];

    if (formato === 'excel') {
      return this._generarExcel({ columns, data, name: 'vencidos_contacto', sheetName: 'Vencidos' });
    }
    return this._generarPDF({
      columns, data, name: 'vencidos_contacto', title: 'Préstamos Vencidos con Datos de Contacto',
      highlightFn: row => row.diasRetraso > 0
    });
  }

  async generarEstadisticas({ fechaDesde, fechaHasta } = {}, formato = 'pdf') {
    if (!fechaDesde || !fechaHasta) {throw new Error('El período (fecha_desde y fecha_hasta) es obligatorio');}

    const Op = this.Prestamo.sequelize.constructor.Op;
    const fn = this.sequelize.fn;
    const col = this.sequelize.col;

    const raw = await this.Prestamo.findAll({
      attributes: [
        'ejemplarId',
        [fn('COUNT', col('id_prestamo')), 'total']
      ],
      where: {
        fechaPrestamo: { [Op.between]: [new Date(fechaDesde), new Date(fechaHasta)] }
      },
      group: ['ejemplarId'],
      raw: true,
      subQuery: false
    });

    const mapTipo = {};

    for (const item of raw) {
      const ej = await this.Ejemplar.findByPk(item.ejemplarId, {
        include: [{ model: this.Material }]
      });
      const m = ej?.Material;
      if (m) {
        const key = `${m.tipo}|${m.categoriaId}`;
        if (!mapTipo[key]) {
          mapTipo[key] = { tipo: m.tipo, categoriaId: m.categoriaId, total: 0 };
        }
        mapTipo[key].total += parseInt(item.total, 10);
      }
    }

    const grupos = Object.values(mapTipo);
    const catIds = [...new Set(grupos.map(g => g.categoriaId).filter(id => id !== null && id !== undefined))];
    const categorias = catIds.length > 0
      ? await this.Categoria.findAll({ where: { idCategoria: catIds } })
      : [];
    const catMap = {};
    for (const cat of categorias) {
      catMap[cat.idCategoria] = cat.nombre;
    }

    const data = grupos.map(item => ({
      categoria: item.categoriaId ? (catMap[item.categoriaId] || 'Sin categoría') : 'Sin categoría',
      tipo: item.tipo,
      totalPrestamos: item.total
    }));

    data.sort((a, b) => b.totalPrestamos - a.totalPrestamos);

    const columns = [
      { header: 'Categoría', key: 'categoria', width: 25 },
      { header: 'Tipo de Material', key: 'tipo', width: 18 },
      { header: 'Cantidad Préstamos', key: 'totalPrestamos', width: 20 }
    ];

    if (formato === 'excel') {
      return this._generarExcel({ columns, data, name: `estadisticas_${fechaDesde}_${fechaHasta}`, sheetName: 'Estadísticas' });
    }
    return this._generarPDF({ columns, data, name: `estadisticas_${fechaDesde}_${fechaHasta}`, title: 'Estadísticas de Préstamos por Categoría y Tipo' });
  }

  async generarSuspendidos({ tipoSuspension } = {}, formato = 'pdf') {
    const Op = this.Sancion.sequelize.constructor.Op;
    const where = {};

    if (tipoSuspension === 'temporal') {
      where.estado = 'Suspendido temporal';
    } else if (tipoSuspension === 'permanente') {
      where.estado = 'Suspendido permanente';
    } else {
      where[Op.or] = [
        { estado: 'Suspendido temporal' },
        { estado: 'Suspendido permanente' }
      ];
    }

    const solicitantes = await this.Solicitante.findAll({
      where,
      include: [
        {
          model: this.Sancion,
          required: false,
          order: [['fechaInicio', 'DESC']],
          limit: 1
        }
      ],
      order: [['apellido', 'ASC']]
    });

    const data = solicitantes.map(s => {
      const ultimaSancion = s.Sancions && s.Sancions.length > 0 ? s.Sancions[0] : null;
      return {
        cedula: s.cedula,
        nombre: `${s.apellido}, ${s.nombre}`,
        tipoSuspension: s.estado,
        fechaFin: s.estado === 'Suspendido temporal' ? (s.fechaFinSuspension ? new Date(s.fechaFinSuspension).toLocaleDateString() : '') : 'Permanente',
        ultimoMotivo: ultimaSancion ? (ultimaSancion.motivo || 'No registrado') : 'No registrado'
      };
    });

    const columns = [
      { header: 'Cédula', key: 'cedula', width: 14 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Tipo Suspensión', key: 'tipoSuspension', width: 22 },
      { header: 'Fecha Fin', key: 'fechaFin', width: 16 },
      { header: 'Último Motivo', key: 'ultimoMotivo', width: 40 }
    ];

    if (formato === 'excel') {
      return this._generarExcel({ columns, data, name: 'suspendidos', sheetName: 'Suspendidos' });
    }
    return this._generarPDF({ columns, data, name: 'suspendidos', title: 'Listado de Solicitantes Suspendidos' });
  }
}

module.exports = ReporteService;
