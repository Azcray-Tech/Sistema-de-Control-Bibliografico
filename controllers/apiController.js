/**
 * @requirement RF-14 (Registrar o cargar solicitante), RF-06 (Añadir ejemplares)
 * @use_case CU-14 (Registrar solicitante), CU-06 (Añadir ejemplares)
 * @description Controlador de endpoints JSON/AJAX para búsqueda de solicitantes y ejemplares.
 */
class ApiController {
  constructor(solicitanteService, materialService) {
    this.solicitanteService = solicitanteService;
    this.materialService = materialService;
  }

  /**
   * @requirement RF-14
   * @use_case CU-14
   */
  buscarSolicitante = async (req, res, _next) => {
    try {
      const resultado = await this.solicitanteService.buscarResponse(req.query.cedula);
      res.json(resultado);
    } catch (err) {
      console.error('Error al buscar solicitante:', err);
      res.status(500).json({ error: 'Error al buscar solicitante' });
    }
  };

  /**
   * @requirement RF-14
   * @use_case CU-14
   */
  crearSolicitante = async (req, res, _next) => {
    try {
      const { cedula, nombre, apellido, correoElectronico, telefono } = req.body;
      const solicitante = await this.solicitanteService.crear({ cedula, nombre, apellido, correoElectronico, telefono });
      res.json({ success: true, solicitante });
    } catch (err) {
      console.error('Error al crear solicitante:', err);
      res.status(500).json({ error: err.message || 'Error al crear solicitante' });
    }
  };

  /**
   * @requirement RF-06
   * @use_case CU-06
   */
  buscarEjemplar = async (req, res, _next) => {
    try {
      const { identificador, materialId } = req.query;
      const ejemplares = await this.materialService.buscarEjemplares({ identificador, materialId });
      res.json({ ejemplares });
    } catch (err) {
      console.error('Error al buscar ejemplar:', err);
      res.status(500).json({ error: 'Error al buscar ejemplar' });
    }
  };

  /**
   * @requirement RF-14
   * @use_case CU-14
   */
  buscarSolicitantePrestamo = async (req, res, _next) => {
    try {
      const data = await this.solicitanteService.buscarConPrestamos(req.query.cedula);
      if (!data) {return res.json({ encontrado: false });}
      res.json({ encontrado: true, solicitante: data });
    } catch (err) {
      console.error('Error al buscar solicitante para préstamo:', err);
      res.status(500).json({ encontrado: false, error: 'Error al buscar solicitante' });
    }
  };

  /**
   * @requirement RF-06
   * @use_case CU-06
   */
  buscarEjemplaresDisponibles = async (req, res, _next) => {
    try {
      const resultado = await this.materialService.buscarDisponibles(req.query.titulo);
      res.json(resultado);
    } catch (err) {
      console.error('Error al buscar ejemplares disponibles:', err);
      res.status(500).json([]);
    }
  };
}

module.exports = ApiController;
