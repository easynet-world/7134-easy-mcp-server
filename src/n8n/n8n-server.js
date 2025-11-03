const ApiLoader = require('../utils/loaders/api-loader');
const N8nNodeBuilder = require('./builders/n8n-node-builder');
const N8nNodeGenerator = require('./generators/n8n-node-generator');
const Logger = require('../utils/logger');
const path = require('path');

const logger = Logger.default || new Logger();

/**
 * N8n node generation server
 * Loads APIs and generates n8n node packages
 */
class N8nServer {
  constructor(options = {}) {
    this.options = {
      apiPath: options.apiPath || process.env.EASY_MCP_SERVER_API_PATH || './api',
      outputDir: options.outputDir || './n8n-nodes-output',
      nodeName: options.nodeName || 'CustomAPI',
      displayName: options.displayName || 'Custom API',
      description: options.description || 'Generated n8n node from easy-mcp-server',
      baseUrl: options.baseUrl || process.env.API_BASE_URL || 'http://localhost:3000',
      author: options.author || '',
      version: options.version || '1.0.0',
      requiresAuth: options.requiresAuth || false,
      icon: options.icon || 'file:customapi.svg',
      ...options,
    };

    this.routes = [];
  }

  /**
   * Initialize and generate n8n node package
   */
  async start() {
    try {
      logger.info('Starting n8n node generation...');

      // Load API routes
      await this.loadRoutes();

      // Build node definition
      const nodeDefinition = this.buildNodeDefinition();

      // Generate node package files
      const files = this.generateNodePackage(nodeDefinition);

      // Write files to disk
      this.writeFiles(files);

      logger.info('n8n node generation completed successfully!');

      return {
        success: true,
        outputDir: this.options.outputDir,
        files: Object.keys(files),
      };
    } catch (error) {
      logger.error('Failed to generate n8n node:', error);
      throw error;
    }
  }

  /**
   * Load API routes from the API directory
   */
  async loadRoutes() {
    logger.info(`Loading API routes from: ${this.options.apiPath}`);

    // Create a mock Express app for API loading
    const mockApp = {
      _router: { stack: [] },
      get: () => {},
      post: () => {},
      put: () => {},
      patch: () => {},
      delete: () => {},
      use: () => {},
    };

    const apiLoader = new ApiLoader(mockApp, this.options.apiPath);
    this.routes = apiLoader.loadAPIs();

    logger.info(`Loaded ${this.routes.length} API routes`);

    if (this.routes.length === 0) {
      logger.warn('No API routes found. Make sure your API directory is not empty.');
    }

    return this.routes;
  }

  /**
   * Build n8n node definition from loaded routes
   */
  buildNodeDefinition() {
    logger.info('Building n8n node definition...');

    const nodeDefinition = N8nNodeBuilder.buildNodeDefinition(this.routes, {
      nodeName: this.options.nodeName,
      displayName: this.options.displayName,
      description: this.options.description,
      icon: this.options.icon,
      credentials: this.options.requiresAuth ? [
        {
          name: `${this.options.nodeName.toLowerCase()}Api`,
          required: true,
        },
      ] : [],
      baseUrl: this.options.baseUrl,
    });

    logger.info(`Built node definition with ${Object.keys(nodeDefinition.operations || {}).length} resources`);

    return nodeDefinition;
  }

  /**
   * Generate node package files
   */
  generateNodePackage(nodeDefinition) {
    logger.info('Generating n8n node package files...');

    const files = N8nNodeGenerator.generateNodePackage(nodeDefinition, {
      outputDir: this.options.outputDir,
      nodeName: this.options.nodeName,
      displayName: this.options.displayName,
      description: this.options.description,
      author: this.options.author,
      version: this.options.version,
      requiresAuth: this.options.requiresAuth,
      baseUrl: this.options.baseUrl,
    });

    logger.info(`Generated ${Object.keys(files).length} files`);

    return files;
  }

  /**
   * Write generated files to disk
   */
  writeFiles(files) {
    logger.info(`Writing files to: ${this.options.outputDir}`);

    N8nNodeGenerator.writeFiles(files, this.options.outputDir);
  }

  /**
   * Get node definition without writing files (for preview)
   */
  async preview() {
    await this.loadRoutes();
    const nodeDefinition = this.buildNodeDefinition();
    return nodeDefinition;
  }
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--api-path' && args[i + 1]) {
      options.apiPath = args[++i];
    } else if (arg === '--output-dir' && args[i + 1]) {
      options.outputDir = args[++i];
    } else if (arg === '--node-name' && args[i + 1]) {
      options.nodeName = args[++i];
    } else if (arg === '--display-name' && args[i + 1]) {
      options.displayName = args[++i];
    } else if (arg === '--description' && args[i + 1]) {
      options.description = args[++i];
    } else if (arg === '--base-url' && args[i + 1]) {
      options.baseUrl = args[++i];
    } else if (arg === '--author' && args[i + 1]) {
      options.author = args[++i];
    } else if (arg === '--version' && args[i + 1]) {
      options.version = args[++i];
    } else if (arg === '--require-auth') {
      options.requiresAuth = true;
    } else if (arg === '--preview') {
      options.previewOnly = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node n8n-server.js [options]

Options:
  --api-path <path>        Path to API directory (default: ./api)
  --output-dir <path>      Output directory for generated node (default: ./n8n-nodes-output)
  --node-name <name>       Node name (default: CustomAPI)
  --display-name <name>    Display name (default: Custom API)
  --description <text>     Node description
  --base-url <url>         API base URL (default: http://localhost:3000)
  --author <name>          Author name
  --version <version>      Package version (default: 1.0.0)
  --require-auth           Enable authentication
  --preview                Preview node definition without generating files
  --help, -h               Show this help message

Environment Variables:
  EASY_MCP_SERVER_API_PATH - API directory path
  API_BASE_URL             - API base URL

Examples:
  # Generate n8n node from default API directory
  node n8n-server.js

  # Generate with custom settings
  node n8n-server.js --api-path ./my-api --node-name MyAPI --display-name "My API"

  # Preview node definition
  node n8n-server.js --preview

  # Generate with authentication
  node n8n-server.js --require-auth --base-url https://api.example.com
      `);
      process.exit(0);
    }
  }

  const server = new N8nServer(options);

  if (options.previewOnly) {
    const nodeDefinition = await server.preview();
    console.log(JSON.stringify(nodeDefinition, null, 2));
  } else {
    await server.start();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = N8nServer;
