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

    it('debe filtrar por tipo permanente', async () => {
      mocks.Solicitante.findAll.mockResolvedValue([]);
      const resultado = await reporteService.generarSuspendidos({ tipoSuspension: 'permanente' }, 'pdf');
      expect(mocks.Solicitante.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { estado: 'Suspendido permanente' } })
      );
      expect(resultado.buffer).toBeInstanceOf(Buffer);
    });

    it('debe generar suspendidos con sanciones', async () => {
      mocks.Solicitante.findAll.mockResolvedValue([{
        cedula: '123',
        nombre: 'Juan',
        apellido: 'Perez',
        estado: 'Suspendido permanente',
        Sancions: [{ motivo: 'Devolución tardía', fechaInicio: new Date() }]
      }]);
      const resultado = await reporteService.generarSuspendidos({}, 'pdf');
      expect(resultado.buffer).toBeInstanceOf(Buffer);
    });

    it('debe generar Excel con suspendidos y sanciones', async () => {
      mocks.Solicitante.findAll.mockResolvedValue([{
        cedula: '123',
        nombre: 'Juan',
        apellido: 'Perez',
        estado: 'Suspendido temporal',
        fechaFinSuspension: new Date(),
        Sancions: [{ motivo: 'Retraso', fechaInicio: new Date() }]
      }]);
      const resultado = await reporteService.generarSuspendidos({ tipoSuspension: 'temporal' }, 'excel');
      expect(resultado.nombre).toBe('suspendidos.xlsx');
      expect(resultado.extension).toBe('xlsx');
    });
  });

  describe('generarInventario (categoriaId)', () => {
    it('debe aplicar filtro por categoriaId', async () => {
      mocks.Material.findAll.mockResolvedValue([crearMockMaterial(1)]);
      const resultado = await reporteService.generarInventario({ categoriaId: '2' }, 'pdf');
      expect(mocks.Material.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { categoriaId: 2 } })
      );
      expect(resultado.buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('generarHistorialSolicitante (cobertura)', () => {
    const baseSolicitante = { cedula: '123', nombre: 'Juan', apellido: 'Perez', estado: 'ACTIVO' };

    it('debe calcular diasRetraso con fechaDevolucionReal', async () => {
      const fechaPrestamo = new Date('2026-01-01');
      const fechaVenc = new Date('2026-01-15');
      const fechaDev = new Date('2026-01-20');
      mocks.Solicitante.findByPk.mockResolvedValue(baseSolicitante);
      mocks.Prestamo.findAll.mockResolvedValue([{
        fechaPrestamo,
        fechaDevolucionPrevista: fechaVenc,
        fechaDevolucionReal: fechaDev,
        estado: 'Devuelto',
        Ejemplar: { identificadorUnico: 'E-1', Material: { titulo: 'Material' } }
      }]);
      mocks.Sancion.findAll.mockResolvedValue([]);
      const resultado = await reporteService.generarHistorialSolicitante('123', 'pdf');
      expect(resultado.buffer).toBeInstanceOf(Buffer);
    });

    it('debe calcular diasRetraso con estado Activo sin devolución', async () => {
      const fechaPrestamo = new Date('2026-01-01');
      const fechaVenc = new Date('2026-01-15');
      mocks.Solicitante.findByPk.mockResolvedValue(baseSolicitante);
      mocks.Prestamo.findAll.mockResolvedValue([{
        fechaPrestamo,
        fechaDevolucionPrevista: fechaVenc,
        fechaDevolucionReal: null,
        estado: 'Activo',
        Ejemplar: { identificadorUnico: 'E-1', Material: { titulo: 'Material' } }
      }]);
      mocks.Sancion.findAll.mockResolvedValue([]);
      const resultado = await reporteService.generarHistorialSolicitante('123', 'pdf');
      expect(resultado.buffer).toBeInstanceOf(Buffer);
    });

    it('debe generar Excel con historial', async () => {
      mocks.Solicitante.findByPk.mockResolvedValue(baseSolicitante);
      mocks.Prestamo.findAll.mockResolvedValue([]);
      mocks.Sancion.findAll.mockResolvedValue([]);
      const resultado = await reporteService.generarHistorialSolicitante('123', 'excel');
      expect(resultado.nombre).toBe('historial_123.xlsx');
      expect(resultado.extension).toBe('xlsx');
    });
  });

  describe('generarRanking (cobertura)', () => {
    it('debe aceptar periodo todo', async () => {
      mocks.Prestamo.findAll.mockResolvedValue([]);
      const resultado = await reporteService.generarRanking({ periodo: 'todo' }, 'pdf');
      expect(resultado.buffer).toBeInstanceOf(Buffer);
    });

    it('debe aceptar fecha personalizada como periodo', async () => {
      mocks.Prestamo.findAll.mockResolvedValue([]);
      const resultado = await reporteService.generarRanking({ periodo: '2026-01-01' }, 'pdf');
      expect(resultado.buffer).toBeInstanceOf(Buffer);
    });

    it('debe generar ranking con datos de ejemplares', async () => {
      mocks.Prestamo.findAll.mockResolvedValue([
        { ejemplarId: 1, total: '5' }
      ]);
      mocks.Ejemplar.findByPk.mockResolvedValue({
        Material: {
          titulo: 'Material 1',
          tipo: 'libro',
          autores: [{ nombre: 'Autor', apellido: '1' }]
        }
      });
      const resultado = await reporteService.generarRanking({ periodo: 'mes' }, 'pdf');
      expect(resultado.buffer).toBeInstanceOf(Buffer);
    });

    it('debe generar Excel con ranking de datos', async () => {
      mocks.Prestamo.findAll.mockResolvedValue([
        { ejemplarId: 1, total: '3' }
      ]);
      mocks.Ejemplar.findByPk.mockResolvedValue({
        Material: {
          titulo: 'Material 1',
          tipo: 'revista',
          autores: [{ nombre: 'Autor', apellido: '2' }]
        }
      });
      const resultado = await reporteService.generarRanking({ periodo: 'anio' }, 'excel');
      expect(resultado.nombre).toBe('ranking.xlsx');
      expect(resultado.extension).toBe('xlsx');
    });
  });

  describe('generarVencidosContacto (cobertura)', () => {
    const crearMockVencido = (diasRetraso, cedula = '123') => {
      const hoy = new Date();
      const fechaVenc = new Date(hoy);
      fechaVenc.setDate(fechaVenc.getDate() - diasRetraso);
      return {
        fechaDevolucionPrevista: fechaVenc,
        fechaPrestamo: new Date(hoy.getTime() - (diasRetraso + 10) * 86400000),
        Solicitante: {
          cedula,
          nombre: 'Juan',
          apellido: 'Perez',
          correoElectronico: 'juan@test.com',
          telefono: '555-1234'
        },
        Ejemplar: {
          identificadorUnico: `E-${cedula}`,
          Material: { titulo: 'Material' }
        }
      };
    };

    it('debe generar vencidos con datos de préstamos', async () => {
      mocks.Prestamo.findAll.mockResolvedValue([crearMockVencido(10)]);
      const resultado = await reporteService.generarVencidosContacto({}, 'pdf');
      expect(resultado.buffer).toBeInstanceOf(Buffer);
    });

    it('debe filtrar vencidos por días mínimo con datos', async () => {
      mocks.Prestamo.findAll.mockResolvedValue([
        crearMockVencido(3, '111'),
        crearMockVencido(10, '222')
      ]);
      const resultado = await reporteService.generarVencidosContacto({ diasMinimo: 5 }, 'pdf');
      expect(resultado.buffer).toBeInstanceOf(Buffer);
    });

    it('debe generar Excel con vencidos', async () => {
      mocks.Prestamo.findAll.mockResolvedValue([crearMockVencido(7)]);
      const resultado = await reporteService.generarVencidosContacto({}, 'excel');
      expect(resultado.nombre).toBe('vencidos_contacto.xlsx');
      expect(resultado.extension).toBe('xlsx');
    });
  });

  describe('generarEstadisticas (cobertura)', () => {
    it('debe generar estadísticas con datos de préstamos', async () => {
      mocks.Prestamo.findAll.mockResolvedValue([
        { ejemplarId: 1, total: '3' }
      ]);
      mocks.Ejemplar.findByPk.mockResolvedValue({
        Material: { tipo: 'libro', categoriaId: 1 }
      });
      mocks.Categoria.findAll.mockResolvedValue([
        { idCategoria: 1, nombre: 'Literatura' }
      ]);
      const resultado = await reporteService.generarEstadisticas(
        { fechaDesde: '2026-01-01', fechaHasta: '2026-12-31' }, 'pdf'
      );
      expect(resultado.buffer).toBeInstanceOf(Buffer);
    });

    it('debe generar estadísticas con categorías', async () => {
      mocks.Prestamo.findAll.mockResolvedValue([
        { ejemplarId: 1, total: '2' },
        { ejemplarId: 2, total: '1' }
      ]);
      mocks.Ejemplar.findByPk
        .mockResolvedValueOnce({
          Material: { tipo: 'libro', categoriaId: 1 }
        })
        .mockResolvedValueOnce({
          Material: { tipo: 'revista', categoriaId: 2 }
        });
      mocks.Categoria.findAll.mockResolvedValue([
        { idCategoria: 1, nombre: 'Literatura' },
        { idCategoria: 2, nombre: 'Ciencia' }
      ]);
      const resultado = await reporteService.generarEstadisticas(
        { fechaDesde: '2026-01-01', fechaHasta: '2026-12-31' }, 'pdf'
      );
      expect(resultado.buffer).toBeInstanceOf(Buffer);
    });

    it('debe generar Excel con estadísticas', async () => {
      mocks.Prestamo.findAll.mockResolvedValue([
        { ejemplarId: 1, total: '2' }
      ]);
      mocks.Ejemplar.findByPk.mockResolvedValue({
        Material: { tipo: 'revista', categoriaId: 2 }
      });
      mocks.Categoria.findAll.mockResolvedValue([
        { idCategoria: 2, nombre: 'Ciencia' }
      ]);
      const resultado = await reporteService.generarEstadisticas(
        { fechaDesde: '2026-01-01', fechaHasta: '2026-12-31' }, 'excel'
      );
      expect(resultado.nombre).toContain('estadisticas');
      expect(resultado.extension).toBe('xlsx');
    });
  });
});
