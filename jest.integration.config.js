module.exports = {
  setupFiles: ['./tests/e2e/setupEnv.js'],
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.int.test.js'],
  testTimeout: 30000,
  verbose: true,
  maxWorkers: 1,
};
