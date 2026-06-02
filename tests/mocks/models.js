/**
 * @requirement RF-01
 * @description Fábrica de mocks de modelos Sequelize para pruebas unitarias.
 * Todos los métodos retornan promesas para simular el comportamiento real de Sequelize.
 */

const crearMockModel = (opciones = {}) => {
  const defaults = {
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findByPk: jest.fn().mockResolvedValue(null),
    findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue([1]),
    count: jest.fn().mockResolvedValue(0),
    bulkCreate: jest.fn().mockResolvedValue([]),
    upsert: jest.fn().mockResolvedValue([{}, true]),
    findOrCreate: jest.fn().mockResolvedValue([{}, false]),
    destroy: jest.fn().mockResolvedValue(1),
    sequelize: {
      constructor: {
        Op: {
          and: Symbol('and'), or: Symbol('or'), gt: Symbol('gt'), gte: Symbol('gte'),
          lt: Symbol('lt'), lte: Symbol('lte'), ne: Symbol('ne'), eq: Symbol('eq'),
          like: Symbol('like'), notLike: Symbol('notLike'), between: Symbol('between'),
          in: Symbol('in'), notIn: Symbol('notIn')
        }
      },
      fn: jest.fn().mockReturnValue('fn()'),
      col: jest.fn().mockReturnValue('col'),
      literal: jest.fn().mockReturnValue('literal'),
      transaction: jest.fn().mockResolvedValue({ commit: jest.fn(), rollback: jest.fn() }),
    }
  };

  const mock = { ...defaults, ...opciones };
  // Mock de belongsToMany para relación N:M
  mock.belongsToMany = jest.fn();
  mock.hasMany = jest.fn();
  mock.belongsTo = jest.fn();
  mock.hasOne = jest.fn();

  return mock;
};

const crearMocksModelos = () => ({
  Material: crearMockModel(),
  Libro: crearMockModel(),
  Revista: crearMockModel(),
  Tesis: crearMockModel(),
  Anuario: crearMockModel(),
  Articulo: crearMockModel(),
  Autor: crearMockModel(),
  Categoria: crearMockModel(),
  Ejemplar: crearMockModel(),
  Prestamo: crearMockModel(),
  Solicitante: crearMockModel(),
  UsuarioSistema: crearMockModel(),
  Sancion: crearMockModel(),
  LogActividad: crearMockModel(),
  Parametro: crearMockModel(),
  sequelize: {
    constructor: { Op: {} },
    fn: jest.fn(),
    col: jest.fn(),
    literal: jest.fn(),
    query: jest.fn(),
    transaction: jest.fn().mockResolvedValue({ commit: jest.fn(), rollback: jest.fn() })
  }
});

const mockAuditoria = jest.fn().mockResolvedValue(undefined);

module.exports = { crearMockModel, crearMocksModelos, mockAuditoria };
