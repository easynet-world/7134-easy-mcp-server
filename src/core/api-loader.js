/**
 * Core API Loader
 * Handles dynamic API discovery and route registration
 */

const fs = require('fs');
const path = require('path');

class APILoader {
  constructor(app, apiPath = null) {
    this.app = app;
    this.apiPath = apiPath || path.join(process.cwd(), 'api');
    this.routes = [];
    this.processors = new Map();
    this.errors = [];
    this.middleware = new Map(); // Store loaded middleware
    this.middlewareLayers = new Map(); // Track middleware layers by file path
  }

  /**
   * Load all APIs from the api/ directory
   */
  loadAPIs() {
    const apiDir = this.apiPath;
    
    console.log(`🔍 Loading APIs from: ${apiDir}`);
    
    if (!fs.existsSync(apiDir)) {
      console.log(`⚠️  No api/ directory found at: ${apiDir}`);
      return [];
    }

    this.routes = [];
    this.processors.clear();
    this.middleware.clear();
    this.middlewareLayers.clear();
    this.errors = [];
    
    // Load middleware first
    this.loadMiddleware(apiDir);
    
    // Then load APIs
    this.scanDirectory(apiDir);
    this.attachProcessorsToRoutes();
    
    if (this.errors.length > 0) {
      console.log(`⚠️  ${this.errors.length} API loading errors encountered`);
    }
    
    return this.routes;
  }

  /**
   * Load middleware from middleware.js files
   */
  loadMiddleware(apiDir) {
    try {
      this.scanForMiddleware(apiDir);
    } catch (error) {
      this.errors.push(`Failed to load middleware: ${error.message}`);
    }
  }

