/**
 * @requirement RF-11 (Crear cuentas de personal), RF-12 (Desactivar cuentas de personal)
 * @use_case CU-11, CU-12
 * @description Pruebas unitarias del controlador de usuarios con mocks.
 */
const UsuarioController = require('../controllers/usuarioController');

describe('UsuarioController', () => {
  let controller;
  let mockUsuarioService;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockUsuarioService = {
      listar: jest.fn(),
      crear: jest.fn(),
      desactivar: jest.fn()
    };
    controller = new UsuarioController(mockUsuarioService);

    req = { body: {}, params: {}, query: {}, session: { usuarioId: 1 } };
    res = { render: jest.fn(), redirect: jest.fn() };
    next = jest.fn();
  });

  describe('listar', () => {
    it('debe renderizar lista de usuarios', async () => {
      mockUsuarioService.listar.mockResolvedValue([{ idUsuario: 1, nombre: 'Admin' }]);

      await controller.listar(req, res, next);

      expect(res.render).toHaveBeenCalledWith('admin/usuarios', {
        page: 'usuarios', usuarios: [{ idUsuario: 1, nombre: 'Admin' }],
        error: null, success: null
      });
    });

    it('debe pasar error a next si falla', async () => {
      mockUsuarioService.listar.mockRejectedValue(new Error('Error'));

      await controller.listar(req, res, next);

      expect(next).toHaveBeenCalledWith(new Error('Error'));
    });
  });

  describe('mostrarFormulario', () => {
    it('debe renderizar formulario', async () => {
      await controller.mostrarFormulario(req, res, next);

      expect(res.render).toHaveBeenCalledWith('admin/usuario_form', {
        page: 'usuarios', error: null
      });
    });

    it('debe pasar error a next si falla', async () => {
      res.render.mockImplementation(() => { throw new Error('Error render'); });

      await controller.mostrarFormulario(req, res, next);

      expect(next).toHaveBeenCalledWith(new Error('Error render'));
    });
  });

  describe('guardar', () => {
    it('debe crear usuario y redirigir', async () => {
      req.body = { nombreUsuario: 'jperez', contrasena: '12345678', nombre: 'Juan', apellido: 'Perez', cedula: '123', rol: 'Bibliotecario' };
      mockUsuarioService.crear.mockResolvedValue(undefined);

      await controller.guardar(req, res, next);

      expect(mockUsuarioService.crear).toHaveBeenCalledWith({
        ...req.body, usuarioSessionId: 1
      });
      expect(res.redirect).toHaveBeenCalledWith('/admin/usuarios?success=creado');
    });

    it('debe redirigir con error si crear falla', async () => {
      req.body = {};
      mockUsuarioService.crear.mockRejectedValue(new Error('Campos requeridos'));

      await controller.guardar(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('Campos%20requeridos'));
    });
  });

  describe('desactivar', () => {
    it('debe desactivar y redirigir', async () => {
      req.params.id = '2';
      mockUsuarioService.desactivar.mockResolvedValue(undefined);

      await controller.desactivar(req, res, next);

      expect(mockUsuarioService.desactivar).toHaveBeenCalledWith('2', 1);
      expect(res.redirect).toHaveBeenCalledWith('/admin/usuarios?success=desactivado');
    });

    it('debe redirigir con error si desactivar falla', async () => {
      req.params.id = '1';
      mockUsuarioService.desactivar.mockRejectedValue(new Error('No puedes desactivar tu propia cuenta'));

      await controller.desactivar(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('tu%20propia%20cuenta'));
    });
  });
});
