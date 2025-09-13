require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import core modules
const path = require('path');
const APILoader = require(path.join(__dirname, 'core', 'api-loader'));
const OpenAPIGenerator = require(path.join(__dirname, 'core', 'openapi-generator'));
const DynamicAPIMCPServer = require(path.join(__dirname, 'mcp', 'mcp-server'));
const HotReloader = require(path.join(__dirname, 'utils', 'hot-reloader'));

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
const apiLoader = new APILoader(app, process.env.API_PATH || null);
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

// Load all APIs
const loadedRoutes = apiLoader.loadAPIs();

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
  const host = process.env.SERVER_HOST || '0.0.0.0';
  const port = process.env.SERVER_PORT || 3000;

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

  if (process.env.MCP_ENABLED !== 'false') {
    try {
      // Use custom MCP base path if provided, otherwise use default
      const mcpBasePath = process.env.MCP_BASE_PATH || './mcp';
      mcpServer = new DynamicAPIMCPServer(
        process.env.MCP_HOST || '0.0.0.0',
        process.env.MCP_PORT || 3001,
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
  app.listen(port, host, { family: 4 }, () => {
    console.log('\n');
    console.log('  ╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('  ║                                                                                                      ║');
    console.log('  ║                                    🚀 EASY MCP SERVER 🚀                                           ║');
    console.log('  ║                                                                                                      ║');
    console.log('  ╚══════════════════════════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('  🚀  SERVER STARTED SUCCESSFULLY');
    console.log('  ' + '═'.repeat(78));
    console.log(`  📍 Server Address: ${host}:${port}`);
    console.log(`  🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');
    console.log('  📡  API ENDPOINTS:');
    console.log(`     • Health Check:     http://localhost:${port}/health`);
    console.log(`     • API Information:  http://localhost:${port}/api-info`);
    console.log(`     • MCP Tools:        http://localhost:${port}/mcp/tools`);
    console.log('');
    console.log('  📚  DOCUMENTATION:');
    console.log(`     • OpenAPI JSON:     http://localhost:${port}/openapi.json`);
    console.log(`     • Swagger UI:       http://localhost:${port}/docs ✨`);
    console.log(`     • LLM Context:      http://localhost:${port}/LLM.txt`);
    console.log(`     • Agent Context:    http://localhost:${port}/Agent.md`);
    console.log('');
    if (mcpServer) {
      console.log('  🤖  MCP SERVER:');
      console.log(`     • WebSocket:       ws://${process.env.MCP_HOST || '0.0.0.0'}:${process.env.MCP_PORT || 3001}`);
      console.log(`     • Routes Loaded:   ${loadedRoutes.length} API endpoints`);
      console.log('');
    }
    console.log('  ⚡  FEATURES:');
    console.log('     • Auto-discovery of API endpoints');
    console.log('     • Real-time MCP tool generation');
    console.log('     • Automatic OpenAPI documentation');
    console.log('     • Hot reloading enabled');
    console.log('');
    console.log('  🎯  Ready to serve your APIs!');
    console.log('  ' + '═'.repeat(78));
    console.log('');
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
// Version 0.6.14
