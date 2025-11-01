const request = require('supertest');

// Ensure we load example APIs in tests
process.env.EASY_MCP_SERVER_API_PATH = require('path').join(__dirname, '..', 'example-project', 'api');
jest.resetModules();

// Use the express app initialized with example APIs
const { app } = require('../src/orchestrator');

describe('OpenAPI, MCP, and Swagger details', () => {
  describe('OpenAPI details', () => {
    let spec;
    beforeAll(async () => {
      const res = await request(app).get('/openapi.json').expect(200);
      spec = res.body;
    });

    test('POST /products request includes product fields', () => {
      const props = spec.paths['/products'].post.requestBody.content['application/json'].schema.properties;
      expect(props.product).toBeDefined();
      const p = props.product.properties;
      expect(p.id).toBeDefined();
      expect(p.name).toBeDefined();
      expect(p.price).toBeDefined();
      expect(p.tags).toBeDefined();
    });

    test('POST /products response includes created product', () => {
      const props = spec.paths['/products'].post.responses['200'].content['application/json'].schema.properties;
      expect(props.product).toBeDefined();
      const p = props.product.properties;
      expect(p.id).toBeDefined();
      expect(p.name).toBeDefined();
      expect(p.price).toBeDefined();
      expect(p.tags).toBeDefined();
    });

    test('PUT /products uses shared Product in request and response', () => {
      const reqProps = spec.paths['/products'].put.requestBody.content['application/json'].schema.properties;
      const resProps = spec.paths['/products'].put.responses['200'].content['application/json'].schema.properties;
      expect(reqProps.product).toBeDefined();
      expect(resProps.product).toBeDefined();
    });

    test('GET /products returns Product[] with details', () => {
      const items = spec.paths['/products'].get.responses['200'].content['application/json'].schema.properties.products.items;
      expect(items.properties.id).toBeDefined();
      expect(items.properties.name).toBeDefined();
      expect(items.properties.price).toBeDefined();
      expect(items.properties.tags).toBeDefined();
    });

    test('GET /products/:id returns Product object', () => {
      // OpenAPI generator converts Express paths (:id) to OpenAPI format ({id})
      const product = spec.paths['/products/{id}'].get.responses['200'].content['application/json'].schema.properties.product;
      expect(product).toBeDefined();
      expect(product.properties.id).toBeDefined();
      expect(product.properties.name).toBeDefined();
    });

    test('GET /users has optional query.active and returns User[]', () => {
      const params = spec.paths['/users'].get.parameters;
      const active = params.find(p => p.name === 'active' && p.in === 'query');
      expect(active).toBeDefined();
      expect(active.required).toBe(false);

      const userItem = spec.paths['/users'].get.responses['200'].content['application/json'].schema.properties.users.items;
      expect(userItem.properties.id).toBeDefined();
      expect(userItem.properties.name).toBeDefined();
      expect(userItem.properties.active).toBeDefined();
      expect(userItem.properties.email).toBeDefined();
    });
  });

  describe('MCP tools details via HTTP', () => {
    test('/mcp/tools exposes detailed schemas for POST /products', async () => {
      const res = await request(app).get('/mcp/tools').expect(200);
      const tool = res.body.tools.find(t => t.path === '/products' && t.method === 'POST');
      expect(tool).toBeDefined();
      const body = tool.inputSchema.properties.body;
      expect(body.properties.product).toBeDefined();
      const p = body.properties.product.properties;
      expect(p.name).toBeDefined();
      expect(p.price).toBeDefined();
      expect(tool.responseSchema.properties.product).toBeDefined();
    });

    test('/mcp/tools shows query.active for GET /users', async () => {
      const res = await request(app).get('/mcp/tools').expect(200);
      const tool = res.body.tools.find(t => t.path === '/users' && t.method === 'GET');
      expect(tool).toBeDefined();
      const query = tool.inputSchema.properties.query;
      expect(query.properties.active).toBeDefined();
    });
  });

  describe('Swagger UI', () => {
    test('/docs serves Swagger UI referencing /openapi.json', async () => {
      const res = await request(app).get('/docs').expect(200);
      expect(res.text).toContain('SwaggerUIBundle');
      expect(res.text).toContain("url: '/openapi.json'");
    });
  });
});


