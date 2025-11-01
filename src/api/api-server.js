/**
 * DynamicAPIServer Class
 * 
 * A comprehensive, class-based REST API server wrapper around Express.js.
 * Provides dynamic API discovery, OpenAPI generation, and optional features
 * for enterprise-grade applications.
 * 
 * Features:
 * - Dynamic API loading from file system (convention-based routing)
 * - Automatic OpenAPI 3.0 specification generation
 * - Swagger UI documentation at /docs
 * - Hot reloading for development (automatically reloads APIs on file changes)
 * - Static file serving (configurable directory)
 * - CORS support (configurable)
 * - Enhanced health checks (with API status details)
 * - Optional LLM context files (/LLM.txt, /Agent.md)
 * - Optional admin endpoints (/admin/retry-initialization)
 * - Centralized error handling
 * - TypeScript support (auto-compiles .ts files)
 * 
 * @class DynamicAPIServer
 * @example
 * const { DynamicAPIServer } = require('easy-mcp-server');
 * const server = new DynamicAPIServer({
 *   port: 8887,
 *   apiPath: './api',
 *   staticDirectory: './public',
 *   enhancedHealth: true,
 *   llmContextFiles: true,
 *   adminEndpoints: true
 * });
 * await server.start();
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Import core modules
const APILoader = require('../utils/loaders/api-loader');
const OpenAPIGenerator = require('./openapi/openapi-generator');
const HotReloader = require('../utils/loaders/hot-reloader');

class DynamicAPIServer {
  constructor(options = {}) {
    this.port = options.port || process.env.EASY_MCP_SERVER_PORT || 8887;
    this.host = options.host || process.env.EASY_MCP_SERVER_HOST || '0.0.0.0';
    this.cors = options.cors || {};
    this.apiPath = options.apiPath || this._resolveApiPath();
    this.hotReload = options.hotReload !== false;
    this.staticDirectory = options.staticDirectory || process.env.EASY_MCP_SERVER_STATIC_DIRECTORY || null;
    this.defaultFile = options.defaultFile || process.env.EASY_MCP_SERVER_DEFAULT_FILE || 'index.html';
    this.enhancedHealth = options.enhancedHealth !== false;
    this.llmContextFiles = options.llmContextFiles !== false;
    this.adminEndpoints = options.adminEndpoints !== false;
    this.docsConfig = options.docsConfig || {};
    
    // Create Express app
    this.app = express();
    
    // Initialize middleware
    this._setupMiddleware();
    
    // Initialize static file serving if configured
    if (this.staticDirectory) {
      this._setupStaticFiles();
    }
    
    // Setup error handling
    this._setupErrorHandling();
    
    // Initialize core services
    this.apiLoader = new APILoader(this.app, this.apiPath);
    this.openapiGenerator = new OpenAPIGenerator(this.apiLoader);
    
    // Setup routes
    this._setupRoutes();
    
    // Initialize hot reloader if enabled
    if (this.hotReload && this.apiPath) {
      this.hotReloader = new HotReloader(this.apiPath, () => {
        this.apiLoader.reload();
      });
    }
    
    // Store server instance
    this.server = null;
  }
  
  _resolveApiPath() {
    const candidates = [];
    if (process.env.EASY_MCP_SERVER_API_PATH) {
      candidates.push(process.env.EASY_MCP_SERVER_API_PATH);
    }
    candidates.push(path.join(process.cwd(), 'example-project', 'api'));
    candidates.push(path.join(process.cwd(), 'api'));
    for (const c of candidates) {
      try {
        if (fs.existsSync(c)) return c;
      } catch (_) {
        // ignore
      }
    }
    return './api';
  }
  
  _setupMiddleware() {
    // CORS middleware
    this.app.use(cors({
      origin: this.cors.origin || process.env.EASY_MCP_SERVER_CORS_ORIGIN || '*',
      methods: this.cors.methods || (process.env.EASY_MCP_SERVER_CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE').split(','),
      credentials: this.cors.credentials || process.env.EASY_MCP_SERVER_CORS_CREDENTIALS === 'true'
    }));
    
    // Body parsing middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }
  
  _setupStaticFiles() {
    const dynamicStatic = { handler: null, dir: null, indexMountedFor: null };
    
    const ensureStaticMounted = () => {
      const envDir = this.staticDirectory || './public';
      const absDir = path.resolve(envDir);
      if (!fs.existsSync(absDir)) {
        dynamicStatic.handler = null;
        dynamicStatic.dir = null;
        return;
      }
      if (dynamicStatic.dir !== absDir) {
        console.log(`📁 Static files enabled: serving from ${absDir}`);
        dynamicStatic.handler = express.static(absDir, {
          index: false,
          dotfiles: 'ignore',
          etag: true,
          lastModified: true
        });
        console.log('✅ Static file middleware applied successfully');
        dynamicStatic.dir = absDir;
        dynamicStatic.indexMountedFor = null;
      }
      // Mount root index handler once per directory
      if (dynamicStatic.dir && dynamicStatic.indexMountedFor !== dynamicStatic.dir) {
        const indexPath = path.join(dynamicStatic.dir, this.defaultFile);
        if (fs.existsSync(indexPath)) {
          this.app.get('/', (req, res) => {
            res.sendFile(indexPath);
          });
          console.log(`🏠 Root route configured: serving ${this.defaultFile}`);
        }
        dynamicStatic.indexMountedFor = dynamicStatic.dir;
      }
    };
    
    // Attach dynamic static file handler
    this.app.use((req, res, next) => {
      try {
        ensureStaticMounted();
      } catch (_) {
        // noop
      }
      if (dynamicStatic.handler) {
        return dynamicStatic.handler(req, res, next);
      }
      return next();
    });
    
    // Initial mount attempt
    try {
      ensureStaticMounted();
    } catch (_) {
      // noop
    }
  }
  
  _setupErrorHandling() {
    // Centralized Express error handler to prevent crashes
    this.app.use((err, req, res, next) => {
      try {
        console.error('❌ Express error handler caught error:', err);
      } catch (_) {
        // no-op
      }
      if (res.headersSent) return next(err);
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: err?.message || 'Unknown error' 
      });
    });
  }
  
  _setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      if (this.enhancedHealth) {
        const routes = this.apiLoader.getRoutes();
        const errors = this.apiLoader.getErrors();
        
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
          environment: 'development',
          version: '1.0.0',
          apis: {
            total: totalAPIs,
            healthy: healthyAPIs,
            failed: failedAPIs,
            details: apiStatus
          },
          errors: errors.length > 0 ? errors : null
        });
      } else {
        res.json({
          status: 'OK',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: 'development',
          version: '1.0.0'
        });
      }
    });
    
    // API info endpoint
    this.app.get('/api-info', (req, res) => {
      const routes = this.apiLoader.getRoutes();
      const errors = this.apiLoader.getErrors();
      const validationIssues = this.apiLoader.validateRoutes();
      
      res.json({
        message: 'Dynamic API Framework',
        totalRoutes: routes.length,
        routes: routes,
        errors: errors,
        validationIssues: validationIssues,
        timestamp: new Date().toISOString(),
        environment: 'development'
      });
    });
    
    // OpenAPI specification endpoint
    this.app.get('/openapi.json', (req, res) => {
      try {
        const spec = this.openapiGenerator.generateSpec();
        res.json(spec);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: `Failed to generate OpenAPI spec: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Swagger UI endpoint
    this.app.get('/docs', (req, res) => {
      const config = {
        docExpansion: this.docsConfig.docExpansion || 'list',
        defaultModelsExpandDepth: this.docsConfig.defaultModelsExpandDepth || 1,
        defaultModelExpandDepth: this.docsConfig.defaultModelExpandDepth || 1,
        tryItOutEnabled: this.docsConfig.tryItOutEnabled !== false,
        requestInterceptor: this.docsConfig.requestInterceptor,
        responseInterceptor: this.docsConfig.responseInterceptor
      };
      
      // Build interceptor code strings
      const requestInterceptorCode = config.requestInterceptor 
        ? `,\n                requestInterceptor: ${config.requestInterceptor.toString()}`
        : '';
      const responseInterceptorCode = config.responseInterceptor
        ? `,\n                responseInterceptor: ${config.responseInterceptor.toString()}`
        : '';
      
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
            const uiConfig = {
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
                docExpansion: ${JSON.stringify(config.docExpansion)},
                defaultModelsExpandDepth: ${config.defaultModelsExpandDepth},
                defaultModelExpandDepth: ${config.defaultModelExpandDepth},
                tryItOutEnabled: ${config.tryItOutEnabled}${requestInterceptorCode}${responseInterceptorCode}
            };
            const ui = SwaggerUIBundle(uiConfig);
        };
    </script>
</body>
</html>`;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(swaggerHtml);
    });
    
    // LLM context files endpoints (optional)
    if (this.llmContextFiles) {
      this._setupLLMContextFiles();
    }
    
    // Admin endpoints (optional)
    if (this.adminEndpoints) {
      this._setupAdminEndpoints();
    }
  }
  
  async start() {
    return new Promise((resolve, reject) => {
      try {
        // Load APIs before starting the server
        this.apiLoader.loadAPIs();
        
        this.server = this.app.listen(this.port, this.host, { family: 4 }, () => {
          console.log(`🚀 Easy MCP Server running on ${this.host}:${this.port}`);
          console.log(`📚 API Documentation: http://localhost:${this.port}/docs`);
          console.log(`🔍 Health Check: http://localhost:${this.port}/health`);
          resolve();
        });
        
        this.server.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
  
  // Getter for the Express app
  get expressApp() {
    return this.app;
  }
  
  // Method to reload APIs
  reload() {
    if (this.apiLoader) {
      this.apiLoader.reload();
    }
  }
  
  // Get API loader for external access
  getAPILoader() {
    return this.apiLoader;
  }
  
  // Get OpenAPI generator for external access
  getOpenAPIGenerator() {
    return this.openapiGenerator;
  }
  
  // Add custom route (for extensions)
  addRoute(method, path, handler) {
    this.app[method.toLowerCase()](path, handler);
  }
  
  // Add middleware (for extensions)
  addMiddleware(middleware) {
    this.app.use(middleware);
  }
  
  _setupLLMContextFiles() {
    // LLM.txt endpoint for AI model context
    this.app.get('/LLM.txt', (req, res) => {
      try {
        const llmPath = path.join(process.cwd(), 'LLM.txt');
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
    this.app.get('/Agent.md', (req, res) => {
      try {
        const agentPath = path.join(process.cwd(), 'Agent.md');
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
  }
  
  _setupAdminEndpoints() {
    // API retry endpoint for failed initializations
    this.app.post('/admin/retry-initialization', async (req, res) => {
      try {
        const { api } = req.body;
        const routes = this.apiLoader.getRoutes();
        
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
  }
}

module.exports = DynamicAPIServer;
