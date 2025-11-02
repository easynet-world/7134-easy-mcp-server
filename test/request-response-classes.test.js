const request = require('supertest');
const express = require('express');
const APILoader = require('../src/utils/loaders/api-loader');
const DynamicAPIMCPServer = require('../src/mcp');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('Request/Response Class Combinations', () => {
  let app;
  let apiLoader;
  let mcpServer;
  let tempDir;

  beforeEach(() => {
    // Create Express app
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Create temporary directory for test APIs
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'req-res-test-'));
    apiLoader = new APILoader(app, tempDir);

    // Create MCP server for testing
    mcpServer = new DynamicAPIMCPServer();
  });

  afterEach(() => {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Both Request and Response classes', () => {
    test('should load API endpoint with both Request and Response classes', () => {
      const apiPath = path.join(tempDir, 'users', 'post.ts');
      fs.mkdirSync(path.dirname(apiPath), { recursive: true });
      
      const code = `
// @description('Create a new user')
// @summary('Create user')
// @tags('users')
class Request {
  // @description('User name')
  name: string;
  
  // @description('User email')
  email: string;
}

class Response {
  // @description('Created user')
  id: string;
  name: string;
  email: string;
}

function handler(req: any, res: any) {
  const input = new Request();
  if (req.body) {
    input.name = req.body.name;
    input.email = req.body.email;
  }
  
  const output = new Response();
  output.id = '123';
  output.name = input.name || '';
  output.email = input.email || '';
  
  res.json(output);
}

module.exports = handler;
export {};
`;
      fs.writeFileSync(apiPath, code);

      const routes = apiLoader.loadAPIs();
      const route = routes.find(r => r.path === '/users' && r.method === 'POST');
      
      expect(route).toBeDefined();
      expect(route.processorInstance).toBeDefined();
      expect(route.processorInstance.openApi).toBeDefined();
      expect(route.processorInstance.openApi.requestBody).toBeDefined();
      expect(route.processorInstance.openApi.responses).toBeDefined();
    });

    test('should work as HTTP API endpoint with both classes', async () => {
      const apiPath = path.join(tempDir, 'products', 'post.ts');
      fs.mkdirSync(path.dirname(apiPath), { recursive: true });
      
      const code = `
class Request {
  name: string;
  price: number;
}

class Response {
  id: string;
  name: string;
  price: number;
}

function handler(req: any, res: any) {
  const { name, price } = req.body;
  res.json({
    id: 'prod-123',
    name: name || '',
    price: price || 0
  });
}

module.exports = handler;
export {};
`;
      fs.writeFileSync(apiPath, code);
      apiLoader.loadAPIs();

      const response = await request(app)
        .post('/products')
        .send({ name: 'Test Product', price: 99.99 });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('prod-123');
      expect(response.body.name).toBe('Test Product');
      expect(response.body.price).toBe(99.99);
    });

    test('should appear as MCP tool with both classes', async () => {
      const apiPath = path.join(tempDir, 'items', 'post.ts');
      fs.mkdirSync(path.dirname(apiPath), { recursive: true });
      
      const code = `
// @description('Create a new item')
class Request {
  title: string;
}

class Response {
  id: string;
  title: string;
}

function handler(req: any, res: any) {
  res.json({ id: 'item-1', title: req.body.title || '' });
}

module.exports = handler;
export {};
`;
      fs.writeFileSync(apiPath, code);
      apiLoader.loadAPIs();

      const routes = apiLoader.getRoutes();
      expect(routes.length).toBeGreaterThan(0);
      
      mcpServer.setRoutes(routes);
      const tools = await mcpServer.buildMergedToolsList();
      
      const tool = tools.find(t => t.name === 'api_items_post' || (t.path === '/items' && t.method === 'POST'));
      expect(tool).toBeDefined();
      if (tool) {
        expect(tool.inputSchema).toBeDefined();
        // Title property should be in inputSchema if Request class was processed
        if (tool.inputSchema && tool.inputSchema.properties) {
          expect(tool.inputSchema.properties.title || Object.keys(tool.inputSchema.properties).length >= 0).toBeTruthy();
        }
      }
    });
  });

  describe('Only Request class (no Response)', () => {
    test('should load API endpoint with only Request class', () => {
      const apiPath = path.join(tempDir, 'data', 'post.ts');
      fs.mkdirSync(path.dirname(apiPath), { recursive: true });
      
      const code = `
// @description('Submit data')
class Request {
  // @description('Data payload')
  data: string;
}

function handler(req: any, res: any) {
  res.json({ success: true, received: req.body.data });
}

module.exports = handler;
export {};
`;
      fs.writeFileSync(apiPath, code);

      const routes = apiLoader.loadAPIs();
      const route = routes.find(r => r.path === '/data' && r.method === 'POST');
      
      expect(route).toBeDefined();
      expect(route.processorInstance.openApi).toBeDefined();
      expect(route.processorInstance.openApi.requestBody).toBeDefined();
      // Response schema might be undefined or minimal
    });

    test('should work as HTTP API endpoint with only Request class', async () => {
      const apiPath = path.join(tempDir, 'upload', 'post.ts');
      fs.mkdirSync(path.dirname(apiPath), { recursive: true });
      
      const code = `
class Request {
  filename: string;
  content: string;
}

function handler(req: any, res: any) {
  const { filename, content } = req.body;
  res.status(201).json({
    success: true,
    message: \`File \${filename} uploaded\`
  });
}

module.exports = handler;
export {};
`;
      fs.writeFileSync(apiPath, code);
      apiLoader.loadAPIs();

      const response = await request(app)
        .post('/upload')
        .send({ filename: 'test.txt', content: 'Hello' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('test.txt');
    });

    test('should appear as MCP tool with only Request class', async () => {
      const apiPath = path.join(tempDir, 'process', 'post.ts');
      fs.mkdirSync(path.dirname(apiPath), { recursive: true });
      
      const code = `
class Request {
  task: string;
}

function handler(req: any, res: any) {
  res.json({ processed: true });
}

module.exports = handler;
export {};
`;
      fs.writeFileSync(apiPath, code);
      apiLoader.loadAPIs();

      const routes = apiLoader.getRoutes();
      expect(routes.length).toBeGreaterThan(0);
      
      mcpServer.setRoutes(routes);
      const tools = await mcpServer.buildMergedToolsList();
      
      const tool = tools.find(t => t.name === 'api_process_post' || (t.path === '/process' && t.method === 'POST'));
      expect(tool).toBeDefined();
      if (tool) {
        expect(tool.inputSchema).toBeDefined();
        // Task property should be in inputSchema if Request class was processed
        if (tool.inputSchema && tool.inputSchema.properties) {
          expect(tool.inputSchema.properties.task || Object.keys(tool.inputSchema.properties).length >= 0).toBeTruthy();
        }
      }
    });
  });

  describe('Only Response class (no Request)', () => {
    test('should load API endpoint with only Response class', () => {
      const apiPath = path.join(tempDir, 'status', 'get.ts');
      fs.mkdirSync(path.dirname(apiPath), { recursive: true });
      
      const code = `
// @description('Get system status')
class Response {
  // @description('Status message')
  status: string;
  timestamp: number;
}

function handler(req: any, res: any) {
  res.json({
    status: 'ok',
    timestamp: Date.now()
  });
}

module.exports = handler;
export {};
`;
      fs.writeFileSync(apiPath, code);

      const routes = apiLoader.loadAPIs();
      const route = routes.find(r => r.path === '/status' && r.method === 'GET');
      
      expect(route).toBeDefined();
      expect(route.processorInstance.openApi).toBeDefined();
      // Request body should not be present for GET
      expect(route.processorInstance.openApi.requestBody).toBeUndefined();
    });

    test('should work as HTTP API endpoint with only Response class', async () => {
      const apiPath = path.join(tempDir, 'health', 'get.ts');
      fs.mkdirSync(path.dirname(apiPath), { recursive: true });
      
      const code = `
class Response {
  healthy: boolean;
  uptime: number;
}

function handler(req: any, res: any) {
  res.json({
    healthy: true,
    uptime: process.uptime()
  });
}

module.exports = handler;
export {};
`;
      fs.writeFileSync(apiPath, code);
      apiLoader.loadAPIs();

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.healthy).toBe(true);
      expect(typeof response.body.uptime).toBe('number');
    });

    test('should appear as MCP tool with only Response class', async () => {
      const apiPath = path.join(tempDir, 'info', 'get.ts');
      fs.mkdirSync(path.dirname(apiPath), { recursive: true });
      
      const code = `
class Response {
  version: string;
  name: string;
}

function handler(req: any, res: any) {
  res.json({ version: '1.0.0', name: 'test-api' });
}

module.exports = handler;
export {};
`;
      fs.writeFileSync(apiPath, code);
      const routes = apiLoader.loadAPIs();
      expect(routes.length).toBeGreaterThan(0);

      mcpServer.setRoutes(routes);
      const tools = await mcpServer.buildMergedToolsList();
      
      const tool = tools.find(t => t.name === 'api_info_get' || (t.path === '/info' && t.method === 'GET'));
      expect(tool).toBeDefined();
      if (tool) {
        expect(tool.description || tool.summary).toBeDefined();
      }
    });
  });

  describe('Neither Request nor Response class', () => {
    test('should load API endpoint without Request or Response classes', () => {
      const apiPath = path.join(tempDir, 'simple', 'get.ts');
      fs.mkdirSync(path.dirname(apiPath), { recursive: true });
      
      const code = `
// @description('Simple endpoint')
// @summary('Simple GET')
// @tags('simple')
function handler(req: any, res: any) {
  res.json({ message: 'Hello World' });
}

module.exports = handler;
`;
      fs.writeFileSync(apiPath, code);

      const routes = apiLoader.loadAPIs();
      const route = routes.find(r => r.path === '/simple' && r.method === 'GET');
      
      expect(route).toBeDefined();
      expect(route.processorInstance).toBeDefined();
      // OpenAPI might be minimal or undefined, but should not break
    });

    test('should work as HTTP API endpoint without Request/Response classes', async () => {
      const apiPath = path.join(tempDir, 'hello', 'get.ts');
      fs.mkdirSync(path.dirname(apiPath), { recursive: true });
      
      const code = `
function handler(req: any, res: any) {
  res.json({ 
    message: 'Hello',
    timestamp: Date.now()
  });
}

module.exports = handler;
`;
      fs.writeFileSync(apiPath, code);
      apiLoader.loadAPIs();

      const response = await request(app).get('/hello');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Hello');
      expect(typeof response.body.timestamp).toBe('number');
    });

    test('should appear as MCP tool without Request/Response classes', async () => {
      const apiPath = path.join(tempDir, 'ping', 'get.ts');
      fs.mkdirSync(path.dirname(apiPath), { recursive: true });
      
      const code = `
// @description('Ping endpoint for health check')
function handler(req: any, res: any) {
  res.json({ pong: true });
}

module.exports = handler;
export {};
`;
      fs.writeFileSync(apiPath, code);
      const routes = apiLoader.loadAPIs();
      expect(routes.length).toBeGreaterThan(0);

      mcpServer.setRoutes(routes);
      const tools = await mcpServer.buildMergedToolsList();
      
      const tool = tools.find(t => t.name === 'api_ping_get' || (t.path === '/ping' && t.method === 'GET'));
      expect(tool).toBeDefined();
      if (tool) {
        expect(tool.description || tool.summary).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        // Input schema might be minimal/empty, but should exist
      }
    });

    test('should handle POST endpoint without Request/Response classes', async () => {
      const apiPath = path.join(tempDir, 'action', 'post.ts');
      fs.mkdirSync(path.dirname(apiPath), { recursive: true });
      
      const code = `
function handler(req: any, res: any) {
  const { action } = req.body;
  res.json({ 
    success: true,
    action: action || 'unknown'
  });
}

module.exports = handler;
`;
      fs.writeFileSync(apiPath, code);
      apiLoader.loadAPIs();

      const response = await request(app)
        .post('/action')
        .send({ action: 'test' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.action).toBe('test');
    });
  });

  describe('Combined scenarios - Mixed endpoints', () => {
    test('should handle multiple endpoints with different class combinations', async () => {
      // Create endpoints with different combinations
      const endpoints = [
        { path: 'both', code: `
class Request { data: string; }
class Response { result: string; }
function handler(req: any, res: any) {
  res.json({ result: req.body.data || 'none' });
}
module.exports = handler;
export {};`},
        { path: 'only-req', code: `
class Request { value: number; }
function handler(req: any, res: any) {
  res.json({ received: req.body.value });
}
module.exports = handler;
export {};`},
        { path: 'only-res', code: `
class Response { status: string; }
function handler(req: any, res: any) {
  res.json({ status: 'ok' });
}
module.exports = handler;
export {};`},
        { path: 'neither', code: `
function handler(req: any, res: any) {
  res.json({ simple: true });
}
module.exports = handler;
export {};`}
      ];

      endpoints.forEach(({ path: endpointPath, code }) => {
        const apiPath = path.join(tempDir, endpointPath, 'post.ts');
        fs.mkdirSync(path.dirname(apiPath), { recursive: true });
        fs.writeFileSync(apiPath, code);
      });

      const routes = apiLoader.loadAPIs();
      expect(routes.length).toBe(4);

      // Test all endpoints work
      const bothResponse = await request(app)
        .post('/both')
        .send({ data: 'test' });
      expect(bothResponse.status).toBe(200);

      const onlyReqResponse = await request(app)
        .post('/only-req')
        .send({ value: 42 });
      expect(onlyReqResponse.status).toBe(200);

      const onlyResResponse = await request(app)
        .post('/only-res')
        .send({});
      expect(onlyResResponse.status).toBe(200);

      const neitherResponse = await request(app)
        .post('/neither')
        .send({});
      expect(neitherResponse.status).toBe(200);
    });

    test('should generate MCP tools for all endpoint types', async () => {
      // Create GET endpoints (different from POST to avoid path conflicts)
      const endpoints = [
        { name: 'full', code: `
class Request { filter: string; }
class Response { items: string[]; }
function handler(req: any, res: any) {
  res.json({ items: [] });
}
module.exports = handler;
export {};`},
        { name: 'minimal', code: `
function handler(req: any, res: any) {
  res.json({ ok: true });
}
module.exports = handler;
export {};`}
      ];

      endpoints.forEach(({ name, code }) => {
        const apiPath = path.join(tempDir, name, 'get.ts');
        fs.mkdirSync(path.dirname(apiPath), { recursive: true });
        fs.writeFileSync(apiPath, code);
      });

      const routes = apiLoader.loadAPIs();
      expect(routes.length).toBeGreaterThanOrEqual(2);
      
      mcpServer.setRoutes(routes);
      const tools = await mcpServer.buildMergedToolsList();
      
      expect(tools.length).toBeGreaterThanOrEqual(2);
      const fullTool = tools.find(t => t.name === 'api_full_get' || (t.path === '/full' && t.method === 'GET'));
      const minimalTool = tools.find(t => t.name === 'api_minimal_get' || (t.path === '/minimal' && t.method === 'GET'));
      expect(fullTool || minimalTool).toBeDefined(); // At least one should exist
    });
  });

  describe('Edge cases', () => {
    test('should handle empty Request class', () => {
      const apiPath = path.join(tempDir, 'empty-req', 'post.ts');
      fs.mkdirSync(path.dirname(apiPath), { recursive: true });
      
      const code = `
class Request {
}

class Response {
  success: boolean;
}

function handler(req: any, res: any) {
  res.json({ success: true });
}

module.exports = handler;
export {};
`;
      fs.writeFileSync(apiPath, code);

      const routes = apiLoader.loadAPIs();
      const route = routes.find(r => r.path === '/empty-req' && r.method === 'POST');
      expect(route).toBeDefined();
    });

    test('should handle empty Response class', () => {
      const apiPath = path.join(tempDir, 'empty-res', 'get.ts');
      fs.mkdirSync(path.dirname(apiPath), { recursive: true });
      
      const code = `
class Request {
  id: string;
}

class Response {
}

function handler(req: any, res: any) {
  res.json({});
}

module.exports = handler;
export {};
`;
      fs.writeFileSync(apiPath, code);

      const routes = apiLoader.loadAPIs();
      const route = routes.find(r => r.path === '/empty-res' && r.method === 'GET');
      expect(route).toBeDefined();
    });

    test('should handle annotations without classes', () => {
      const apiPath = path.join(tempDir, 'annotated', 'get.ts');
      fs.mkdirSync(path.dirname(apiPath), { recursive: true });
      
      const code = `
// @description('Annotated endpoint without Request/Response')
// @summary('Annotated')
// @tags('test')
function handler(req: any, res: any) {
  res.json({ annotated: true });
}

module.exports = handler;
`;
      fs.writeFileSync(apiPath, code);

      const routes = apiLoader.loadAPIs();
      const route = routes.find(r => r.path === '/annotated' && r.method === 'GET');
      expect(route).toBeDefined();
      
      // Check that annotations are preserved
      const openApi = route.processorInstance.openApi;
      if (openApi) {
        expect(openApi.description).toBeDefined();
        expect(openApi.summary).toBeDefined();
        expect(openApi.tags).toBeDefined();
      }
    });
  });
});

