const request = require('supertest');
const { DynamicAPIServer } = require('easy-mcp-server');

describe('Easy MCP Server', () => {
  let server;
  
  beforeAll(async () => {
    server = new DynamicAPIServer({
      port: 0, // Use random port for testing
      cors: { origin: '*' }
    });
    await server.start();
  });
  
  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });
  
  test('GET /health should return 200', async () => {
    const response = await request(server.app).get('/health');
    expect(response.status).toBe(200);
    // Status can be 'OK', 'healthy', 'partial', or 'unhealthy' depending on server configuration
    expect(['OK', 'healthy', 'partial', 'unhealthy']).toContain(response.body.status);
  });
  
  test('GET /api-info should return API information', async () => {
    const response = await request(server.app).get('/api-info');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Dynamic API Framework');
  });
});

