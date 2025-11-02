/**
 * Server Startup Module
 * Handles starting the Easy MCP Server in different modes
 */

const fs = require('fs');
const path = require('path');
const {
  loadUserEnvFiles,
  initializeEnvHotReloader,
  autoInstallDependencies,
  parsePortArguments
} = require('./utils');

/**
 * Start the Easy MCP Server
 * Checks for server.js or api/ directory and starts accordingly
 * @returns {Promise<void>}
 */
async function startServer() {
  console.log('🚀 Starting Easy MCP Server...');
  
  // Load environment files
  loadUserEnvFiles();
  
  // Initialize hot reloader
  initializeEnvHotReloader();
  
  // Parse port configuration
  const portConfig = parsePortArguments();
  
  // Auto-install dependencies
  await autoInstallDependencies();
  
  // Check what mode to start in
  const serverPath = path.join(process.cwd(), 'server.js');
  const apiPath = path.join(process.cwd(), 'api');
  
  if (fs.existsSync(serverPath)) {
    startCustomServer(serverPath);
  } else if (fs.existsSync(apiPath)) {
    await startAutoServer(portConfig);
  } else {
    showNoServerError();
  }
}

/**
 * Start server using custom server.js file
 * @param {string} serverPath - Path to server.js file
 */
function startCustomServer(serverPath) {
  console.log('📁 Found server.js - using custom server configuration');
  
  try {
    require(serverPath);
  } catch (error) {
    console.error('❌ Failed to start server from server.js:', error.message);
    process.exit(1);
  }
}

/**
 * Start server automatically using api/ directory
 * @param {Object} portConfig - Port configuration
 * @returns {Promise<void>}
 */
async function startAutoServer(portConfig) {
  console.log('📁 Found api/ directory - starting automatic server');
  
  try {
    console.log('🚀 Using full-featured Easy MCP Server with MCP integration...');
    
    // Set up environment variables for the server
    const originalCwd = process.cwd();
    const mainProjectPath = path.join(__dirname, '..', '..');
    
    // Configure environment variables
    process.env.EASY_MCP_SERVER_API_PATH = path.join(originalCwd, 'api');
    process.env.EASY_MCP_SERVER_MCP_BASE_PATH = path.join(originalCwd, 'mcp');
    
    // Auto-detect MCP bridge config
    const bridgeConfigPath = path.join(originalCwd, 'mcp-bridge.json');
    if (!process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH && fs.existsSync(bridgeConfigPath)) {
      process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH = bridgeConfigPath;
      console.log(`🔌 Auto-detected MCP bridge config: ${bridgeConfigPath}`);
    }
    
    // Configure static directory
    const publicDir = path.join(originalCwd, 'public');
    process.env.EASY_MCP_SERVER_STATIC_DIRECTORY = fs.existsSync(publicDir)
      ? publicDir
      : (process.env.EASY_MCP_SERVER_STATIC_DIRECTORY || path.join(mainProjectPath, 'public'));
    
    // Set ports
    process.env.EASY_MCP_SERVER_PORT = portConfig.port.toString();
    process.env.EASY_MCP_SERVER_MCP_PORT = portConfig.mcpPort.toString();
    
    // Import and start the orchestrator
    const orchestratorPath = path.join(mainProjectPath, 'src', 'orchestrator.js');
    const orchestrator = require(orchestratorPath);
    
    // The orchestrator should start automatically when required
    // If it has an explicit start function, call it
    if (orchestrator && typeof orchestrator.startServer === 'function') {
      orchestrator.startServer();
    } else {
      console.log('🚀 Starting server...');
    }
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Show error when neither server.js nor api/ directory is found
 */
function showNoServerError() {
  console.error('❌ Error: Neither server.js nor api/ directory found in current directory');
  console.log('💡 Tip: Run "easy-mcp-server init" to create a new project');
  console.log('💡 Tip: Or create a server.js file with your custom configuration');
  process.exit(1);
}

module.exports = { startServer };

