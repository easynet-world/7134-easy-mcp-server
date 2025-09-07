/**
 * Example configuration for easy-mcp-server with auto-discovery and hot reloading
 * 
 * This file demonstrates how to configure the MCP server with the new auto-discovery
 * and hot reloading features for prompts and resources.
 */

const DynamicAPIMCPServer = require('./src/mcp/mcp-server');

// Example 1: Default configuration (auto-discovery enabled)
const defaultServer = new DynamicAPIMCPServer('0.0.0.0', 3001);

// Example 2: Custom configuration with specific options
const customServer = new DynamicAPIMCPServer('0.0.0.0', 3001, {
  prompts: {
    enabled: true,                    // Enable prompt auto-discovery
    directory: './mcp/prompts',       // Custom prompts directory
    watch: true,                      // Enable hot reloading
    formats: ['json', 'yaml', 'yml']  // Supported file formats
  },
  resources: {
    enabled: true,                    // Enable resource auto-discovery
    directory: './mcp/resources',     // Custom resources directory
    watch: true,                      // Enable hot reloading
    formats: ['json', 'yaml', 'yml', 'md', 'txt']  // Supported file formats
  }
});

// Example 3: Minimal configuration (disable some features)
const minimalServer = new DynamicAPIMCPServer('0.0.0.0', 3001, {
  prompts: {
    enabled: true,
    watch: false,                     // Disable hot reloading
    formats: ['json']                 // Only JSON files
  },
  resources: {
    enabled: false                    // Disable resource auto-discovery
  }
});

// Example 4: Development configuration with custom directories
const devServer = new DynamicAPIMCPServer('0.0.0.0', 3001, {
  prompts: {
    enabled: true,
    directory: './dev/prompts',       // Custom development directory
    watch: true,
    formats: ['json', 'yaml', 'yml']
  },
  resources: {
    enabled: true,
    directory: './dev/resources',     // Custom development directory
    watch: true,
    formats: ['json', 'yaml', 'yml', 'md', 'txt']
  }
});

// Example usage in your application
async function startMCPServer() {
  try {
    // Use the custom server configuration
    await customServer.run();
    console.log('🚀 MCP Server started with auto-discovery and hot reloading!');
    
    // The server will automatically:
    // 1. Scan the configured directories for prompts and resources
    // 2. Load all supported file formats
    // 3. Set up file watchers for hot reloading
    // 4. Notify connected clients when files change
    
  } catch (error) {
    console.error('❌ Failed to start MCP server:', error);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down MCP server...');
  customServer.stop();
  process.exit(0);
});

// Export for use in other modules
module.exports = {
  defaultServer,
  customServer,
  minimalServer,
  devServer,
  startMCPServer
};

// Uncomment to start the server
// startMCPServer();
