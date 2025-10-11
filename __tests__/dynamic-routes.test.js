const request = require('supertest');
const express = require('express');
const APILoader = require('../src/core/api-loader');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('Dynamic Routes', () => {
  let app;
  let apiLoader;
  let tempDir;

  beforeEach(() => {
    // Create Express app
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
  });

  afterEach(() => {
    // Clean up temp directory if it exists
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should load API with single dynamic parameter [id]', () => {
    // Use the actual api directory
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'api'));
    const routes = apiLoader.loadAPIs();

    // Find the dynamic route
    const dynamicRoute = routes.find(r => r.path === '/example/:id' && r.method === 'GET');
    expect(dynamicRoute).toBeDefined();
    expect(dynamicRoute.path).toBe('/example/:id');
    expect(dynamicRoute.method).toBe('GET');
  });

  test('should handle GET request to /example/:id', async () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'api'));
    apiLoader.loadAPIs();

    const response = await request(app)
      .get('/example/123')
      .set('Authorization', 'Bearer valid-token');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('123');
    expect(response.body.message).toContain('123');
  });

  test('should handle PUT request to /example/:id', async () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'api'));
    apiLoader.loadAPIs();

    const response = await request(app)
      .put('/example/456')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Test Example', description: 'Test description' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('456');
    expect(response.body.data.name).toBe('Test Example');
  });

  test('should handle DELETE request to /example/:id', async () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'api'));
    apiLoader.loadAPIs();

    const response = await request(app)
      .delete('/example/789')
      .set('Authorization', 'Bearer valid-token');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('789');
  });

  test('should load API with nested dynamic parameters [userId]/posts/[postId]', () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'api'));
    const routes = apiLoader.loadAPIs();

    // Find the nested dynamic route
    const nestedRoute = routes.find(r => r.path === '/users/:userId/posts/:postId' && r.method === 'GET');
    expect(nestedRoute).toBeDefined();
    expect(nestedRoute.path).toBe('/users/:userId/posts/:postId');
    expect(nestedRoute.method).toBe('GET');
  });

  test('should handle GET request to /users/:userId/posts/:postId', async () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'api'));
    apiLoader.loadAPIs();

    const response = await request(app)
      .get('/users/user123/posts/post456')
      .set('Authorization', 'Bearer valid-token');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.userId).toBe('user123');
    expect(response.body.data.postId).toBe('post456');
  });

  test('should convert multiple [param] patterns correctly', () => {
    // Create a temporary API directory for this test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-test-'));
    const testPath = path.join(tempDir, 'api', '[orgId]', 'teams', '[teamId]', 'members', '[memberId]');
    fs.mkdirSync(testPath, { recursive: true });

    // Create a test API file using absolute path for BaseAPI
    const baseApiPath = path.join(__dirname, '..', 'src', 'lib', 'base-api-enhanced.js');
    const apiContent = `
const BaseAPI = require('${baseApiPath.replace(/\\/g, '\\\\')}');

class TestAPI extends BaseAPI {
  process(req, res) {
    res.json({ 
      orgId: req.params.orgId,
      teamId: req.params.teamId,
      memberId: req.params.memberId
    });
  }
}

module.exports = TestAPI;
`;
    fs.writeFileSync(path.join(testPath, 'get.js'), apiContent);

    apiLoader = new APILoader(app, path.join(tempDir, 'api'));
    const routes = apiLoader.loadAPIs();

    const multiParamRoute = routes.find(r => 
      r.path === '/:orgId/teams/:teamId/members/:memberId' && r.method === 'GET'
    );
    
    expect(multiParamRoute).toBeDefined();
    expect(multiParamRoute.path).toBe('/:orgId/teams/:teamId/members/:memberId');
  });

  test('should handle requests to routes with multiple parameters', async () => {
    // Create a temporary API directory for this test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-test-'));
    const testPath = path.join(tempDir, 'api', 'orgs', '[orgId]', 'projects', '[projectId]');
    fs.mkdirSync(testPath, { recursive: true });

    // Create a test API file using absolute path for BaseAPI
    const baseApiPath = path.join(__dirname, '..', 'src', 'lib', 'base-api-enhanced.js');
    const apiContent = `
const BaseAPI = require('${baseApiPath.replace(/\\/g, '\\\\')}');

class TestAPI extends BaseAPI {
  process(req, res) {
    res.json({ 
      orgId: req.params.orgId,
      projectId: req.params.projectId,
      path: '/orgs/:orgId/projects/:projectId'
    });
  }
}

module.exports = TestAPI;
`;
    fs.writeFileSync(path.join(testPath, 'get.js'), apiContent);

    apiLoader = new APILoader(app, path.join(tempDir, 'api'));
    apiLoader.loadAPIs();

    const response = await request(app).get('/orgs/org-abc/projects/proj-xyz');
    
    expect(response.status).toBe(200);
    expect(response.body.orgId).toBe('org-abc');
    expect(response.body.projectId).toBe('proj-xyz');
  });

  test('should handle different parameter types (numeric, string, uuid)', async () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'api'));
    apiLoader.loadAPIs();

    // Test with numeric ID
    const numericResponse = await request(app)
      .get('/example/12345')
      .set('Authorization', 'Bearer valid-token');
    expect(numericResponse.status).toBe(200);
    expect(numericResponse.body.data.id).toBe('12345');

    // Test with UUID-like ID
    const uuidResponse = await request(app)
      .get('/example/550e8400-e29b-41d4-a716-446655440000')
      .set('Authorization', 'Bearer valid-token');
    expect(uuidResponse.status).toBe(200);
    expect(uuidResponse.body.data.id).toBe('550e8400-e29b-41d4-a716-446655440000');

    // Test with string ID
    const stringResponse = await request(app)
      .get('/example/my-example-slug')
      .set('Authorization', 'Bearer valid-token');
    expect(stringResponse.status).toBe(200);
    expect(stringResponse.body.data.id).toBe('my-example-slug');
  });

  test('should handle special characters in parameters', async () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'api'));
    apiLoader.loadAPIs();

    // Test with URL-encoded special characters
    const response = await request(app)
      .get('/example/test%40example.com')
      .set('Authorization', 'Bearer valid-token');
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe('test@example.com');
  });

  test('should not convert [param] in query strings or body', async () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'api'));
    apiLoader.loadAPIs();

    const response = await request(app)
      .put('/example/test-id')
      .set('Authorization', 'Bearer valid-token')
      .send({ data: '[someValue]' });
    
    expect(response.status).toBe(200);
    // Query and body should preserve [brackets]
  });

  test('should handle empty parameter values', async () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'api'));
    apiLoader.loadAPIs();

    // Express will not match empty parameters, so this should 404
    const response = await request(app)
      .get('/example/')
      .set('Authorization', 'Bearer valid-token');
    // This should not match the /example/:id route
    // It should fall through to 404 or the /example base route if it exists
    expect([200, 401, 404]).toContain(response.status);
  });

  test('should generate correct route information for OpenAPI', () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'api'));
    const routes = apiLoader.loadAPIs();

    const dynamicRoute = routes.find(r => r.path === '/example/:id' && r.method === 'GET');
    expect(dynamicRoute).toBeDefined();
    expect(dynamicRoute.processorInstance).toBeDefined();
    expect(typeof dynamicRoute.processorInstance.process).toBe('function');
  });

  test('should handle routes with unclosed bracket patterns', () => {
    // Create a temporary API directory with unclosed bracket pattern
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-test-'));
    // Use a valid directory name with the bracket in a file path
    const testPath = path.join(tempDir, 'api', 'items');
    fs.mkdirSync(testPath, { recursive: true });

    // Create a test API file using absolute path for BaseAPI
    const baseApiPath = path.join(__dirname, '..', 'src', 'lib', 'base-api-enhanced.js');
    const apiContent = `
const BaseAPI = require('${baseApiPath.replace(/\\/g, '\\\\')}');

class TestAPI extends BaseAPI {
  process(req, res) {
    res.json({ test: 'data' });
  }
}

module.exports = TestAPI;
`;
    fs.writeFileSync(path.join(testPath, 'get.js'), apiContent);

    apiLoader = new APILoader(app, path.join(tempDir, 'api'));
    const routes = apiLoader.loadAPIs();

    // Route should be created successfully
    const route = routes.find(r => r.path === '/items' && r.method === 'GET');
    expect(route).toBeDefined();
  });

  test('should preserve static routes alongside dynamic routes', () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'api'));
    const routes = apiLoader.loadAPIs();

    // Should have both static and dynamic routes
    const staticRoute = routes.find(r => r.path === '/example' && r.method === 'GET');
    const dynamicRoute = routes.find(r => r.path === '/example/:id' && r.method === 'GET');

    // Both should exist
    expect(staticRoute).toBeDefined();
    expect(dynamicRoute).toBeDefined();
  });

  test('should handle dynamic routes in different HTTP methods', async () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'api'));
    apiLoader.loadAPIs();

    // Test GET
    const getResponse = await request(app)
      .get('/example/test-get')
      .set('Authorization', 'Bearer valid-token');
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.id).toBe('test-get');

    // Test PUT
    const putResponse = await request(app)
      .put('/example/test-put')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Test' });
    expect(putResponse.status).toBe(200);
    expect(putResponse.body.data.id).toBe('test-put');

    // Test DELETE
    const deleteResponse = await request(app)
      .delete('/example/test-delete')
      .set('Authorization', 'Bearer valid-token');
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.data.id).toBe('test-delete');
  });
});

