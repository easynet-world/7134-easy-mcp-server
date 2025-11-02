import request from 'supertest';
import { DynamicAPIServer } from 'easy-mcp-server';

describe('Easy MCP Server', () => {
  let server: DynamicAPIServer;

  beforeAll(async () => {
    server = new DynamicAPIServer({ port: 0, cors: { origin: '*' } });
    await server.start();
  });

  afterAll(async () => {
    if (server) await server.stop();
  });

  test('GET /health should return 200', async () => {
    const response = await request(server.app).get('/health');
    expect(response.status).toBe(200);
  });

  test('GET /example should return example data', async () => {
    const response = await request(server.app).get('/example');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('message');
    expect(response.body.data).toHaveProperty('timestamp');
  });

  test('POST /example should create data', async () => {
    const response = await request(server.app)
      .post('/example')
      .send({ message: 'Test message' });
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('id');
  });

  test('POST /example without message should return 400', async () => {
    const response = await request(server.app)
      .post('/example')
      .send({});
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});
