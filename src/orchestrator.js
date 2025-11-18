/**
 * Server Orchestrator
 * Coordinates the API server (DynamicAPIServer) and MCP server (DynamicAPIMCPServer)
 * to provide a unified, full-featured application server.
 */
require('dotenv').config();
// Enable TypeScript API loading (compile TS only, ignore JS)
const path = require('path');
const fs = require('fs');
try {
  const runtimeConfigPath = path.resolve(__dirname, '..', 'tsconfig.runtime.json');
  const configExists = fs.existsSync(runtimeConfigPath);
  
  // Compiler options to use (either from file or inline)
  const compilerOptions = { 
    allowJs: false, 
    module: 'commonjs', 
    target: 'ES2020',
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    typeRoots: [],
    types: [],
    // Disable type checking entirely
    checkJs: false,
    noImplicitAny: false,
    strict: false,
    // Prevent TypeScript from resolving types across files
    isolatedModules: true
  };
  
  // Register ts-node with project config if available, otherwise use inline options
  const tsNodeConfig = {
    transpileOnly: true,
    compilerOptions: compilerOptions,
    skipProject: !configExists // Skip project lookup if config file doesn't exist
  };
  
  if (configExists) {
    tsNodeConfig.project = runtimeConfigPath;
  } else if (process.env.NODE_ENV !== 'test') {
    // Only warn in non-test environments
    console.warn(`⚠️  tsconfig.runtime.json not found at ${runtimeConfigPath}, using inline compiler options`);
  }
  
  require('ts-node').register(tsNodeConfig);
} catch (err) { 
  // Log the error for debugging but don't fail
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  ts-node registration failed:', err.message);
  }
}
// Import core modules
const DynamicAPIServer = require(path.join(__dirname, 'api', 'api-server'));
const DynamicAPIMCPServer = require(path.join(__dirname, 'mcp'));
const HotReloader = require(path.join(__dirname, 'utils', 'loaders', 'hot-reloader'));
const EnvHotReloader = require(path.join(__dirname, 'utils', 'loaders', 'env-hot-reloader'));
const MCPBridgeReloader = require(path.join(__dirname, 'utils', 'loaders', 'mcp-bridge-reloader'));

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

// Initialize DynamicAPIServer with enhanced features
const apiServer = new DynamicAPIServer({
  port: parseInt(process.env.EASY_MCP_SERVER_PORT) || 8887,
  host: process.env.EASY_MCP_SERVER_HOST || '0.0.0.0',
  staticDirectory: process.env.EASY_MCP_SERVER_STATIC_DIRECTORY || null,
  defaultFile: process.env.EASY_MCP_SERVER_DEFAULT_FILE || 'index.html',
  enhancedHealth: true, // Enable enhanced health check
  llmContextFiles: true, // Enable LLM.txt and Agent.md endpoints
  adminEndpoints: true, // Enable /admin/retry-initialization
  hotReload: true,
  docsConfig: {
    // Enhanced Swagger UI configuration
    docExpansion: 'list',
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
  }
});

// Get Express app for custom routes
const app = apiServer.expressApp;

// Get API loader and OpenAPI generator for later use
const apiLoader = apiServer.getAPILoader();
const openapiGenerator = apiServer.getOpenAPIGenerator();

// Initialize bridge reloader (but don't start watching yet)
// We'll only start loading bridges if NOT in STDIO mode (checked in startServer)
const bridgeReloader = new MCPBridgeReloader({
  root: process.cwd(),
  logger: console,
  configFile: process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH || 'mcp-bridge.json'
});

// Note: /health, /api-info, /openapi.json, /docs, /LLM.txt, /Agent.md, and /admin/* endpoints 
// are provided by DynamicAPIServer when enabled via options

// MCP and bridge-specific endpoints below (not in DynamicAPIServer)


