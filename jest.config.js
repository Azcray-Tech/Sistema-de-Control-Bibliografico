module.exports = {
  setupFiles: ['./tests/setup.js'],
  testEnvironment: 'node',
  verbose: true,
  transform: {},
  testPathIgnorePatterns: ['/node_modules/', '/tests/e2e/'],
};
