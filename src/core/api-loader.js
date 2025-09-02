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
    this.errors = [];
    
    this.scanDirectory(apiDir);
    this.attachProcessorsToRoutes();
    
    if (this.errors.length > 0) {
      console.log(`⚠️  ${this.errors.length} API loading errors encountered`);
    }
    
    return this.routes;
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
        } else if (stat.isFile() && item.endsWith('.js')) {
          // Found an API file
          this.loadAPIFile(fullPath, basePath, item);
        }
      });
    } catch (error) {
      this.errors.push(`Failed to scan directory ${dir}: ${error.message}`);
    }
  }

  /**
   * Load a single API file and register the route
   */
  loadAPIFile(filePath, basePath, fileName) {
    const httpMethod = path.basename(fileName, '.js').toUpperCase();
    const routePath = path.join(basePath, path.dirname(fileName));
    const normalizedPath = '/' + routePath.replace(/\\/g, '/');
    
    // Validate HTTP method
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    if (!validMethods.includes(httpMethod)) {
      this.errors.push(`Invalid HTTP method in filename: ${fileName}`);
      return;
    }
    
    try {
      const ProcessorClass = require(filePath);
      
      // Validate the class
      if (typeof ProcessorClass !== 'function') {
        this.errors.push(`Invalid processor class in ${filePath}: must be a class`);
        return;
      }
      
      const processor = new ProcessorClass();
      
      if (typeof processor.process === 'function') {
        // Register the route dynamically
        this.app[httpMethod.toLowerCase()](normalizedPath, (req, res) => {
          processor.process(req, res);
        });
        
        this.routes.push({
          method: httpMethod,
          path: normalizedPath,
          processor: processor.constructor.name,
          filePath: filePath
        });
        
        // Store processor instance for OpenAPI generation
        const key = `${httpMethod.toLowerCase()}:${normalizedPath}`;
        this.processors.set(key, processor);
        
        console.log(`✅ Loaded API: ${httpMethod} ${normalizedPath}`);
      } else {
        this.errors.push(`Processor class in ${filePath} must have a 'process' method`);
      }
    } catch (error) {
      this.errors.push(`Error loading API from ${filePath}: ${error.message}`);
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
    
    return this.loadAPIs();
  }
}

module.exports = APILoader;
