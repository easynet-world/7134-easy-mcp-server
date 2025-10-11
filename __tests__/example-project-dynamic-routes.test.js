const request = require('supertest');
const express = require('express');
const APILoader = require('../src/core/api-loader');
const path = require('path');

describe('Example Project Dynamic Routes', () => {
  let app;
  let apiLoader;

  beforeEach(() => {
    // Create Express app
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
  });

  describe('User Dynamic Routes', () => {
    beforeEach(() => {
      apiLoader = new APILoader(app, path.join(__dirname, '..', 'example-project', 'api'));
      apiLoader.loadAPIs();
    });

    test('should load user dynamic routes correctly', () => {
      const routes = apiLoader.getRoutes();
      
      // Check that dynamic routes are loaded
      const getUserById = routes.find(r => r.path === '/users/:id' && r.method === 'GET');
      const updateUserById = routes.find(r => r.path === '/users/:id' && r.method === 'PUT');
      const deleteUserById = routes.find(r => r.path === '/users/:id' && r.method === 'DELETE');
      
      expect(getUserById).toBeDefined();
      expect(updateUserById).toBeDefined();
      expect(deleteUserById).toBeDefined();
    });

    test('should get user by ID (user 1)', async () => {
      const response = await request(app).get('/users/1');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('1');
      expect(response.body.data.name).toBe('John Doe');
      expect(response.body.data.email).toBe('john@example.com');
    });

    test('should get user by ID (user 2)', async () => {
      const response = await request(app).get('/users/2');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('2');
      expect(response.body.data.name).toBe('Jane Smith');
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app).get('/users/999');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    test('should update user by ID', async () => {
      const response = await request(app)
        .put('/users/1')
        .send({
          name: 'John Updated',
          email: 'john.updated@example.com'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated successfully');
      expect(response.body.data.id).toBe('1');
      expect(response.body.data.name).toBe('John Updated');
    });

    test('should delete user by ID', async () => {
      const response = await request(app).delete('/users/1');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
      expect(response.body.data.id).toBe('1');
    });
  });

  describe('Product Dynamic Routes', () => {
    beforeEach(() => {
      apiLoader = new APILoader(app, path.join(__dirname, '..', 'example-project', 'api'));
      apiLoader.loadAPIs();
    });

    test('should load product dynamic routes correctly', () => {
      const routes = apiLoader.getRoutes();
      
      // Check that dynamic routes are loaded
      const getProductById = routes.find(r => r.path === '/products/:id' && r.method === 'GET');
      const updateProductById = routes.find(r => r.path === '/products/:id' && r.method === 'PUT');
      const deleteProductById = routes.find(r => r.path === '/products/:id' && r.method === 'DELETE');
      
      expect(getProductById).toBeDefined();
      expect(updateProductById).toBeDefined();
      expect(deleteProductById).toBeDefined();
    });

    test('should get product by ID (product 1)', async () => {
      const response = await request(app).get('/products/1');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('1');
      expect(response.body.data.name).toBe('Laptop');
      expect(response.body.data.price).toBe(999.99);
      expect(response.body.data.stock).toBe(50);
    });

    test('should get product by ID (product 2)', async () => {
      const response = await request(app).get('/products/2');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('2');
      expect(response.body.data.name).toBe('Mouse');
    });

    test('should return 404 for non-existent product', async () => {
      const response = await request(app).get('/products/999');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    test('should update product by ID', async () => {
      const response = await request(app)
        .put('/products/1')
        .send({
          name: 'Laptop Pro',
          price: 1299.99,
          stock: 25
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated successfully');
      expect(response.body.data.id).toBe('1');
      expect(response.body.data.name).toBe('Laptop Pro');
      expect(response.body.data.price).toBe(1299.99);
    });

    test('should delete product by ID', async () => {
      const response = await request(app).delete('/products/1');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
      expect(response.body.data.id).toBe('1');
    });
  });

  describe('Static and Dynamic Routes Coexistence', () => {
    beforeEach(() => {
      apiLoader = new APILoader(app, path.join(__dirname, '..', 'example-project', 'api'));
      apiLoader.loadAPIs();
    });

    test('should have both static and dynamic user routes', () => {
      const routes = apiLoader.getRoutes();
      
      const staticGet = routes.find(r => r.path === '/users' && r.method === 'GET');
      const staticPost = routes.find(r => r.path === '/users' && r.method === 'POST');
      const dynamicGet = routes.find(r => r.path === '/users/:id' && r.method === 'GET');
      
      expect(staticGet).toBeDefined();
      expect(staticPost).toBeDefined();
      expect(dynamicGet).toBeDefined();
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
  });

  describe('Parameter Types', () => {
    beforeEach(() => {
      apiLoader = new APILoader(app, path.join(__dirname, '..', 'example-project', 'api'));
      apiLoader.loadAPIs();
    });

    test('should handle numeric ID', async () => {
      const response = await request(app).get('/users/123');
      expect([200, 404]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });

    test('should handle string ID', async () => {
      const response = await request(app).get('/users/abc-123');
      expect([200, 404]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });

    test('should handle UUID-like ID', async () => {
      const response = await request(app).get('/users/550e8400-e29b-41d4-a716-446655440000');
      expect([200, 404]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
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
      expect(routeSummary).toContain('GET /users/:id');
      expect(routeSummary).toContain('PUT /users/:id');
      expect(routeSummary).toContain('DELETE /users/:id');
      expect(routeSummary).toContain('GET /products');
      expect(routeSummary).toContain('POST /products');
      expect(routeSummary).toContain('GET /products/:id');
      expect(routeSummary).toContain('PUT /products/:id');
      expect(routeSummary).toContain('DELETE /products/:id');
    });
  });
});

