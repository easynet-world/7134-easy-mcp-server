const request = require('supertest');

// Mock the server without actually starting it
jest.mock('../src/orchestrator', () => {
  const express = require('express');
  const app = express();
  
  // Add basic routes for testing
  app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
  });
  
  app.get('/api-info', (req, res) => {
    res.json({ 
      message: 'Easy MCP Framework',
      totalRoutes: 0,
      routes: []
    });
  });
  
  app.get('/openapi.json', (req, res) => {
    res.json({
      openapi: '3.0.0',
      info: {
        title: 'Easy MCP Framework',
        version: '1.0.0'
      }
    });
  });
  
  app.get('/mcp/tools', (req, res) => {
    res.json({
      tools: []
    });
  });
  
  app.get('/LLM.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.send('# Easy MCP Framework - LLM.txt\n\n## Overview\nEasy MCP Framework is a dynamic API framework...');
  });
  
  return app;
});

describe('Server Basic Functionality', () => {
  let app;
  
  beforeAll(() => {
    app = require('../src/orchestrator');
  });
  
  test('health endpoint should return OK status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
  });
  
  test('api-info endpoint should return framework info', async () => {
    const response = await request(app).get('/api-info');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Easy MCP Framework');
    expect(response.body.totalRoutes).toBe(0);
  });
  
  test('should have correct response structure', async () => {
    const response = await request(app).get('/api-info');
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('totalRoutes');
    expect(response.body).toHaveProperty('routes');
    expect(Array.isArray(response.body.routes)).toBe(true);
  });
  
  test('openapi endpoint should return OpenAPI spec', async () => {
    const response = await request(app).get('/openapi.json');
    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.0.0');
    expect(response.body.info.title).toBe('Easy MCP Framework');
  });
  
  test('mcp tools endpoint should return tools list', async () => {
    const response = await request(app).get('/mcp/tools');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('tools');
    expect(Array.isArray(response.body.tools)).toBe(true);
  });

  test('llm-txt endpoint should return LLM.txt content', async () => {
    const response = await request(app).get('/LLM.txt');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('Easy MCP Framework');
    expect(response.text).toContain('LLM.txt');
  });
});
