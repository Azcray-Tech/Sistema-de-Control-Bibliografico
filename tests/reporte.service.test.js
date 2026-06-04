/**
 * @requirement RF-31, RF-32, RF-33, RF-34, RF-35, RF-36, RF-37
 * @use_case CU-31, CU-32, CU-33, CU-34, CU-35, CU-36, CU-37
 * @description Pruebas unitarias del servicio de reportes.
 */
const ReporteService = require('../services/reporte.service');
const { crearMocksModelos } = require('./mocks/models');

const crearMockMaterial = (id, extras = {}) => ({
  idMaterial: id,
  titulo: `Material ${id}`,
  tipo: 'libro',
  anioPublicacion: 2020,
  signatura: `SIG-${id}`,
  Categoria: { nombre: 'Literatura' },
  Autores: [{ nombre: 'Autor', apellido: `${id}` }],
  Ejemplares: [
    { estado: 'Disponible' },
    { estado: 'Prestado' }
  ],
  toJSON: function () { return { ...this }; },
  ...extras
});

describe('ReporteService', () => {
  let reporteService;
  let mocks;

  beforeEach(() => {
    mocks = crearMocksModelos();
    reporteService = new ReporteService(mocks);
  });

  describe('generarInventario', () => {
    it('debe generar PDF con todos los materiales', async () => {
      mocks.Material.findAll.mockResolvedValue([crearMockMaterial(1)]);
      const resultado = await reporteService.generarInventario({}, 'pdf');
      expect(resultado.buffer).toBeInstanceOf(Buffer);
      expect(resultado.nombre).toBe('inventario.pdf');
      expect(resultado.extension).toBe('pdf');
    });

    it('debe generar Excel con filtro por tipo', async () => {
      mocks.Material.findAll.mockResolvedValue([crearMockMaterial(1, { tipo: 'revista' })]);
      const resultado = await reporteService.generarInventario({ tipo: 'revista' }, 'excel');
      expect(mocks.Material.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tipo: 'revista' } })
      );
      expect(resultado.buffer).toBeInstanceOf(Buffer);
      expect(resultado.nombre).toBe('inventario.xlsx');
      expect(resultado.extension).toBe('xlsx');
    });

    it('debe devolver resultados vacíos si no hay materiales', async () => {
      mocks.Material.findAll.mockResolvedValue([]);
      const resultado = await reporteService.generarInventario({}, 'pdf');
      expect(resultado.buffer).toBeInstanceOf(Buffer);
      expect(resultado.nombre).toBe('inventario.pdf');
    });
  });

  describe('generarPrestamosActivos', () => {
    const crearMockPrestamo = (id, vencida = false) => {
      const hoy = new Date();
      const fechaVenc = new Date(hoy);
      fechaVenc.setDate(fechaVenc.getDate() + (vencida ? -5 : 5));
      return {
        idPrestamo: id,
        fechaPrestamo: hoy,
        fechaDevolucionPrevista: fechaVenc,
        estado: 'Activo',
        Solicitante: { cedula: '123', nombre: 'Juan', apellido: 'Perez' },
        Ejemplar: {
          identificadorUnico: `E-${id}`,
          Material: { titulo: `Material ${id}` }
        }
      };
    };

    it('debe generar PDF con todos los activos', async () => {
      mocks.Prestamo.findAll.mockResolvedValue([crearMockPrestamo(1), crearMockPrestamo(2, true)]);
      const resultado = await reporteService.generarPrestamosActivos({}, 'pdf');
      expect(resultado.buffer).toBeInstanceOf(Buffer);
      expect(resultado.nombre).toBe('prestamos_activos.pdf');
    });

    it('debe filtrar solo vencidos si se solicita', async () => {
      mocks.Prestamo.findAll.mockResolvedValue([crearMockPrestamo(1), crearMockPrestamo(2, true)]);
      const resultado = await reporteService.generarPrestamosActivos({ soloVencidos: true }, 'excel');
      expect(resultado.nombre).toBe('prestamos_activos.xlsx');
      expect(resultado.extension).toBe('xlsx');
    });
  });

  describe('generarHistorialSolicitante', () => {
    it('debe lanzar error si no se proporciona cédula', async () => {
      await expect(reporteService.generarHistorialSolicitante('')).rejects.toThrow('cédula');
    });

    it('debe lanzar error si el solicitante no existe', async () => {
      mocks.Solicitante.findByPk.mockResolvedValue(null);
      await expect(reporteService.generarHistorialSolicitante('999')).rejects.toThrow('No se encontró');
    });

    it('debe generar PDF con historial', async () => {
      mocks.Solicitante.findByPk.mockResolvedValue({ cedula: '123', nombre: 'Juan', apellido: 'Perez' });
      mocks.Prestamo.findAll.mockResolvedValue([]);
      mocks.Sancion.findAll.mockResolvedValue([]);
      const resultado = await reporteService.generarHistorialSolicitante('123', 'pdf');
      expect(resultado.buffer).toBeInstanceOf(Buffer);
      expect(resultado.nombre).toContain('historial');
    });
  });

  describe('generarRanking', () => {
    it('debe generar PDF sin filtros', async () => {
      mocks.Prestamo.findAll.mockResolvedValue([]);
      const resultado = await reporteService.generarRanking({ periodo: 'mes' }, 'pdf');
      expect(resultado.buffer).toBeInstanceOf(Buffer);
      expect(resultado.nombre).toBe('ranking.pdf');
    });

    it('debe aceptar filtro topN', async () => {
      mocks.Prestamo.findAll.mockResolvedValue([]);
      const resultado = await reporteService.generarRanking({ periodo: 'anio', topN: 5 }, 'excel');
      expect(resultado.nombre).toBe('ranking.xlsx');
      expect(resultado.extension).toBe('xlsx');
    });
  });

  describe('generarVencidosContacto', () => {
    it('debe generar PDF con vencidos', async () => {
      mocks.Prestamo.findAll.mockResolvedValue([]);
      const resultado = await reporteService.generarVencidosContacto({}, 'pdf');
      expect(resultado.buffer).toBeInstanceOf(Buffer);
      expect(resultado.nombre).toBe('vencidos_contacto.pdf');
    });

    it('debe filtrar por días mínimo', async () => {
      mocks.Prestamo.findAll.mockResolvedValue([]);
      const resultado = await reporteService.generarVencidosContacto({ diasMinimo: 5 }, 'excel');
      expect(resultado.nombre).toBe('vencidos_contacto.xlsx');
    });
  });

  describe('generarEstadisticas', () => {
    it('debe lanzar error si falta período', async () => {
      await expect(reporteService.generarEstadisticas({}, 'pdf')).rejects.toThrow('período');
    });

    it('debe generar PDF con período válido', async () => {
      mocks.Prestamo.findAll.mockResolvedValue([]);
      const resultado = await reporteService.generarEstadisticas(
        { fechaDesde: '2026-01-01', fechaHasta: '2026-12-31' }, 'pdf'
      );
      expect(resultado.buffer).toBeInstanceOf(Buffer);
      expect(resultado.nombre).toContain('estadisticas');
    });
  });

  describe('generarSuspendidos', () => {
    it('debe generar PDF con todos los suspendidos', async () => {
      mocks.Solicitante.findAll.mockResolvedValue([]);
      const resultado = await reporteService.generarSuspendidos({}, 'pdf');
      expect(resultado.buffer).toBeInstanceOf(Buffer);
      expect(resultado.nombre).toBe('suspendidos.pdf');
    });

    it('debe filtrar por tipo de suspensión', async () => {
      mocks.Solicitante.findAll.mockResolvedValue([]);
      const resultado = await reporteService.generarSuspendidos({ tipoSuspension: 'temporal' }, 'excel');
      expect(resultado.nombre).toBe('suspendidos.xlsx');
      expect(resultado.extension).toBe('xlsx');
    });
  });
});
