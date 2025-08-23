
const express = require('express');
const cors = require('cors');
const config = require('./config/default');

// Create Express app
const app = express();
const { server, api } = config;

// Middleware
app.use(cors(api.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: server.env,
    version: '1.0.0'
  });
});

// API info endpoint
app.get('/api-info', (req, res) => {
  res.json({
    message: 'Dynamic API Framework',
    totalRoutes: 1,
    routes: [
      { method: 'GET', path: '/hello', processor: 'HelloProcessor' }
    ],
    timestamp: new Date().toISOString(),
    environment: server.env
  });
});

// OpenAPI specification endpoint
app.get('/openapi.json', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Dynamic Open API',
      version: '1.0.0',
      description: 'Dynamically generated API endpoints'
    },
    paths: {
      '/hello': {
        get: {
          summary: 'Hello World endpoint',
          tags: ['demo']
        }
      }
    }
  });
});

// Hello endpoint - manually loaded
app.get('/hello', (req, res) => {
  res.json({
    success: true,
    data: { message: 'Hello World!' },
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(server.port, server.host, () => {
  console.log(`🚀 Server starting on ${server.host}:${server.port}`);
  console.log(`🌍 Environment: ${server.env}`);
  console.log(`📡 Health check: http://localhost:${server.port}/health`);
  console.log(`📊 API info: http://localhost:${server.port}/api-info`);
  console.log(`📚 OpenAPI spec: http://localhost:${server.port}/openapi.json`);
  console.log('✅ Working API Framework ready!');
});

module.exports = app;
