/**
 * @requirement RF-11 (Crear cuentas de personal), RF-12 (Desactivar cuentas de personal)
 * @use_case CU-11, CU-12
 * @description Pruebas unitarias del controlador de usuarios del sistema.
 */
const UsuarioController = require('../controllers/usuarioController');

describe('UsuarioController', () => {
  let controller;
  let mockService;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockService = {
      listar: jest.fn().mockResolvedValue([]),
      crear: jest.fn().mockResolvedValue({}),
      desactivar: jest.fn().mockResolvedValue(undefined)
    };

    controller = new UsuarioController(mockService);

    req = {
      query: {}, params: {}, body: {},
      session: { usuarioId: 1 }
    };

    res = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };

    next = jest.fn();
  });

  describe('listar', () => {
    it('debe renderizar admin/usuarios con la lista', async () => {
      mockService.listar.mockResolvedValue([{ idUsuario: 1, nombreUsuario: 'admin' }]);

      await controller.listar(req, res, next);

      expect(mockService.listar).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith('admin/usuarios', {
        page: 'usuarios', usuarios: expect.any(Array),
        error: null, success: null
      });
    });

    it('debe pasar next si el servicio falla', async () => {
      mockService.listar.mockRejectedValue(new Error('DB error'));

      await controller.listar(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('mostrarFormulario', () => {
    it('debe renderizar admin/usuario_form', async () => {
      await controller.mostrarFormulario(req, res, next);

      expect(res.render).toHaveBeenCalledWith('admin/usuario_form', {
        page: 'usuarios', error: null
      });
    });

    it('debe pasar next si ocurre error', async () => {
      res.render.mockImplementation(() => { throw new Error('Render error'); });

      await controller.mostrarFormulario(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('guardar', () => {
    it('debe crear usuario y redirigir', async () => {
      req.body = { nombreUsuario: 'nuevo', contrasena: '12345678' };

      await controller.guardar(req, res, next);

      expect(mockService.crear).toHaveBeenCalledWith({
        nombreUsuario: 'nuevo', contrasena: '12345678',
        usuarioSessionId: 1
      });
      expect(res.redirect).toHaveBeenCalledWith('/admin/usuarios?success=creado');
    });

    it('debe redirigir con error si falla', async () => {
      mockService.crear.mockRejectedValue(new Error('Nombre de usuario no disponible'));
      req.body = { nombreUsuario: 'existente' };

      await controller.guardar(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=Nombre%20de%20usuario%20no%20disponible'));
    });
  });

  describe('desactivar', () => {
    it('debe desactivar y redirigir', async () => {
      req.params = { id: '2' };

      await controller.desactivar(req, res, next);

      expect(mockService.desactivar).toHaveBeenCalledWith('2', 1);
      expect(res.redirect).toHaveBeenCalledWith('/admin/usuarios?success=desactivado');
    });

    it('debe redirigir con error si falla', async () => {
      mockService.desactivar.mockRejectedValue(new Error('No puedes desactivar tu propia cuenta'));
      req.params = { id: '1' };

      await controller.desactivar(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=No%20puedes%20desactivar%20tu%20propia%20cuenta'));
    });
  });
});
