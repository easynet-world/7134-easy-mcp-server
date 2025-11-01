const request = require('supertest');

describe('MCP Bridge endpoints', () => {
  let serverModule;
  let app;

  beforeAll(() => {
    jest.resetModules();
    process.env.EASY_MCP_SERVER_MCP_ENABLED = 'false'; // avoid starting internal MCP ws server
    serverModule = require('../src/orchestrator');
    app = serverModule.app;
  });

  test('GET /bridge/list-tools responds (bridge may fail if binary missing, but route exists)', async () => {
    const res = await request(app).get('/bridge/list-tools');
    expect([200,500]).toContain(res.statusCode);
  });

  test('POST /bridge/call-tool validates payload', async () => {
    const res = await request(app).post('/bridge/call-tool').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/toolName required/);
  });
});


