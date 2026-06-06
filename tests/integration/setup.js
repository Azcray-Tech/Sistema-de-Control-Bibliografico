const { iniciar } = require('../../app');
const { limpiarDatosTransaccionales } = require('../e2e/helpers/clean');

beforeAll(async () => {
  await iniciar();
});

afterAll(async () => {
  await limpiarDatosTransaccionales();
});
