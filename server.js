const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/default');
const DynamicAPILoader = require('./src/DynamicAPILoader');

// Create Express app
const app = express();
const { server, api, security } = config;

// Middleware
app.use(cors(api.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

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
  const apiLoader = req.app.locals.apiLoader;
  if (apiLoader) {
    const routes = apiLoader.getRegisteredRoutes();
    res.json({
      message: 'Dynamic API Framework',
      totalRoutes: routes.length,
      routes: routes,
      timestamp: new Date().toISOString(),
      environment: server.env
    });
  } else {
    res.status(503).json({
      error: 'API Loader not initialized',
      timestamp: new Date().toISOString()
    });
  }
});

// OpenAPI specification endpoint
app.get('/openapi.json', (req, res) => {
  const apiLoader = req.app.locals.apiLoader;
  if (apiLoader) {
    res.json(apiLoader.getOpenApiSpec());
  } else {
    res.status(503).json({
      error: 'API Loader not initialized',
      timestamp: new Date().toISOString()
    });
  }
});

// Initialize dynamic API loader
async function initializeAPI() {
  try {
    const apiLoader = new DynamicAPILoader(app, api.path);
    await apiLoader.initialize();
    
    // Store reference in app.locals for access in routes
    app.locals.apiLoader = apiLoader;
    
    console.log('✅ Dynamic API Framework initialized successfully');
    console.log(`📁 API directory: ${api.path}`);
    console.log('🔄 File watching enabled for runtime updates');
    console.log('🌐 Server ready to accept requests');
    console.log('📚 OpenAPI spec available at /openapi.json');
    
  } catch (error) {
    console.error('❌ Failed to initialize Dynamic API Framework:', error);
    process.exit(1);
  }
}

// Start server
app.listen(server.port, server.host, async () => {
  console.log(`🚀 Server starting on ${server.host}:${server.port}`);
  console.log(`🌍 Environment: ${server.env}`);
  console.log(`📡 Health check: http://localhost:${server.port}/health`);
  console.log(`📊 API info: http://localhost:${server.port}/api-info`);
  console.log(`📚 OpenAPI spec: http://localhost:${server.port}/openapi.json`);
  
  await initializeAPI();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  const apiLoader = app.locals.apiLoader;
  if (apiLoader) {
    apiLoader.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  const apiLoader = app.locals.apiLoader;
  if (apiLoader) {
    apiLoader.stop();
  }
  process.exit(0);
});

module.exports = app;
