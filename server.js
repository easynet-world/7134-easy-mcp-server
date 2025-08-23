
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
    totalRoutes: loadedRoutes.length,
    routes: loadedRoutes,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// OpenAPI specification endpoint
app.get('/openapi.json', (req, res) => {
  const paths = {};
  
  loadedRoutes.forEach(route => {
    if (!paths[route.path]) {
      paths[route.path] = {};
    }
    
    // Try to get OpenAPI info from the processor
    try {
      const processorPath = path.join(__dirname, 'api', route.path.substring(1), route.method.toLowerCase() + '.js');
      const ProcessorClass = require(processorPath);
      const processor = new ProcessorClass();
      
      if (processor.openApi) {
        paths[route.path][route.method.toLowerCase()] = processor.openApi;
      } else {
        paths[route.path][route.method.toLowerCase()] = {
          summary: `${route.method} ${route.path}`,
          tags: ['api']
        };
      }
    } catch (error) {
      paths[route.path][route.method.toLowerCase()] = {
        summary: `${route.method} ${route.path}`,
        tags: ['api']
      };
    }
  });
  
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Dynamic Open API Framework',
      version: '1.0.0',
      description: 'A dynamic API framework that automatically generates OpenAPI specifications from file-based API endpoints',
      contact: {
        name: 'API Support',
        url: 'https://github.com/easynet-world/7134-dynamic-open-api'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.SERVER_PORT || 3000}`,
        description: 'Development server'
      }
    ],
    paths: paths,
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error message' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  });
});

// Dynamic API loading function
function loadAPIs() {
  const fs = require('fs');
  const path = require('path');
  const apiDir = path.join(__dirname, 'api');
  
  if (!fs.existsSync(apiDir)) {
    console.log('⚠️  No api/ directory found');
    return [];
  }

  const routes = [];
  
  function scanDirectory(dir, basePath = '') {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Recursively scan subdirectories
        scanDirectory(fullPath, path.join(basePath, item));
      } else if (stat.isFile() && item.endsWith('.js')) {
        // Found an API file
        const httpMethod = path.basename(item, '.js');
        const routePath = path.join(basePath, path.dirname(item));
        const normalizedPath = '/' + routePath.replace(/\\/g, '/');
        
        try {
          const ProcessorClass = require(fullPath);
          const processor = new ProcessorClass();
          
          if (typeof processor.process === 'function') {
            // Register the route dynamically
            app[httpMethod.toLowerCase()](normalizedPath, (req, res) => {
              processor.process(req, res);
            });
            
            routes.push({
              method: httpMethod.toUpperCase(),
              path: normalizedPath,
              processor: processor.constructor.name
            });
            
            console.log(`✅ Loaded API: ${httpMethod.toUpperCase()} ${normalizedPath}`);
          }
        } catch (error) {
          console.log(`⚠️  Error loading API from ${fullPath}: ${error.message}`);
        }
      }
    });
  }
  
  scanDirectory(apiDir);
  return routes;
}

// Load all APIs
const loadedRoutes = loadAPIs();

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
