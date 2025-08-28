
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import core modules
const APILoader = require('./src/core/api-loader');
const OpenAPIGenerator = require('./src/core/openapi-generator');
const DynamicAPIMCPServer = require('./src/mcp/mcp-server');
const HotReloader = require('./src/utils/hot-reloader');

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

// Initialize core services
const apiLoader = new APILoader(app);
const openapiGenerator = new OpenAPIGenerator(apiLoader);

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
  const routes = apiLoader.getRoutes();
  const errors = apiLoader.getErrors();
  const validationIssues = apiLoader.validateRoutes();
  
  res.json({
    message: 'Dynamic API Framework',
    totalRoutes: routes.length,
    routes: routes,
    errors: errors,
    validationIssues: validationIssues,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// OpenAPI specification endpoint
app.get('/openapi.json', (req, res) => {
  try {
    const spec = openapiGenerator.generateSpec();
    res.json(spec);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to generate OpenAPI spec: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Load all APIs
const loadedRoutes = apiLoader.loadAPIs();

// MCP (Model Context Protocol) endpoints
app.get('/mcp/tools', (req, res) => {
  try {
    const routes = apiLoader.getRoutes();
    const tools = routes.map(route => ({
      name: `${route.method.toLowerCase()}_${route.path.replace(/\//g, '_').replace(/^_/, '')}`,
      description: route.processorInstance?.description || `Execute ${route.method} request to ${route.path}`,
      method: route.method,
      path: route.path,
      processor: route.processor
    }));
    
    res.json({
      success: true,
      tools,
      totalTools: tools.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to get MCP tools: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/mcp/execute/:toolName', (req, res) => {
  const { toolName } = req.params;
  const { body, query, headers } = req.body;
  
  try {
    // Parse the tool name to get method and path
    const [method, ...pathParts] = toolName.split('_');
    const path = '/' + pathParts.join('/');
    
    // Find the route
    const routes = apiLoader.getRoutes();
    const route = routes.find(r => 
      r.method.toLowerCase() === method.toUpperCase() && 
      r.path === path
    );
    
    if (!route) {
      return res.status(404).json({
        success: false,
        error: `API endpoint not found: ${method.toUpperCase()} ${path}`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Execute the API endpoint
    executeAPIEndpoint(route, { body, query, headers }, res);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Error executing API endpoint: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Execute an API endpoint with mock request/response objects
 */
async function executeAPIEndpoint(route, args, res) {
  // Create mock request and response objects
  const mockReq = {
    method: route.method,
    path: route.path,
    body: args.body || {},
    query: args.query || {},
    headers: args.headers || {},
    params: {}
  };

  const mockRes = {
    statusCode: 200,
    headers: {},
    json: function(data) {
      this.data = data;
      this.statusCode = 200;
      return this;
    },
    send: function(data) {
      this.data = data;
      this.statusCode = 200;
      return this;
    },
    status: function(code) {
      this.statusCode = code;
      return this;
    }
  };

  try {
    // Execute the processor
    if (route.processorInstance && typeof route.processorInstance.process === 'function') {
      await route.processorInstance.process(mockReq, mockRes);
      
      res.json({
        success: true,
        statusCode: mockRes.statusCode,
        data: mockRes.data,
        endpoint: `${route.method} ${route.path}`,
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error(`Processor not available for ${route.method} ${route.path}`);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Error executing processor: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
}

// Server startup function
function startServer() {
  const host = process.env.SERVER_HOST || '0.0.0.0';
  const port = process.env.SERVER_PORT || 3000;

  // Start MCP server if enabled
  let mcpServer = null;
  let hotReloader = null;

  if (process.env.MCP_ENABLED !== 'false') {
    try {
      mcpServer = new DynamicAPIMCPServer(
        process.env.MCP_HOST || 'localhost',
        process.env.MCP_PORT || 3001
      );
      
      // Start MCP server first
      mcpServer.run().then(() => {
        console.log('🤖 MCP Server started successfully!');
        
        // Set the routes for MCP server after it's started
        mcpServer.setRoutes(loadedRoutes);
        console.log(`🔌 MCP Server: Routes set (${loadedRoutes.length} routes)`);
        
        // Initialize hot reloading after MCP server is ready
        hotReloader = new HotReloader(apiLoader, mcpServer);
        hotReloader.startWatching();
        
      }).catch(error => {
        console.warn('⚠️  MCP Server failed to start:', error.message);
      });
    } catch (error) {
      console.warn('⚠️  MCP Server not available:', error.message);
    }
  }

  // Start the main server
  app.listen(port, host, () => {
    console.log(`🚀 Server starting on ${host}:${port}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 Health check: http://localhost:${port}/health`);
    console.log(`📊 API info: http://localhost:${port}/api-info`);
    console.log(`📚 OpenAPI spec: http://localhost:${port}/openapi.json`);
    console.log(`🤖 MCP tools: http://localhost:${port}/mcp/tools`);
    if (mcpServer) {
      console.log(`🔌 MCP server: ws://${process.env.MCP_HOST || 'localhost'}:${process.env.MCP_PORT || 3001}`);
    }
    console.log('✅ Working API Framework with MCP support ready!');
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...');
    if (hotReloader) {
      hotReloader.stopWatching();
    }
    if (mcpServer) {
      mcpServer.stop();
    }
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down servers...');
    if (hotReloader) {
      hotReloader.stopWatching();
    }
    if (mcpServer) {
      mcpServer.stop();
    }
    process.exit(0);
  });
}

// Only start server if this file is run directly
if (require.main === module) {
  startServer();
}

// Export functions for external use
module.exports = {
  app,
  apiLoader,
  openapiGenerator,
  mcpServer: null, // Will be set when server starts
  hotReloader: null, // Will be set when server starts
  getLoadedRoutes: () => apiLoader.getRoutes()
};
// Version 0.0.1
