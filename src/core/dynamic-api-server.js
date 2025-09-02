/**
 * DynamicAPIServer Class
 * 
 * A class-based wrapper around the Express server with MCP integration
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import core modules
const APILoader = require('./api-loader');
const OpenAPIGenerator = require('./openapi-generator');
const DynamicAPIMCPServer = require('../mcp/mcp-server');
const HotReloader = require('../utils/hot-reloader');

class DynamicAPIServer {
  constructor(options = {}) {
    this.port = options.port || process.env.PORT || 3000;
    this.cors = options.cors || {};
    this.apiPath = options.apiPath || './api';
    this.hotReload = options.hotReload !== false;
    
    // Create Express app
    this.app = express();
    
    // Initialize middleware
    this._setupMiddleware();
    
    // Initialize core services
    this.apiLoader = new APILoader(this.app, this.apiPath);
    this.openapiGenerator = new OpenAPIGenerator(this.apiLoader);
    
    // Setup routes
    this._setupRoutes();
    
    // Initialize hot reloader if enabled
    if (this.hotReload) {
      this.hotReloader = new HotReloader(this.apiPath, () => {
        this.apiLoader.reload();
      });
    }
    
    // Store server instance
    this.server = null;
  }
  
  _setupMiddleware() {
    // CORS middleware
    this.app.use(cors({
      origin: this.cors.origin || process.env.API_CORS_ORIGIN || '*',
      methods: this.cors.methods || (process.env.API_CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE').split(','),
      credentials: this.cors.credentials || process.env.API_CORS_CREDENTIALS === 'true'
    }));
    
    // Body parsing middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }
  
  _setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
      });
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
        environment: process.env.NODE_ENV || 'development'
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
                layout: "StandaloneLayout"
            });
        };
    </script>
</body>
</html>`;
      
      res.send(swaggerHtml);
    });
  }
  
  async start() {
    return new Promise((resolve, reject) => {
      try {
        // Load APIs before starting the server
        this.apiLoader.loadAPIs();
        
        this.server = this.app.listen(this.port, () => {
          console.log(`🚀 Easy MCP Server running on port ${this.port}`);
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
}

module.exports = DynamicAPIServer;
