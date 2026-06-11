const request = require('supertest');

async function loginComo(app, username, password) {
  const agent = request.agent(app);
  const res = await agent
    .post('/admin/login')
    .send({ username, password });
  if (res.status !== 302) {
    throw new Error(`Login failed for ${username}: ${res.status}`);
  }
  return agent;
}

async function loginComoAdmin(app) {
  return loginComo(app, 'admin', 'admin123');
}

module.exports = { loginComo, loginComoAdmin };
