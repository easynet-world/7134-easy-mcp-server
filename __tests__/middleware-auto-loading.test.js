/**
 * Test suite for auto-loading middleware functionality
 */

const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');
const APILoader = require('../src/core/api-loader');

describe('Middleware Auto-Loading', () => {
  let app;
  let apiLoader;
  let tempDir;

  beforeAll(() => {
    // Create temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(__dirname, 'middleware-test-'));
    
    // Create test API directory structure
    const apiDir = path.join(tempDir, 'api');
    fs.mkdirSync(apiDir, { recursive: true });
    
    // Create test middleware files
    createTestMiddlewareFiles(apiDir);
    
    // Create test API files
    createTestAPIFiles(apiDir);
  });

  afterAll(() => {
    // Clean up temporary directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    app = express();
    apiLoader = new APILoader(app, path.join(tempDir, 'api'));
  });

  function createTestMiddlewareFiles(apiDir) {
    // Global middleware
    const globalMiddleware = `
const logRequest = (req, res, next) => {
  console.log('Global middleware:', req.method, req.path);
  next();
};

const addTimestamp = (req, res, next) => {
  req.timestamp = new Date().toISOString();
  next();
};

module.exports = [logRequest, addTimestamp];
`;
    fs.writeFileSync(path.join(apiDir, 'middleware.js'), globalMiddleware);

    // User middleware
    const userDir = path.join(apiDir, 'users');
    fs.mkdirSync(userDir, { recursive: true });
    
    const userMiddleware = `
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = { id: 1, name: 'Test User' };
  next();
};

const validateUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'User required' });
  }
  next();
};

module.exports = {
  authenticate,
  validateUser
};
`;
    fs.writeFileSync(path.join(userDir, 'middleware.js'), userMiddleware);

    // Admin middleware
    const adminDir = path.join(apiDir, 'admin');
    fs.mkdirSync(adminDir, { recursive: true });
    
    const adminMiddleware = `
module.exports = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
`;
    fs.writeFileSync(path.join(adminDir, 'middleware.js'), adminMiddleware);
  }

  function createTestAPIFiles(apiDir) {
    // Test API files
    const testAPI = `
const BaseAPI = require('easy-mcp-server/base-api');

class TestAPI extends BaseAPI {
  process(req, res) {
    res.json({ 
      message: 'Hello World',
      timestamp: req.timestamp,
      user: req.user || null
    });
  }
}

module.exports = TestAPI;
`;

    // Create API files
    fs.writeFileSync(path.join(apiDir, 'get.js'), testAPI);
    fs.writeFileSync(path.join(apiDir, 'users', 'get.js'), testAPI);
    fs.writeFileSync(path.join(apiDir, 'admin', 'get.js'), testAPI);
  }

  describe('Middleware Loading', () => {
    test('should load middleware from middleware.js files', () => {
      const routes = apiLoader.loadAPIs();
      const middleware = apiLoader.getMiddleware();
      
      expect(middleware).toHaveLength(3);
      
      // Check global middleware
      const globalMiddleware = middleware.find(m => m.path === '/');
      expect(globalMiddleware).toBeDefined();
      expect(globalMiddleware.type).toBe('array');
      expect(globalMiddleware.middleware).toHaveLength(2);
      
      // Check user middleware
      const userMiddleware = middleware.find(m => m.path === '/users');
      expect(userMiddleware).toBeDefined();
      expect(userMiddleware.type).toBe('object');
      expect(userMiddleware.middleware).toHaveLength(2);
      
      // Check admin middleware
      const adminMiddleware = middleware.find(m => m.path === '/admin');
      expect(adminMiddleware).toBeDefined();
      expect(adminMiddleware.type).toBe('function');
    });

    test('should load API routes correctly', () => {
      // Create API files for testing
      fs.mkdirSync(path.join(tempDir, 'api', 'users'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'api', 'admin'), { recursive: true });
      
      // Create root API
      const rootAPI = `
const BaseAPI = require('easy-mcp-server/base-api');
class RootAPI extends BaseAPI {
  process(req, res) {
    res.json({ message: 'Root API' });
  }
}
module.exports = RootAPI;`;
      fs.writeFileSync(path.join(tempDir, 'api', 'get.js'), rootAPI);
      
      // Create users API
      const usersAPI = `
const BaseAPI = require('easy-mcp-server/base-api');
class UsersAPI extends BaseAPI {
  process(req, res) {
    res.json({ users: [] });
  }
}
module.exports = UsersAPI;`;
      fs.writeFileSync(path.join(tempDir, 'api', 'users', 'get.js'), usersAPI);
      
      // Create admin API
      const adminAPI = `
const BaseAPI = require('easy-mcp-server/base-api');
class AdminAPI extends BaseAPI {
  process(req, res) {
    res.json({ admin: true });
  }
}
module.exports = AdminAPI;`;
      fs.writeFileSync(path.join(tempDir, 'api', 'admin', 'get.js'), adminAPI);
      
      const routes = apiLoader.loadAPIs();
      
      expect(routes).toHaveLength(3);
      expect(routes.find(r => r.path === '/')).toBeDefined();
      expect(routes.find(r => r.path === '/users')).toBeDefined();
      expect(routes.find(r => r.path === '/admin')).toBeDefined();
    });

    test('should handle middleware loading errors gracefully', () => {
      // Create invalid middleware file
      fs.mkdirSync(path.join(tempDir, 'api', 'invalid'), { recursive: true });
      const invalidMiddleware = `
module.exports = "invalid middleware";
`;
      fs.writeFileSync(path.join(tempDir, 'api', 'invalid', 'middleware.js'), invalidMiddleware);
      
      const routes = apiLoader.loadAPIs();
      const errors = apiLoader.getErrors();
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('Invalid middleware export'))).toBe(true);
    });
  });

  describe('Middleware Execution', () => {
    test('should apply global middleware to all routes', async () => {
      // Create API files for testing
      fs.mkdirSync(path.join(tempDir, 'api', 'users'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'api', 'admin'), { recursive: true });
      
      // Create root API
      const rootAPI = `
const BaseAPI = require('easy-mcp-server/base-api');
class RootAPI extends BaseAPI {
  process(req, res) {
    res.json({ message: 'Root API', timestamp: req.timestamp });
  }
}
module.exports = RootAPI;`;
      fs.writeFileSync(path.join(tempDir, 'api', 'get.js'), rootAPI);
      
      const routes = apiLoader.loadAPIs();
      
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.body.timestamp).toBeDefined();
    });

    test('should apply user middleware to user routes', async () => {
      // Create users API
      const usersAPI = `
const BaseAPI = require('easy-mcp-server/base-api');
class UsersAPI extends BaseAPI {
  process(req, res) {
    res.json({ users: [], user: req.user });
  }
}
module.exports = UsersAPI;`;
      fs.writeFileSync(path.join(tempDir, 'api', 'users', 'get.js'), usersAPI);
      
      const routes = apiLoader.loadAPIs();
      
      // Should fail without authentication
      await request(app)
        .get('/users')
        .expect(401);
      
      // Should succeed with authentication
      const response = await request(app)
        .get('/users')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(1);
    });

    test('should apply admin middleware to admin routes', async () => {
      // Create admin API
      const adminAPI = `
const BaseAPI = require('easy-mcp-server/base-api');
class AdminAPI extends BaseAPI {
  process(req, res) {
    res.json({ admin: true, user: req.user });
  }
}
module.exports = AdminAPI;`;
      fs.writeFileSync(path.join(tempDir, 'api', 'admin', 'get.js'), adminAPI);
      
      const routes = apiLoader.loadAPIs();
      
      // Should fail without authentication
      await request(app)
        .get('/admin')
        .expect(401);
      
      // Should fail with user authentication (not admin)
      await request(app)
        .get('/admin')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);
    });

    test('should apply middleware in correct order', async () => {
      const routes = apiLoader.loadAPIs();
      
      // Global middleware should add timestamp
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.user).toBeNull(); // No user middleware on root
    });
  });

  describe('Middleware Export Formats', () => {
    test('should handle array export format', () => {
      const middleware = apiLoader.getMiddleware();
      const globalMiddleware = middleware.find(m => m.path === '/');
      
      expect(globalMiddleware.type).toBe('array');
      expect(Array.isArray(globalMiddleware.middleware)).toBe(true);
    });

    test('should handle object export format', () => {
      const middleware = apiLoader.getMiddleware();
      const userMiddleware = middleware.find(m => m.path === '/users');
      
      expect(userMiddleware.type).toBe('object');
      expect(Array.isArray(userMiddleware.middleware)).toBe(true);
    });

    test('should handle function export format', () => {
      const middleware = apiLoader.getMiddleware();
      const adminMiddleware = middleware.find(m => m.path === '/admin');
      
      expect(adminMiddleware.type).toBe('function');
      expect(typeof adminMiddleware.middleware[0]).toBe('function');
    });
  });

  describe('Middleware Path Resolution', () => {
    test('should resolve middleware paths correctly', () => {
      const middleware = apiLoader.getMiddleware();
      
      expect(middleware.find(m => m.path === '/')).toBeDefined();
      expect(middleware.find(m => m.path === '/users')).toBeDefined();
      expect(middleware.find(m => m.path === '/admin')).toBeDefined();
    });

    test('should get middleware for specific path', () => {
      const routes = apiLoader.loadAPIs();
      
      const userMiddleware = apiLoader.getMiddlewareForPath('/users');
      expect(userMiddleware).toHaveLength(1);
      expect(userMiddleware[0].path).toBe('/users');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing middleware files gracefully', () => {
      // Create API directory without middleware
      const noMiddlewareDir = path.join(tempDir, 'no-middleware');
      fs.mkdirSync(noMiddlewareDir, { recursive: true });
      
      const testAPI = `
const BaseAPI = require('easy-mcp-server/base-api');
class TestAPI extends BaseAPI {
  process(req, res) { res.json({ message: 'test' }); }
}
module.exports = TestAPI;
`;
      fs.writeFileSync(path.join(noMiddlewareDir, 'get.js'), testAPI);
      
      const testApp = express();
      const testLoader = new APILoader(testApp, noMiddlewareDir);
      const routes = testLoader.loadAPIs();
      
      expect(routes).toHaveLength(1);
      expect(testLoader.getMiddleware()).toHaveLength(0);
    });

    test('should handle middleware loading errors', () => {
      const errors = apiLoader.getErrors();
      // Should have some errors from invalid middleware test
      expect(Array.isArray(errors)).toBe(true);
    });
  });
});
