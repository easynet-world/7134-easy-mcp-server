
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.API_CORS_ORIGIN || '*',
  methods: (process.env.API_CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE').split(','),
  credentials: process.env.API_CORS_CREDENTIALS === 'true'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
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
    environment: process.env.NODE_ENV || 'development'
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
const host = process.env.SERVER_HOST || '0.0.0.0';
const port = process.env.SERVER_PORT || 3000;

app.listen(port, host, () => {
  console.log(`🚀 Server starting on ${host}:${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Health check: http://localhost:${port}/health`);
  console.log(`📊 API info: http://localhost:${port}/api-info`);
  console.log(`📚 OpenAPI spec: http://localhost:${port}/openapi.json`);
  console.log('✅ Working API Framework ready!');
});

module.exports = app;
