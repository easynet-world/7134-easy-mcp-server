const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');
const config = require('../config/default');
const BaseProcessor = require('./BaseProcessor');

/**
 * DynamicAPILoader - Handles dynamic loading and registration of API endpoints
 */
class DynamicAPILoader {
  constructor(app, apiPath = null) {
    this.app = app;
    this.apiPath = apiPath || config.api.path;
    this.routes = new Map();
    this.openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Dynamic Open API',
        version: '1.0.0',
        description: 'Dynamically generated API endpoints'
      },
      paths: {},
      components: {
        schemas: {
          SuccessResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              timestamp: { type: 'string', format: 'date-time' }
            }
          },
          ErrorResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    };
    this.watcher = null;
  }

  /**
   * Initialize the API loader
   */
  async initialize() {
    try {
      await this.ensureApiDirectory();
      await this.loadAllAPIs();
      this.startFileWatcher();
      console.log('✅ Dynamic API Loader initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Dynamic API Loader:', error);
      throw error;
    }
  }

  /**
   * Ensure the API directory exists
   */
  async ensureApiDirectory() {
    try {
      await fs.access(this.apiPath);
    } catch (error) {
      await fs.mkdir(this.apiPath, { recursive: true });
      console.log(`📁 Created API directory: ${this.apiPath}`);
    }
  }

  /**
   * Load all APIs from the api directory
   */
  async loadAllAPIs() {
    try {
      const files = await this.scanApiDirectory();
      for (const file of files) {
        await this.loadAPIFromFile(file);
      }
      console.log(`📡 Loaded ${files.length} API files`);
    } catch (error) {
      console.error('Error loading APIs:', error);
    }
  }

  /**
   * Scan the API directory for all .js files
   */
  async scanApiDirectory() {
    const files = [];
    
    async function scanDir(dirPath, basePath = '') {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const relativePath = path.join(basePath, entry.name);
          
          if (entry.isDirectory()) {
            await scanDir(fullPath, relativePath);
          } else if (entry.isFile() && entry.name.endsWith('.js')) {
            files.push({
              fullPath: path.resolve(fullPath), // Make sure fullPath is absolute
              relativePath,
              filename: entry.name
            });
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${dirPath}:`, error);
      }
    }
    
    await scanDir(this.apiPath);
    console.log('🔍 Scanned files:', files.map(f => ({ fullPath: f.fullPath, relativePath: f.relativePath, filename: f.filename })));
    return files;
  }

  /**
   * Load a single API from a file
   */
  async loadAPIFromFile(fileInfo) {
    try {
      // Clear require cache
      if (require.cache[fileInfo.fullPath]) {
        delete require.cache[fileInfo.fullPath];
      }
      
      const module = require(fileInfo.fullPath);
      
      const ProcessorClass = this.findProcessorClass(module);
      if (!ProcessorClass) {
        console.warn(`⚠️  No valid processor class found in ${fileInfo.relativePath}`);
        return;
      }

      const processor = new ProcessorClass();
      const httpMethod = this.extractHttpMethod(fileInfo.filename);
      if (!httpMethod) {
        console.warn(`⚠️  Could not determine HTTP method from filename: ${fileInfo.filename}`);
        return;
      }

      const routePath = this.generateRoutePath(fileInfo.relativePath, fileInfo.filename);
      await this.registerRoute(httpMethod, routePath, processor, fileInfo);
      
      console.log(`✅ Loaded API: ${httpMethod.toUpperCase()} ${routePath}`);
      
    } catch (error) {
      console.error(`❌ Error loading API from ${fileInfo.relativePath}:`, error);
    }
  }

  /**
   * Find the class that extends BaseProcessor in a module
   */
  findProcessorClass(module) {
    console.log(`🔍 Looking for processor class in module:`, Object.keys(module));
    console.log(`🔍 Module.exports type:`, typeof module.exports);
    console.log(`🔍 Module.exports:`, module.exports);
    
    if (module.exports && typeof module.exports === 'function' && module.exports.prototype) {
      console.log(`🔍 Found function export:`, module.exports.name);
      if (this.isBaseProcessorSubclass(module.exports)) {
        return module.exports;
      }
    }
    
    for (const key in module.exports) {
      const exported = module.exports[key];
      console.log(`🔍 Checking export key:`, key, typeof exported);
      if (typeof exported === 'function' && exported.prototype) {
        if (this.isBaseProcessorSubclass(exported)) {
          return exported;
        }
      }
    }
    
    return null;
  }

  /**
   * Check if a class extends BaseProcessor
   */
  isBaseProcessorSubclass(Class) {
    // Get the BaseProcessor class that this loader is using
    const loaderBaseProcessor = require('./BaseProcessor');
    console.log(`🔍 Checking if ${Class.name} extends BaseProcessor`);
    console.log(`🔍 Loader BaseProcessor:`, typeof loaderBaseProcessor, loaderBaseProcessor.name);
    console.log(`🔍 Class to check:`, typeof Class, Class.name);
    
    let current = Class;
    let depth = 0;
    while (current && current.prototype && depth < 10) {
      console.log(`🔍 Depth ${depth}:`, current.name, typeof current);
      // Check if current is the same as the loader's BaseProcessor
      if (current === loaderBaseProcessor) {
        console.log(`✅ Found BaseProcessor inheritance for ${Class.name}`);
        return true;
      }
      current = Object.getPrototypeOf(current.prototype)?.constructor;
      depth++;
    }
    console.log(`❌ No BaseProcessor inheritance found for ${Class.name}`);
    return false;
  }

  /**
   * Extract HTTP method from filename
   */
  extractHttpMethod(filename) {
    const method = filename.replace('.js', '').toLowerCase();
    const validMethods = ['get', 'post', 'put', 'delete', 'patch'];
    return validMethods.includes(method) ? method : null;
  }

  /**
   * Generate route path from file path
   */
  generateRoutePath(relativePath, filename) {
    let routePath = relativePath.replace(filename, '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    return routePath ? '/' + routePath : '/';
  }

  /**
   * Register a route with Express
   */
  async registerRoute(method, routePath, processor, fileInfo) {
    this.removeRoute(method, routePath);
    
    const routeHandler = async (req, res, next) => {
      try {
        await processor.process(req, res, next);
      } catch (error) {
        console.error(`Error in ${processor.name}:`, error);
        processor.sendError(res, 'Internal Server Error', 500);
      }
    };

    this.app[method](routePath, routeHandler);
    
    const routeKey = `${method.toUpperCase()}:${routePath}`;
    this.routes.set(routeKey, {
      method,
      path: routePath,
      handler: routeHandler,
      processor,
      fileInfo
    });

    // Add to OpenAPI spec
    this.addToOpenApiSpec(method, routePath, processor);
  }

  /**
   * Add endpoint to OpenAPI specification
   */
  addToOpenApiSpec(method, routePath, processor) {
    if (!this.openApiSpec.paths[routePath]) {
      this.openApiSpec.paths[routePath] = {};
    }

    const openApiData = processor.openApi || {};
    
    this.openApiSpec.paths[routePath][method] = {
      summary: openApiData.summary || `${method.toUpperCase()} ${routePath}`,
      description: openApiData.description || `Endpoint for ${method.toUpperCase()} ${routePath}`,
      tags: openApiData.tags || ['default'],
      responses: openApiData.responses || {
        200: {
          description: 'Success',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        },
        400: {
          description: 'Bad Request',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      }
    };
  }

  /**
   * Remove a registered route
   */
  removeRoute(method, routePath) {
    const routeKey = `${method.toUpperCase()}:${routePath}`;
    if (this.routes.has(routeKey)) {
      this.routes.delete(routeKey);
      // Remove from OpenAPI spec
      if (this.openApiSpec.paths[routePath]) {
        delete this.openApiSpec.paths[routePath][method];
        if (Object.keys(this.openApiSpec.paths[routePath]).length === 0) {
          delete this.openApiSpec.paths[routePath];
        }
      }
    }
  }

  /**
   * Start file watcher for runtime updates
   */
  startFileWatcher() {
    const { fileWatcher } = config;
    
    this.watcher = chokidar.watch(this.apiPath, {
      ignored: fileWatcher.ignored,
      persistent: true,
      ignoreInitial: true,
      delay: fileWatcher.delay
    });

    this.watcher
      .on('add', async (filePath) => {
        console.log(`📁 API file added: ${filePath}`);
        await this.handleFileChange(filePath, 'add');
      })
      .on('change', async (filePath) => {
        console.log(`✏️  API file changed: ${filePath}`);
        await this.handleFileChange(filePath, 'change');
      })
      .on('unlink', async (filePath) => {
        console.log(`🗑️  API file removed: ${filePath}`);
        await this.handleFileChange(filePath, 'remove');
      })
      .on('error', (error) => {
        console.error('❌ File watcher error:', error);
      });

    console.log('👀 File watcher started');
  }

  /**
   * Handle file changes
   */
  async handleFileChange(filePath, event) {
    try {
      if (event === 'remove') {
        console.log(`📝 File removed: ${filePath} - manual restart may be required for route removal`);
        return;
      }

      const relativePath = path.relative(this.apiPath, filePath);
      const filename = path.basename(filePath);
      
      const fileInfo = {
        fullPath: filePath,
        relativePath,
        filename
      };

      await this.loadAPIFromFile(fileInfo);
      
    } catch (error) {
      console.error(`❌ Error handling file change for ${filePath}:`, error);
    }
  }

  /**
   * Get all registered routes
   */
  getRegisteredRoutes() {
    const routes = [];
    for (const [key, routeInfo] of this.routes) {
      routes.push({
        method: routeInfo.method.toUpperCase(),
        path: routeInfo.path,
        processor: routeInfo.processor.name,
        file: routeInfo.fileInfo.relativePath
      });
    }
    return routes;
  }

  /**
   * Get OpenAPI specification
   */
  getOpenApiSpec() {
    return this.openApiSpec;
  }

  /**
   * Stop the file watcher
   */
  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}

module.exports = DynamicAPILoader;
