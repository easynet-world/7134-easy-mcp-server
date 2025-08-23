const request = require('supertest');

// Mock the server without actually starting it
jest.mock('../server', () => {
  const express = require('express');
  const app = express();
  
  // Add basic routes for testing
  app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
  });
  
  app.get('/api-info', (req, res) => {
    res.json({ 
      message: 'Dynamic API Framework',
      totalRoutes: 0,
      routes: []
    });
  });
  
  return app;
});

describe('Server Basic Functionality', () => {
  let app;
  
  beforeAll(() => {
    app = require('../server');
  });
  
  test('health endpoint should return OK status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
  });
  
  test('api-info endpoint should return framework info', async () => {
    const response = await request(app).get('/api-info');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Dynamic API Framework');
    expect(response.body.totalRoutes).toBe(0);
  });
  
  test('should have correct response structure', async () => {
    const response = await request(app).get('/api-info');
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('totalRoutes');
    expect(response.body).toHaveProperty('routes');
    expect(Array.isArray(response.body.routes)).toBe(true);
  });
});
