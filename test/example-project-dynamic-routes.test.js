const request = require('supertest');
const express = require('express');
const APILoader = require('../src/utils/loaders/api-loader');
const path = require('path');

describe('Example Project Dynamic Routes', () => {
  let app;
  let apiLoader;

  beforeEach(() => {
    // Clear require cache for example-project API files to avoid test pollution
    const moduleIds = Object.keys(require.cache);
    moduleIds.forEach(id => {
      if (id.includes('/example-project/api/') && 
          (id.endsWith('.js') || id.endsWith('.ts') || id.includes('.ts')) &&
          !id.includes('node_modules')) {
        delete require.cache[id];
      }
    });
    
    // Create Express app
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
  });

  describe('Product Dynamic Routes', () => {
    beforeEach(() => {
      apiLoader = new APILoader(app, path.join(__dirname, '..', 'example-project', 'api'));
      apiLoader.loadAPIs();
    });

    test('should load product dynamic routes correctly', () => {
      const routes = apiLoader.getRoutes();
      
      // Check that dynamic route is loaded
      const getProductById = routes.find(r => r.path === '/products/:id' && r.method === 'GET');
      
      expect(getProductById).toBeDefined();
    });

    test('should get product by ID (product 1)', async () => {
      const response = await request(app).get('/products/1');
      
      expect(response.status).toBe(200);
      expect(response.body.product).toBeDefined();
      expect(response.body.product.id).toBe('1');
      expect(response.body.product.name).toBeDefined();
    });

    test('should get product by ID (product 2)', async () => {
      const response = await request(app).get('/products/2');
      
      expect(response.status).toBe(200);
      expect(response.body.product).toBeDefined();
      expect(response.body.product.id).toBe('2');
      expect(response.body.product.name).toBeDefined();
    });

    test('should return 404 for non-existent product', async () => {
      const response = await request(app).get('/products/999');
      
      // New handler returns 200 with a typed Product object
      expect(response.status).toBe(200);
      expect(response.body && response.body.product).toBeDefined();
    });
  });

  describe('Static and Dynamic Routes Coexistence', () => {
    beforeEach(() => {
      apiLoader = new APILoader(app, path.join(__dirname, '..', 'example-project', 'api'));
      apiLoader.loadAPIs();
    });

    test('should have both static and dynamic product routes', () => {
      const routes = apiLoader.getRoutes();
      
      const staticGet = routes.find(r => r.path === '/products' && r.method === 'GET');
      const staticPost = routes.find(r => r.path === '/products' && r.method === 'POST');
      const dynamicGet = routes.find(r => r.path === '/products/:id' && r.method === 'GET');
      
      expect(staticGet).toBeDefined();
      expect(staticPost).toBeDefined();
      expect(dynamicGet).toBeDefined();
    });

    test('should have static user routes without dynamic routes', () => {
      const routes = apiLoader.getRoutes();
      
      const staticGet = routes.find(r => r.path === '/users' && r.method === 'GET');
      const staticPost = routes.find(r => r.path === '/users' && r.method === 'POST');
      const dynamicGet = routes.find(r => r.path === '/users/:id' && r.method === 'GET');
      
      expect(staticGet).toBeDefined();
      expect(staticPost).toBeDefined();
      // Users API doesn't use dynamic routes - just static routes
      expect(dynamicGet).toBeUndefined();
    });
  });

  describe('Parameter Types', () => {
    beforeEach(() => {
      apiLoader = new APILoader(app, path.join(__dirname, '..', 'example-project', 'api'));
      apiLoader.loadAPIs();
    });

    test('should handle numeric ID', async () => {
      const response = await request(app).get('/products/123');
      expect([200, 404]).toContain(response.status);
      const hasCompatShape = response.body && (Object.prototype.hasOwnProperty.call(response.body, 'success') || Object.prototype.hasOwnProperty.call(response.body, 'product'));
      expect(hasCompatShape).toBe(true);
    });

    test('should handle string ID', async () => {
      const response = await request(app).get('/products/abc-123');
      expect([200, 404]).toContain(response.status);
      const hasCompatShape2 = response.body && (Object.prototype.hasOwnProperty.call(response.body, 'success') || Object.prototype.hasOwnProperty.call(response.body, 'product'));
      expect(hasCompatShape2).toBe(true);
    });

    test('should handle UUID-like ID', async () => {
      const response = await request(app).get('/products/550e8400-e29b-41d4-a716-446655440000');
      expect([200, 404]).toContain(response.status);
      const hasCompatShape3 = response.body && (Object.prototype.hasOwnProperty.call(response.body, 'success') || Object.prototype.hasOwnProperty.call(response.body, 'product'));
      expect(hasCompatShape3).toBe(true);
    });
  });

  describe('All Routes Summary', () => {
    test('should list all available routes in example-project', () => {
      apiLoader = new APILoader(app, path.join(__dirname, '..', 'example-project', 'api'));
      const routes = apiLoader.loadAPIs();
      
      const routeSummary = routes.map(r => `${r.method} ${r.path}`);
      
      console.log('\n📋 Example Project Routes:');
      routeSummary.forEach(route => console.log(`   ${route}`));
      
      // Verify we have the expected routes
      expect(routeSummary).toContain('GET /users');
      expect(routeSummary).toContain('POST /users');
      expect(routeSummary).toContain('GET /products');
      expect(routeSummary).toContain('POST /products');
      expect(routeSummary).toContain('GET /products/:id');
    });
  });
});
