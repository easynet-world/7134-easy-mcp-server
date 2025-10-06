require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import core modules
const path = require('path');
const APILoader = require(path.join(__dirname, 'core', 'api-loader'));
const OpenAPIGenerator = require(path.join(__dirname, 'core', 'openapi-generator'));
const DynamicAPIMCPServer = require(path.join(__dirname, 'mcp', 'mcp-server'));
const HotReloader = require(path.join(__dirname, 'utils', 'hot-reloader'));
const EnvHotReloader = require(path.join(__dirname, 'utils', 'env-hot-reloader'));

// Create Express app
const app = express();

// Global safety nets: never crash the process on unexpected errors
process.on('uncaughtException', (error) => {
  try {
    console.error('❌ Uncaught Exception (server will continue running):', error);
  } catch (_) {
    // no-op
  }
});

process.on('unhandledRejection', (reason) => {
  try {
    console.error('❌ Unhandled Promise Rejection (server will continue running):', reason);
  } catch (_) {
    // no-op
  }
});

// Middleware
app.use(cors({
  origin: process.env.EASY_MCP_SERVER_CORS_ORIGIN || '*',
  methods: (process.env.EASY_MCP_SERVER_CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE').split(','),
  credentials: process.env.EASY_MCP_SERVER_CORS_CREDENTIALS === 'true'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving configuration - always enabled by default
const staticConfig = {
  enabled: process.env.EASY_MCP_SERVER_STATIC_ENABLED !== 'false',
  directory: process.env.EASY_MCP_SERVER_STATIC_DIRECTORY || './public',
  serveIndex: process.env.EASY_MCP_SERVER_SERVE_INDEX !== 'false',
  defaultFile: process.env.EASY_MCP_SERVER_DEFAULT_FILE || 'index.html'
};

// Setup static file serving - always enabled
const fs = require('fs');
const staticPath = path.resolve(staticConfig.directory);

// Create static directory if it doesn't exist
if (!fs.existsSync(staticPath)) {
  fs.mkdirSync(staticPath, { recursive: true });
  console.log(`📁 Created static directory: ${staticPath}`);
}

console.log(`📁 Static files enabled: serving from ${staticPath}`);

// Serve static files - ensure this is applied early and always
console.log(`🔧 Applying static file middleware to path: ${staticPath}`);
app.use(express.static(staticPath, {
  index: false, // Disable automatic index serving
  dotfiles: 'ignore', // Ignore dotfiles for security
  etag: true, // Enable ETags for caching
  lastModified: true // Enable Last-Modified headers
}));
console.log('✅ Static file middleware applied successfully');

// Handle root route with index.html if it exists
if (staticConfig.serveIndex) {
  const indexPath = path.join(staticPath, staticConfig.defaultFile);
  if (fs.existsSync(indexPath)) {
    app.get('/', (req, res) => {
      res.sendFile(indexPath);
    });
    console.log(`🏠 Root route configured: serving ${staticConfig.defaultFile}`);
  }
}

// Centralized Express error handler to prevent crashes on route errors
app.use((err, req, res, next) => {
  try {
    console.error('❌ Express error handler caught error:', err);
  } catch (_) {
    // no-op
  }
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal Server Error', message: err?.message || 'Unknown error' });
});

// Initialize core services
const apiLoader = new APILoader(app, process.env.EASY_MCP_SERVER_API_PATH || null);
const openapiGenerator = new OpenAPIGenerator(apiLoader);

// Enhanced health check endpoint with API status
app.get('/health', (req, res) => {
  const routes = apiLoader.getRoutes();
  const errors = apiLoader.getErrors();
  
  // Get API status information
  const apiStatus = routes.map(route => {
    const processor = route.processorInstance;
    if (processor && typeof processor.getServiceStatus === 'function') {
      return processor.getServiceStatus();
    }
    return {
      serviceName: route.processor,
      path: route.path,
      method: route.method,
      status: 'unknown'
    };
  });
  
  // Determine overall health
  const healthyAPIs = apiStatus.filter(api => 
    api.initializationStatus === 'success' || api.status === 'unknown'
  ).length;
  const totalAPIs = apiStatus.length;
  const failedAPIs = apiStatus.filter(api => 
    api.initializationStatus === 'failed'
  ).length;
  
  const overallStatus = failedAPIs === 0 ? 'healthy' : 
    healthyAPIs > 0 ? 'partial' : 'unhealthy';
  
  res.json({
    status: overallStatus,
    server: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    apis: {
      total: totalAPIs,
      healthy: healthyAPIs,
      failed: failedAPIs,
      details: apiStatus
    },
    errors: errors.length > 0 ? errors : null
  });
});

// API retry endpoint for failed initializations
app.post('/admin/retry-initialization', async (req, res) => {
  try {
    const { api } = req.body;
    const routes = apiLoader.getRoutes();
    
    if (!api) {
      return res.status(400).json({
        success: false,
        error: 'API parameter is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Find the API by service name or path
    const route = routes.find(r => 
      r.processorInstance?.serviceName === api || 
      r.path === api ||
      r.processor === api
    );
    
    if (!route || !route.processorInstance) {
      return res.status(404).json({
        success: false,
        error: `API not found: ${api}`,
        timestamp: new Date().toISOString()
      });
    }
    
    const processor = route.processorInstance;
    
    // Check if the processor has retry capability
    if (typeof processor.retryInitialization !== 'function') {
      return res.status(400).json({
        success: false,
        error: 'API does not support retry initialization',
        timestamp: new Date().toISOString()
      });
    }
    
    // Attempt retry
    const retryResult = await processor.retryInitialization();
    
    res.json({
      success: retryResult,
      api: api,
      result: retryResult ? 'success' : 'failed',
      status: processor.getServiceStatus(),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Retry initialization failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
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

// Markdown API routes removed (moved to MCP via MCPCacheManager)

// Swagger UI endpoint
app.get('/docs', (req, res) => {
  const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Easy MCP Server API Documentation" />
    <title>Easy MCP Server - API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; background: #fafafa; }
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info .title { color: #3b4151; }
        .swagger-ui .info .description { color: #3b4151; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: '/openapi.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                docExpansion: "list",
                defaultModelsExpandDepth: 1,
                defaultModelExpandDepth: 1,
                tryItOutEnabled: true,
                requestInterceptor: function(request) {
                    console.log('Request:', request);
                    return request;
                },
                responseInterceptor: function(response) {
                    console.log('Response:', response);
                    return response;
                }
            });
        };
    </script>
</body>
</html>`;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(swaggerHtml);
});

// LLM.txt endpoint for AI model context
app.get('/LLM.txt', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const llmPath = path.join(__dirname, '..', 'LLM.txt');
    
    if (fs.existsSync(llmPath)) {
      const content = fs.readFileSync(llmPath, 'utf8');
      res.setHeader('Content-Type', 'text/plain');
      res.send(content);
    } else {
      res.status(404).json({
        success: false,
        error: 'LLM.txt file not found',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to read LLM.txt: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Agent.md endpoint for AI agent context
app.get('/Agent.md', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const agentPath = path.join(__dirname, '..', 'Agent.md');
    
    if (fs.existsSync(agentPath)) {
      const content = fs.readFileSync(agentPath, 'utf8');
      res.setHeader('Content-Type', 'text/markdown');
      res.send(content);
    } else {
      res.status(404).json({
        success: false,
        error: 'Agent.md file not found',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to read Agent.md: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Load all APIs with error summary
const loadedRoutes = apiLoader.loadAPIs();
const errors = apiLoader.getErrors();

// Display error summary if there are any
if (errors.length > 0) {
  console.log('\n⚠️  API Loading Summary:');
  console.log(`   Total APIs attempted: ${loadedRoutes.length + errors.length}`);
  console.log(`   Successfully loaded: ${loadedRoutes.length}`);
  console.log(`   Failed to load: ${errors.length}`);
  
  // Group errors by type for better reporting
  const errorTypes = {};
  errors.forEach(error => {
    const errorType = typeof error === 'object' ? error.type : 'unknown';
    if (!errorTypes[errorType]) {
      errorTypes[errorType] = 0;
    }
    errorTypes[errorType]++;
  });
  
  console.log('\n📊 Error Breakdown:');
  Object.entries(errorTypes).forEach(([type, count]) => {
    console.log(`   ${type}: ${count} errors`);
  });
  
  console.log('\n💡 Server will continue running with available APIs.');
  console.log('   Check /health endpoint for detailed API status.');
  console.log('   Fix missing dependencies to enable failed APIs.\n');
}

// MCP (Model Context Protocol) endpoints
app.get('/mcp/tools', (req, res) => {
  try {
    const routes = apiLoader.getRoutes();
    const tools = routes.map(route => ({
      name: `${route.path.replace(/\//g, '_').replace(/^_/, '')}_${route.method.toLowerCase()}`,
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
    // Parse the tool name to get method and path (method is now at the end)
    const parts = toolName.split('_');
    const method = parts[parts.length - 1]; // Last part is the method
    const pathParts = parts.slice(0, -1); // Everything except the last part is the path
    const path = '/' + pathParts.join('/');
    
    // Find the route
    const routes = apiLoader.getRoutes();
    
    const route = routes.find(r => 
      r.method.toUpperCase() === method.toUpperCase() && 
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
  const host = process.env.EASY_MCP_SERVER_HOST || '0.0.0.0';
  const basePort = parseInt(process.env.EASY_MCP_SERVER_PORT) || 8887;

  // Display startup banner
  console.log('\n');
  console.log('  ╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('  ║                                                                                                      ║');
  console.log('  ║  🚀  STARTING EASY MCP SERVER...                                                                      ║');
  console.log('  ║                                                                                                      ║');
  console.log('  ╚══════════════════════════════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Start MCP server if enabled
  let mcpServer = null;
  let hotReloader = null;
  let envHotReloader = null;

  if (process.env.EASY_MCP_SERVER_MCP_ENABLED !== 'false') {
    try {
      // Use custom MCP base path if provided, otherwise use default
      // Since server runs from src directory, we need to go up one level to find mcp
      const mcpBasePath = process.env.EASY_MCP_SERVER_MCP_BASE_PATH || '../mcp';
      mcpServer = new DynamicAPIMCPServer(
        process.env.EASY_MCP_SERVER_MCP_HOST || '0.0.0.0',
        parseInt(process.env.EASY_MCP_SERVER_MCP_PORT) || 8888,
        {
          mcp: {
            basePath: mcpBasePath
          }
        }
      );
      
      // Start MCP server first
      mcpServer.run().then(() => {
        console.log('🤖  MCP Server initialized successfully');
        
        // Set the routes for MCP server after it's started
        mcpServer.setRoutes(loadedRoutes);
        
        // Initialize hot reloading after MCP server is ready
        hotReloader = new HotReloader(apiLoader, mcpServer, {
          autoInstall: true, // Enable auto package installation
          userCwd: process.cwd(),
          logger: console
        });
        hotReloader.startWatching();
        
        // Initialize .env hot reloader
        envHotReloader = new EnvHotReloader({
          debounceDelay: 1000,
          onReload: () => {
            console.log('🔄 Environment variables reloaded - MCP server will use latest configuration');
          },
          logger: console,
          mcpServer: mcpServer,
          apiLoader: apiLoader
        });
        envHotReloader.startWatching();
        
      }).catch(error => {
        console.warn('⚠️  MCP Server failed to start:', error.message);
      });
    } catch (error) {
      console.warn('⚠️  MCP Server not available:', error.message);
    }
  }

  // Start the main server on the specified port
  const server = app.listen(basePort, host, { family: 4 }, () => {
    console.log('\n');
    console.log('  ╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('  ║                                                                                                      ║');
    console.log('  ║                                    🚀 EASY MCP SERVER 🚀                                           ║');
    console.log('  ║                                                                                                      ║');
    console.log('  ╚══════════════════════════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('  🚀  SERVER STARTED SUCCESSFULLY');
    console.log('  ' + '═'.repeat(78));
    console.log(`  📍 Server Address: ${host}:${basePort}`);
    console.log(`  🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');
    console.log('  📡  API ENDPOINTS:');
    console.log(`     • Health Check:     http://localhost:${basePort}/health`);
    console.log(`     • API Information:  http://localhost:${basePort}/api-info`);
    console.log(`     • MCP Tools:        http://localhost:${basePort}/mcp/tools`);
    console.log('');
    console.log('  📚  DOCUMENTATION:');
    console.log(`     • OpenAPI JSON:     http://localhost:${basePort}/openapi.json`);
    console.log(`     • Swagger UI:       http://localhost:${basePort}/docs ✨`);
    console.log(`     • LLM Context:      http://localhost:${basePort}/LLM.txt`);
    console.log(`     • Agent Context:    http://localhost:${basePort}/Agent.md`);
    console.log('');
    if (mcpServer) {
      console.log('  🤖  MCP SERVER:');
      console.log(`     • WebSocket:       ws://${mcpServer.host}:${mcpServer.port}`);
      console.log(`     • Routes Loaded:   ${loadedRoutes.length} API endpoints`);
      console.log('');
    }
    console.log('  ⚡  FEATURES:');
    console.log('     • Auto-discovery of API endpoints');
    console.log('     • Real-time MCP tool generation');
    console.log('     • Automatic OpenAPI documentation');
    console.log('     • Hot reloading enabled');
    if (staticConfig.enabled && fs.existsSync(path.resolve(staticConfig.directory))) {
      console.log('     • Static file serving enabled');
    }
    console.log('');
    console.log('  🎯  Ready to serve your APIs!');
    console.log('  ' + '═'.repeat(78));
    console.log('');
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${basePort} is already in use. Please choose a different port or stop the process using that port.`);
      console.error('   You can set a different port using: EASY_MCP_SERVER_PORT=<port>');
      process.exit(1);
    } else {
      console.error(`❌ Server error: ${error.message}`);
      process.exit(1);
    }
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...');
    if (hotReloader) {
      hotReloader.stopWatching();
    }
    if (envHotReloader) {
      envHotReloader.stopWatching();
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
    if (envHotReloader) {
      envHotReloader.stopWatching();
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
// Version 0.6.14
