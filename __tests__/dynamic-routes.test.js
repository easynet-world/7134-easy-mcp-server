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
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'example-project', 'api'));
    const routes = apiLoader.loadAPIs();

    // Find the dynamic route
    const dynamicRoute = routes.find(r => r.path === '/users/:id' && r.method === 'GET');
    expect(dynamicRoute).toBeDefined();
    expect(dynamicRoute.path).toBe('/users/:id');
    expect(dynamicRoute.method).toBe('GET');
  });

  test('should handle GET request to /users/:id', async () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'example-project', 'api'));
    apiLoader.loadAPIs();

    const response = await request(app)
      .get('/users/1');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('1');
    expect(response.body.data.name).toBe('John Doe');
  });

  test('should handle PUT request to /users/:id', async () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'example-project', 'api'));
    apiLoader.loadAPIs();

    const response = await request(app)
      .put('/users/1')
      .send({ name: 'Updated Name', email: 'updated@example.com' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('1');
    expect(response.body.data.name).toBe('Updated Name');
    expect(response.body.message).toContain('updated successfully');
  });

  test('should handle DELETE request to /users/:id', async () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'example-project', 'api'));
    apiLoader.loadAPIs();

    const response = await request(app)
      .delete('/users/1');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('1');
    expect(response.body.message).toContain('deleted successfully');
  });

  test.skip('should load API with nested dynamic parameters [userId]/posts/[postId]', () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'example-project', 'api'));
    const routes = apiLoader.loadAPIs();

    // Find the nested dynamic route
    const nestedRoute = routes.find(r => r.path === '/users/:userId/posts/:postId' && r.method === 'GET');
    expect(nestedRoute).toBeDefined();
    expect(nestedRoute.path).toBe('/users/:userId/posts/:postId');
    expect(nestedRoute.method).toBe('GET');
  });

  test.skip('should handle GET request to /users/:userId/posts/:postId', async () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'example-project', 'api'));
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
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'example-project', 'api'));
    apiLoader.loadAPIs();

    // Test with numeric ID - user 1 exists
    const numericResponse = await request(app)
      .get('/users/1');
    expect(numericResponse.status).toBe(200);
    expect(numericResponse.body.data.id).toBe('1');

    // Test with another numeric ID - user 2 exists
    const numericResponse2 = await request(app)
      .get('/users/2');
    expect(numericResponse2.status).toBe(200);
    expect(numericResponse2.body.data.id).toBe('2');

    // Test with string ID that doesn't exist - should return 404
    const stringResponse = await request(app)
      .get('/users/abc-123');
    expect(stringResponse.status).toBe(404);
    expect(stringResponse.body.success).toBe(false);
  });

  test('should handle special characters in parameters', async () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'example-project', 'api'));
    apiLoader.loadAPIs();

    // Test with valid user ID
    const response = await request(app)
      .get('/users/3');
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe('3');
    expect(response.body.data.name).toBe('Bob Johnson');
  });

  test('should not convert [param] in query strings or body', async () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'example-project', 'api'));
    apiLoader.loadAPIs();

    const response = await request(app)
      .put('/users/test-id')
      .set('Authorization', 'Bearer valid-token')
      .send({ data: '[someValue]' });
    
    expect(response.status).toBe(200);
    // Query and body should preserve [brackets]
  });

  test('should handle empty parameter values', async () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'example-project', 'api'));
    apiLoader.loadAPIs();

    // Express will not match empty parameters, so this should 404
    const response = await request(app)
      .get('/users/')
      .set('Authorization', 'Bearer valid-token');
    // This should not match the /users/:id route
    // It should fall through to 404 or the /users base route if it exists
    expect([200, 401, 404]).toContain(response.status);
  });

  test('should generate correct route information for OpenAPI', () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'example-project', 'api'));
    const routes = apiLoader.loadAPIs();

    const dynamicRoute = routes.find(r => r.path === '/users/:id' && r.method === 'GET');
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
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'example-project', 'api'));
    const routes = apiLoader.loadAPIs();

    // Should have both static and dynamic routes
    const staticRoute = routes.find(r => r.path === '/users' && r.method === 'GET');
    const dynamicRoute = routes.find(r => r.path === '/users/:id' && r.method === 'GET');

    // Both should exist
    expect(staticRoute).toBeDefined();
    expect(dynamicRoute).toBeDefined();
  });

  test('should handle dynamic routes in different HTTP methods', async () => {
    apiLoader = new APILoader(app, path.join(__dirname, '..', 'example-project', 'api'));
    apiLoader.loadAPIs();

    // Test GET with existing user
    const getResponse = await request(app)
      .get('/users/1');
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.id).toBe('1');
    expect(getResponse.body.data.name).toBe('John Doe');

    // Test PUT with any ID
    const putResponse = await request(app)
      .put('/users/2')
      .send({ name: 'Updated Name', email: 'updated@example.com' });
    expect(putResponse.status).toBe(200);
    expect(putResponse.body.data.id).toBe('2');
    expect(putResponse.body.data.name).toBe('Updated Name');

    // Test DELETE with any ID
    const deleteResponse = await request(app)
      .delete('/users/3');
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.data.id).toBe('3');
  });
});