// MCP (Model Context Protocol) endpoints
app.get('/mcp/tools', (req, res) => {
  try {
    const routes = apiLoader.getRoutes();
    const tools = routes.map(route => {
      const proc = route.processorInstance;
      let openApi = proc?.openApi;
      // Fallback to generated OpenAPI if missing/incomplete
      try {
        const needsFallback = !openApi || (!openApi.requestBody && !Array.isArray(openApi.parameters));
        if (needsFallback) {
          const { apiSpecTs } = require('./api/openapi/openapi-helper');
          openApi = apiSpecTs(route.filePath);
        }
      } catch (_) { /* ignore */ }
      const tool = {
        name: `api_${route.path.replace(/\//g, '_')}_${route.method.toLowerCase()}`,
        description: proc?.mcpDescription || openApi?.description || proc?.description || `Execute ${route.method} request to ${route.path}`,
        method: route.method,
        path: route.path,
        processor: route.processor
      };
      // Build inputSchema similar to MCP server for convenience
      const inputSchema = {
        type: 'object',
        properties: {
          body: { type: 'object', description: 'Request body' },
          query: { type: 'object', description: 'Query parameters' },
          headers: { type: 'object', description: 'Request headers' },
          path: { type: 'object', description: 'Path parameters' }
        }
      };
      if (openApi?.requestBody?.content?.['application/json']?.schema) {
        inputSchema.properties.body = {
          ...inputSchema.properties.body,
          ...openApi.requestBody.content['application/json'].schema
        };
      }
      if (Array.isArray(openApi?.parameters) && openApi.parameters.length > 0) {
        const queryProps = {}; const queryRequired = [];
        const headerProps = {}; const headerRequired = [];
        const pathProps = {}; const pathRequired = [];
        for (const p of openApi.parameters) {
          if (!p || !p.name || !p.in) continue;
          if (p.in === 'query') {
            queryProps[p.name] = { ...(p.schema || {}), description: p.description || (p.schema && p.schema.description) };
            if (p.required) queryRequired.push(p.name);
          } else if (p.in === 'header') {
            headerProps[p.name] = { ...(p.schema || {}), description: p.description || (p.schema && p.schema.description) };
            if (p.required) headerRequired.push(p.name);
          } else if (p.in === 'path') {
            pathProps[p.name] = { ...(p.schema || {}), description: p.description || (p.schema && p.schema.description) };
            pathRequired.push(p.name);
          }
        }
        if (Object.keys(queryProps).length > 0) {
          inputSchema.properties.query = { type: 'object', properties: queryProps };
          if (queryRequired.length > 0) inputSchema.properties.query.required = queryRequired;
        }
        if (Object.keys(headerProps).length > 0) {
          inputSchema.properties.headers = { type: 'object', properties: headerProps };
          if (headerRequired.length > 0) inputSchema.properties.headers.required = headerRequired;
        }
        if (Object.keys(pathProps).length > 0) {
          inputSchema.properties.path = { type: 'object', properties: pathProps, required: pathRequired };
        }
      }
      // Fallback: derive path params from route.path if none provided
      if (!openApi?.parameters || !openApi.parameters.some(p => p.in === 'path')) {
        const matches = route.path.match(/:([A-Za-z0-9_]+)/g) || [];
        if (matches.length) {
          const props = {}; const reqd = [];
          for (const m of matches) {
            const name = m.slice(1);
            props[name] = { type: 'string', description: `${name} parameter` };
            reqd.push(name);
          }
          inputSchema.properties.path = { type: 'object', properties: props, required: reqd };
        }
      }
      tool.inputSchema = inputSchema;
      tool.responseSchema = openApi?.responses?.['200']?.content?.['application/json']?.schema || null;
      return tool;
    });
    
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
    // Parse the tool name to get method and path (format: api_[path]_[http_method])
    if (!toolName.startsWith('api_')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tool name format. Expected: api_[path]_[method]',
        timestamp: new Date().toISOString()
      });
    }
    
    const pathAndMethod = toolName.substring(4); // Remove 'api_' prefix
    const lastUnderscoreIndex = pathAndMethod.lastIndexOf('_');
    const method = pathAndMethod.substring(lastUnderscoreIndex + 1); // Everything after the last underscore is the method
    const path = pathAndMethod.substring(0, lastUnderscoreIndex).replace(/_/g, '/'); // Convert underscores back to slashes for the path
    
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

// Simple HTTP Bridge endpoints
app.get('/bridge/list-tools', async (req, res) => {
  try {
    const bridges = bridgeReloader.ensureBridges();
    const results = {};
    const promises = [];
    for (const [name, bridge] of bridges.entries()) {
      promises.push(
        bridge.rpcRequest('tools/list', {}).then((r) => { results[name] = r; }).catch((e) => { results[name] = { error: e.message }; })
      );
    }
    await Promise.all(promises);
    res.json({ servers: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/bridge/call-tool', async (req, res) => {
  const { toolName, args, server } = req.body || {};
  if (!toolName) return res.status(400).json({ error: 'toolName required' });
  try {
    const bridges = bridgeReloader.ensureBridges();
    if (server) {
      const bridge = bridges.get(server);
      if (!bridge) return res.status(404).json({ error: `server not found: ${server}` });
      const result = await bridge.rpcRequest('tools/call', { name: toolName, arguments: args || {} });
      return res.json(result);
    }
    // If no server specified, try all servers and aggregate results
    const results = {};
    const promises = [];
    for (const [name, bridge] of bridges.entries()) {
      promises.push(
        bridge.rpcRequest('tools/call', { name: toolName, arguments: args || {} })
          .then((r) => { results[name] = r; })
          .catch((e) => { results[name] = { error: e.message }; })
      );
    }
    await Promise.all(promises);
    res.json({ servers: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
async function startServer() {
  // Detect STDIO mode: explicit flag takes precedence, otherwise auto-detect by port presence
  // If bridge mode is detected (mcp-bridge.json exists), default to STDIO mode
  const explicitStdioMode = process.env.EASY_MCP_SERVER_STDIO_MODE === 'true';
  const explicitHttpMode = process.env.EASY_MCP_SERVER_STDIO_MODE === 'false';
  const hasMcpPort = process.env.EASY_MCP_SERVER_MCP_PORT && process.env.EASY_MCP_SERVER_MCP_PORT.trim() !== '';
  
  // Check if bridge mode is active (mcp-bridge.json exists)
  let bridgeConfigPath = process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH;
  if (!bridgeConfigPath) {
    const cwd = process.cwd();
    const defaultBridgeConfig = path.join(cwd, 'mcp-bridge.json');
    if (fs.existsSync(defaultBridgeConfig)) {
      bridgeConfigPath = defaultBridgeConfig;
    }
  }
  const hasBridgeConfig = bridgeConfigPath && fs.existsSync(bridgeConfigPath);
  
  // Determine STDIO mode:
  // 1. Explicit flag takes precedence
  // 2. If bridge mode is active and no port is set, default to STDIO
  // 3. Otherwise, check if port is set
  let isStdioMode;
  if (explicitStdioMode) {
    isStdioMode = true;
  } else if (explicitHttpMode && hasMcpPort) {
    isStdioMode = false;
  } else if (hasBridgeConfig && !hasMcpPort) {
    // Bridge mode: default to STDIO unless port is explicitly set
    isStdioMode = true;
  } else {
    isStdioMode = !hasMcpPort;
  }

  // If in STDIO mode, explicitly set the env var for child processes
  if (isStdioMode) {
    process.env.EASY_MCP_SERVER_STDIO_MODE = 'true';
  }

  // Start bridge watching ONLY if not in STDIO mode
  // This prevents circular dependencies when running as a bridge
  if (!isStdioMode) {
    // Avoid file watchers in Jest to prevent cross-test interference
    if (!process.env.JEST_WORKER_ID) {
      bridgeReloader.startWatching();
    }
  }

  // Only display startup banner and start HTTP server if not in STDIO mode
  if (!isStdioMode) {
    // Display startup banner
    console.log('\n');
    console.log('  ╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('  ║                                                                                                      ║');
    console.log('  ║  🚀  STARTING EASY MCP SERVER...                                                                      ║');
    console.log('  ║                                                                                                      ║');
    console.log('  ╚══════════════════════════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');

    // Start REST API server using DynamicAPIServer
    try {
      await apiServer.start();
      // Verify server is actually listening
      if (!apiServer.server || !apiServer.server.listening) {
        console.error('❌ API server failed to start listening');
        throw new Error('API server did not start listening');
      }
    } catch (error) {
      console.error('❌ Failed to start API server:', error.message);
      throw error;
    }
  }

  // Get loaded routes and errors for display
  const loadedRoutes = apiLoader.getRoutes();
  const errors = apiLoader.getErrors();

  // Display error summary if there are any (only in non-STDIO mode)
  if (errors.length > 0 && !isStdioMode) {
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
    
    // Show detailed error information for each failed file
    if (errors.length > 0 && errors.length <= 10) {
      console.log('\n📋 Failed Files:');
      errors.forEach((error, index) => {
        const file = typeof error === 'object' ? error.file : 'unknown';
        const errorMsg = typeof error === 'object' ? error.error : String(error);
        const errorType = typeof error === 'object' ? error.type : 'unknown';
        const relativePath = file && file.startsWith(process.cwd()) 
          ? path.relative(process.cwd(), file) 
          : file;
        console.log(`   ${index + 1}. ${relativePath || 'unknown'}`);
        console.log(`      Type: ${errorType}`);
        console.log(`      Error: ${errorMsg.substring(0, 100)}${errorMsg.length > 100 ? '...' : ''}`);
      });
    } else if (errors.length > 10) {
      console.log(`\n📋 Showing first 10 of ${errors.length} failed files:`);
      errors.slice(0, 10).forEach((error, index) => {
        const file = typeof error === 'object' ? error.file : 'unknown';
        const errorType = typeof error === 'object' ? error.type : 'unknown';
        const relativePath = file && file.startsWith(process.cwd()) 
          ? path.relative(process.cwd(), file) 
          : file;
        console.log(`   ${index + 1}. ${relativePath || 'unknown'} (${errorType})`);
      });
      console.log(`   ... and ${errors.length - 10} more. Check /health endpoint for full details.`);
    }
    
    console.log('\n💡 Server will continue running with available APIs.');
    console.log('   Check /health endpoint for detailed API status.');
    console.log('   Fix missing dependencies to enable failed APIs.\n');
  }

  // Start MCP server if enabled
  let mcpServer = null;
  let hotReloader = null;
  let envHotReloader = null;

  if (process.env.EASY_MCP_SERVER_MCP_ENABLED !== 'false') {
    try {
      // Use custom MCP base path if provided, otherwise use default
      const mcpBasePath = process.env.EASY_MCP_SERVER_MCP_BASE_PATH || path.join(process.cwd(), 'mcp');

      // In STDIO mode, use STDIO handler; otherwise use HTTP/WebSocket
      if (isStdioMode) {
        // Create MCP server with STDIO transport only
        // In STDIO mode (running as a bridge), do NOT load bridges to prevent circular dependencies
        mcpServer = new DynamicAPIMCPServer(
          null, // no host in STDIO mode
          null, // no port in STDIO mode
          {
            mcp: {
              basePath: mcpBasePath
            },
            stdioMode: true, // Enable STDIO mode
            // Do NOT provide bridgeReloader in STDIO mode to prevent circular bridge loading
            // Add quiet mode option
            quiet: process.env.EASY_MCP_SERVER_QUIET === 'true'
          }
        );
      } else {
        // Create MCP server with HTTP/WebSocket transport
        mcpServer = new DynamicAPIMCPServer(
          process.env.EASY_MCP_SERVER_MCP_HOST || '0.0.0.0',
          parseInt(process.env.EASY_MCP_SERVER_MCP_PORT) || 8888,
          {
            mcp: {
              basePath: mcpBasePath
            },
            // Provide bridge reloader so MCP tools/list can include bridge tools
            bridgeReloader,
            // Add quiet mode option
            quiet: process.env.EASY_MCP_SERVER_QUIET === 'true'
          }
        );
      }
      
      // Set the routes for MCP server before starting (so it's available immediately)
      mcpServer.setRoutes(loadedRoutes);
      if (!isStdioMode) {
        console.log(`📡 Registered ${loadedRoutes.length} API routes with MCP server`);
      }
      
      // Start MCP server and await it to ensure it's fully started before function completes
      try {
        await mcpServer.run();
        // Verify MCP server is actually listening (if not in STDIO mode)
        if (!isStdioMode && mcpServer.server && !mcpServer.server.listening) {
          console.error('❌ MCP server failed to start listening');
          throw new Error('MCP server did not start listening');
        }
        if (!isStdioMode) {
          console.log('🤖  MCP Server initialized successfully');
        }
        
        // Update routes again after server is fully started (in case of hot reload)
        mcpServer.setRoutes(apiLoader.getRoutes());
        
        // Initialize hot reloading after MCP server is ready (skip in STDIO mode)
        if (!isStdioMode) {
          hotReloader = new HotReloader(apiLoader, mcpServer, {
            autoInstall: true, // Enable auto package installation
            userCwd: process.cwd(),
            logger: console
          });
          hotReloader.startWatching();
        }
        
        // Initialize .env hot reloader (skip in STDIO mode)
        if (!isStdioMode) {
          envHotReloader = new EnvHotReloader({
            debounceDelay: 1000,
            onReload: () => {
              console.log('🔄 Environment variables reloaded - MCP server will use latest configuration');
            },
            logger: console,
            mcpServer: mcpServer,
            apiLoader: apiLoader,
            bridgeReloader: bridgeReloader
          });
          envHotReloader.startWatching();
        }
      } catch (error) {
        console.warn('⚠️  MCP Server failed to start:', error.message);
      }
    } catch (error) {
      console.warn('⚠️  MCP Server not available:', error.message);
    }
  }

  // Display server startup information (skip in STDIO mode)
  if (!isStdioMode) {
    const host = process.env.EASY_MCP_SERVER_HOST || '0.0.0.0';
    const basePort = parseInt(process.env.EASY_MCP_SERVER_PORT) || 8887;
    const staticPath = process.env.EASY_MCP_SERVER_STATIC_DIRECTORY || './public';
    
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
    console.log('  🌍 Environment: development');
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
    if (fs.existsSync(staticPath)) {
      console.log('     • Static file serving enabled');
    }
    console.log('');
    console.log('  🎯  Ready to serve your APIs!');
    console.log('  ' + '═'.repeat(78));
    console.log('');
  }

  // Graceful shutdown handlers
  const shutdown = async () => {
    if (!isStdioMode) {
      console.log('\n🛑 Shutting down servers...');
    }
    if (hotReloader) {
      hotReloader.stopWatching();
    }
    if (envHotReloader) {
      envHotReloader.stopWatching();
    }
    if (mcpServer) {
      await mcpServer.stop();
    }
    if (apiServer) {
      await apiServer.stop();
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Only start server if this file is run directly
if (require.main === module) {
  startServer().catch((error) => {
    console.error('❌ Fatal error starting server:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
}

// Export functions for external use
module.exports = {
  app,
  apiLoader,
  openapiGenerator,
  mcpServer: null, // Will be set when server starts
  hotReloader: null, // Will be set when server starts
  getLoadedRoutes: () => apiLoader.getRoutes(),
  startServer // Export the startServer function
};
// Version 0.6.14