  /**
   * Recursively scan for middleware.js files
   */
  scanForMiddleware(dir, basePath = '') {
    try {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Recursively scan subdirectories
          this.scanForMiddleware(fullPath, path.join(basePath, item));
        } else if (stat.isFile() && item === 'middleware.js') {
          // Found a middleware file
          this.loadMiddlewareFile(fullPath, basePath);
        }
      });
    } catch (error) {
      this.errors.push(`Failed to scan for middleware in ${dir}: ${error.message}`);
    }
  }

  /**
   * Load a single middleware file
   */
  loadMiddlewareFile(filePath, basePath) {
    try {
      const middlewareModule = require(path.resolve(filePath));
      const routePath = '/' + basePath.replace(/\\/g, '/');
      
      // Handle different middleware export formats
      if (typeof middlewareModule === 'function') {
        // Single middleware function
        this.app.use(routePath, middlewareModule);
        this.middleware.set(filePath, {
          type: 'function',
          path: routePath,
          middleware: middlewareModule,
          filePath: filePath
        });
        // Track the layer for cleanup
        this.trackMiddlewareLayer(filePath, routePath, [middlewareModule]);
        console.log(`✅ Loaded middleware: ${routePath} (function)`);
      } else if (Array.isArray(middlewareModule)) {
        // Array of middleware functions
        this.app.use(routePath, ...middlewareModule);
        this.middleware.set(filePath, {
          type: 'array',
          path: routePath,
          middleware: middlewareModule,
          filePath: filePath
        });
        // Track the layer for cleanup
        this.trackMiddlewareLayer(filePath, routePath, middlewareModule);
        console.log(`✅ Loaded middleware: ${routePath} (${middlewareModule.length} functions)`);
      } else if (middlewareModule && typeof middlewareModule === 'object') {
        // Object with middleware methods
        const middlewareFunctions = Object.values(middlewareModule).filter(fn => typeof fn === 'function');
        if (middlewareFunctions.length > 0) {
          this.app.use(routePath, ...middlewareFunctions);
          this.middleware.set(filePath, {
            type: 'object',
            path: routePath,
            middleware: middlewareFunctions,
            filePath: filePath
          });
          // Track the layer for cleanup
          this.trackMiddlewareLayer(filePath, routePath, middlewareFunctions);
          console.log(`✅ Loaded middleware: ${routePath} (${middlewareFunctions.length} functions from object)`);
        } else {
          this.errors.push(`No valid middleware functions found in ${filePath}`);
        }
      } else {
        this.errors.push(`Invalid middleware export in ${filePath}: must be function, array, or object`);
      }
    } catch (error) {
      this.errors.push(`Failed to load middleware from ${filePath}: ${error.message}`);
      console.error(`❌ Failed to load middleware from ${filePath}:`, error.message);
    }
  }

  /**
   * Recursively scan directory for API files
   */
  scanDirectory(dir, basePath = '') {
    try {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Recursively scan subdirectories
          this.scanDirectory(fullPath, path.join(basePath, item));
        } else if (stat.isFile() && item.endsWith('.js') && item !== 'middleware.js') {
          // Found an API file (exclude middleware.js)
          this.loadAPIFile(fullPath, basePath, item);
        }
      });
    } catch (error) {
      this.errors.push(`Failed to scan directory ${dir}: ${error.message}`);
    }
  }

  /**
   * Load a single API file and register the route with graceful initialization
   */
  loadAPIFile(filePath, basePath, fileName) {
    const httpMethod = path.basename(fileName, '.js').toUpperCase();
    const dirName = path.dirname(fileName);
    const routePath = dirName === '.' ? basePath : path.join(basePath, dirName);
    const normalizedPath = '/' + routePath.replace(/\\/g, '/');
    
    // Validate HTTP method
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    if (!validMethods.includes(httpMethod)) {
      this.errors.push(`Invalid HTTP method in filename: ${fileName}`);
      return;
    }
    
    try {
      const ProcessorClass = require(path.resolve(filePath));
      
      // Validate the class
      if (typeof ProcessorClass !== 'function') {
        this.errors.push(`Invalid processor class in ${filePath}: must be a class`);
        return;
      }
      
      const processor = new ProcessorClass();
      
      if (typeof processor.process === 'function') {
        // Register the route dynamically with graceful error handling
        this.app[httpMethod.toLowerCase()](normalizedPath, async (req, res) => {
          try {
            await processor.process(req, res);
          } catch (error) {
            console.error(`Error processing request to ${httpMethod} ${normalizedPath}:`, error.message);
            if (!res.headersSent) {
              res.status(500).json({
                success: false,
                error: 'Internal server error',
                details: error.message,
                timestamp: new Date().toISOString()
              });
            }
          }
        });
        
        this.routes.push({
          method: httpMethod,
          path: normalizedPath,
          processor: processor.constructor.name,
          filePath: filePath,
          processorInstance: processor
        });
        
        // Store processor instance for OpenAPI generation
        const key = `${httpMethod.toLowerCase()}:${normalizedPath}`;
        this.processors.set(key, processor);
        
        console.log(`✅ Loaded API: ${httpMethod} ${normalizedPath}`);
      } else {
        this.errors.push(`Processor class in ${filePath} must have a 'process' method`);
      }
    } catch (error) {
      // Enhanced error handling for different types of errors
      let errorMessage = error.message;
      let errorType = 'unknown';
      
      if (error.code === 'MODULE_NOT_FOUND') {
        errorType = 'missing_dependency';
        errorMessage = `Missing dependency: ${error.message}`;
      } else if (error.message.includes('Cannot find module')) {
        errorType = 'missing_module';
        errorMessage = `Missing module: ${error.message}`;
      } else if (error.message.includes('is not a constructor')) {
        errorType = 'invalid_constructor';
        errorMessage = `Invalid constructor: ${error.message}`;
      } else if (error.message.includes('Cannot read properties')) {
        errorType = 'property_error';
        errorMessage = `Property access error: ${error.message}`;
      }
      
      this.errors.push({
        file: filePath,
        error: errorMessage,
        type: errorType,
        timestamp: new Date().toISOString()
      });
      
      // Log the error with more context
      console.error(`❌ Failed to load API from ${filePath}:`);
      console.error(`   Error Type: ${errorType}`);
      console.error(`   Error Message: ${errorMessage}`);
      
      // Provide helpful suggestions based on error type
      if (errorType === 'missing_dependency' || errorType === 'missing_module') {
        console.error('   💡 Suggestion: Install missing dependencies with \'npm install <package-name>\'');
      } else if (errorType === 'invalid_constructor') {
        console.error('   💡 Suggestion: Check that the module exports a class constructor');
      }
    }
  }

  /**
   * Attach processor instances to routes for OpenAPI generation
   */
  attachProcessorsToRoutes() {
    this.routes.forEach(route => {
      const key = `${route.method.toLowerCase()}:${route.path}`;
      route.processorInstance = this.processors.get(key);
    });
  }

  /**
   * Get all loaded routes
   */
  getRoutes() {
    return [...this.routes];
  }

  /**
   * Validate all loaded routes
   */
  validateRoutes() {
    const issues = [];
    
    this.routes.forEach((route, index) => {
      if (!route.method || !route.path) {
        issues.push(`Route ${index}: Missing method or path`);
      }
      
      if (!route.processorInstance || typeof route.processorInstance.process !== 'function') {
        issues.push(`Route ${index}: Invalid processor instance`);
      }
    });
    
    return issues;
  }

  /**
   * Get all loading errors
   */
  getErrors() {
    return [...this.errors];
  }

  /**
   * Get all loaded middleware
   */
  getMiddleware() {
    return Array.from(this.middleware.values());
  }

  /**
   * Get middleware for a specific path
   */
  getMiddlewareForPath(path) {
    return Array.from(this.middleware.values()).filter(mw => mw.path === path);
  }

  /**
   * Get routes for MCP server
   */
  getRoutesForMCP() {
    return this.routes.map(route => ({
      method: route.method,
      path: route.path,
      processor: route.processor,
      processorInstance: route.processorInstance
    }));
  }

  /**
   * Clear cache for a specific file
   */
  clearCache(filePath) {
    try {
      delete require.cache[require.resolve(filePath)];
    } catch (error) {
      // File might not be cached or resolved
    }
  }

  /**
   * Reload all APIs (clear cache and reload)
   */
  reloadAPIs() {
    // Clear all cached modules
    Object.keys(require.cache).forEach(key => {
      if (key.includes('api/')) {
        delete require.cache[key];
      }
    });
    
    // Force middleware reload to ensure changes are applied
    this.forceMiddlewareReload();
    
    return this.loadAPIs();
  }

  /**
   * Track middleware layer for cleanup
   */
  trackMiddlewareLayer(filePath, routePath, middlewareFunctions) {
    if (!this.middlewareLayers.has(filePath)) {
      this.middlewareLayers.set(filePath, []);
    }
    
    // Store the current stack length before adding middleware
    const currentStackLength = this.app._router.stack.length;
    this.middlewareLayers.get(filePath).push({
      routePath,
      middlewareFunctions,
      stackLengthBefore: currentStackLength
    });
  }

  /**
   * Clear middleware from Express app
   */
  clearMiddlewareFromApp() {
    if (!this.app || !this.app._router || !this.app._router.stack) {
      return;
    }

    try {
      let totalRemoved = 0;
      
      // Clear middleware layers for each file
      for (const [, layers] of this.middlewareLayers) {
        for (const layer of layers) {
          // Remove middleware layers that were added for this file
          const stack = this.app._router.stack;
          const middlewareToRemove = [];
          
          // Find layers that match our middleware functions
          for (let i = 0; i < stack.length; i++) {
            const stackLayer = stack[i];
            if (stackLayer && stackLayer.handle) {
              // Check if this layer matches one of our middleware functions
              for (const middlewareFunc of layer.middlewareFunctions) {
                if (stackLayer.handle === middlewareFunc) {
                  middlewareToRemove.push(i);
                  break;
                }
              }
            }
          }
          
          // Remove middleware in reverse order to maintain indices
          for (let i = middlewareToRemove.length - 1; i >= 0; i--) {
            stack.splice(middlewareToRemove[i], 1);
            totalRemoved++;
          }
        }
      }
      
      // Clear the tracking map
      this.middlewareLayers.clear();
      
      console.log(`🧹 Cleared ${totalRemoved} middleware layers from Express app`);
    } catch (error) {
      console.warn('⚠️  Error clearing middleware from Express app:', error.message);
    }
  }

  /**
   * Force middleware reload by recreating the Express app middleware stack
   */
  forceMiddlewareReload() {
    if (!this.app) {
      return;
    }

    try {
      // Store current middleware that should be preserved
      const preservedMiddleware = [];
      const stack = this.app._router.stack || [];
      
      // Preserve core Express middleware (query, expressInit, etc.)
      for (const layer of stack) {
        if (layer && layer.name && (
          layer.name === 'query' ||
          layer.name === 'expressInit' ||
          layer.name === 'corsMiddleware' ||
          layer.name === 'jsonParser' ||
          layer.name === 'urlencodedParser' ||
          layer.name === 'serveStatic' ||
          layer.name === 'securityHeaders' ||
          layer.name.includes('bound dispatch') ||
          layer.name.includes('anonymous')
        )) {
          preservedMiddleware.push(layer);
        }
      }
      
      // Clear the entire stack
      this.app._router.stack = [];
      
      // Re-add preserved middleware
      for (const layer of preservedMiddleware) {
        this.app._router.stack.push(layer);
      }
      
      console.log(`🔄 Force reloaded middleware stack, preserved ${preservedMiddleware.length} core layers`);
    } catch (error) {
      console.warn('⚠️  Error force reloading middleware:', error.message);
    }
  }
}

module.exports = APILoader;
