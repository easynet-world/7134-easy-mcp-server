/**
 * Server Startup Module
 * Handles starting the Easy MCP Server in different modes
 */

// Console redirection is now handled at the entry point (easy-mcp-server.js)
// Check if STDIO mode is enabled for conditional logic
const isStdioMode = process.env.EASY_MCP_SERVER_STDIO_MODE === 'true';

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
 * @param {Object} options - Command-line options (cwd, stdio, etc.)
 * @returns {Promise<void>}
 */
async function startServer(options = {}) {
  // Load environment files FIRST so port configuration is available for mode detection
  loadUserEnvFiles();
  
  // Check if running in STDIO mode (when spawned as a bridge)
  // Use robust detection: check explicit flag, bridge mode, or absence of MCP port
  const explicitStdioMode = process.env.EASY_MCP_SERVER_STDIO_MODE === 'true';
  const explicitHttpMode = process.env.EASY_MCP_SERVER_STDIO_MODE === 'false';
  const hasMcpPort = process.env.EASY_MCP_SERVER_MCP_PORT && 
                     process.env.EASY_MCP_SERVER_MCP_PORT.trim() !== '';
  
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

  // Console redirection already happened at the top of the file
  // Just log the startup message if not in STDIO mode
  if (!isStdioMode) {
    console.log('🚀 Starting Easy MCP Server...');
  }

  // Initialize hot reloader
  initializeEnvHotReloader();

  // Parse port configuration
  const portConfig = parsePortArguments();

  // Auto-install dependencies (skip in STDIO mode to prevent circular dependencies when running as a bridge)
  if (!isStdioMode) {
    await autoInstallDependencies();
  }
  
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
  const isStdioMode = process.env.EASY_MCP_SERVER_STDIO_MODE === 'true';
  
  if (!isStdioMode) {
    console.log('📁 Found server.js - using custom server configuration');
  }
  
  try {
    require(serverPath);
  } catch (error) {
    if (isStdioMode) {
      process.stderr.write(`Failed to start server from server.js: ${error.message}\n`);
    } else {
      console.error('❌ Failed to start server from server.js:', error.message);
    }
    process.exit(1);
  }
}

/**
 * Start server automatically using api/ directory
 * @param {Object} portConfig - Port configuration
 * @returns {Promise<void>}
 */
async function startAutoServer(portConfig) {
  const isStdioMode = process.env.EASY_MCP_SERVER_STDIO_MODE === 'true';
  
  if (!isStdioMode) {
    console.log('📁 Found api/ directory - starting automatic server');
    console.log('🚀 Using full-featured Easy MCP Server with MCP integration...');
  }
  
  try {
    // Set up environment variables for the server
    const originalCwd = process.cwd();
    // Resolve paths:
    // - packageRoot: from src/utils/cli/ go up 3 levels to package root
    const packageRoot = path.join(__dirname, '..', '..', '..');

    // Configure environment variables
    // If already set (e.g., by bin script for globally installed packages), use those
    // Otherwise, use current working directory (local installation)
    if (!process.env.EASY_MCP_SERVER_API_PATH) {
      process.env.EASY_MCP_SERVER_API_PATH = path.join(originalCwd, 'api');
    }
    if (!process.env.EASY_MCP_SERVER_MCP_BASE_PATH) {
      process.env.EASY_MCP_SERVER_MCP_BASE_PATH = path.join(originalCwd, 'mcp');
    }

    // Auto-detect MCP bridge config
    // If already set (e.g., by bin script), use that
    // Otherwise, check current working directory
    if (!process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH) {
      const bridgeConfigPath = path.join(originalCwd, 'mcp-bridge.json');
      if (fs.existsSync(bridgeConfigPath)) {
        process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH = bridgeConfigPath;
        if (!isStdioMode) {
          console.log(`🔌 Auto-detected MCP bridge config: ${bridgeConfigPath}`);
        }
      }
    }

    // Configure static directory - use package root for fallback public directory
    const publicDir = path.join(originalCwd, 'public');
    process.env.EASY_MCP_SERVER_STATIC_DIRECTORY = fs.existsSync(publicDir)
      ? publicDir
      : (process.env.EASY_MCP_SERVER_STATIC_DIRECTORY || path.join(packageRoot, 'public'));

    // Set ports (only if defined - in STDIO mode, mcpPort may be undefined)
    if (portConfig.port != null) {
      process.env.EASY_MCP_SERVER_PORT = portConfig.port.toString();
    }
    if (portConfig.mcpPort != null) {
      process.env.EASY_MCP_SERVER_MCP_PORT = portConfig.mcpPort.toString();
    }

    // Import and start the orchestrator (it's in the src directory within the package)
    const orchestratorPath = path.join(packageRoot, 'src', 'orchestrator.js');
    const orchestrator = require(orchestratorPath);
    
    // The orchestrator should start automatically when required
    // If it has an explicit start function, call it and await it
    if (orchestrator && typeof orchestrator.startServer === 'function') {
      await orchestrator.startServer();
      // After startServer() completes, the HTTP servers should keep the process alive
      // The servers (HTTP listeners) will keep the event loop alive
    } else {
      if (!isStdioMode) {
        console.log('🚀 Starting server...');
      }
    }
    
    // In HTTP mode, the servers should keep the process alive
    // If we're in STDIO mode, the STDIO handler will keep it alive
    // No need to do anything else here - the servers will keep the event loop active
    
  } catch (error) {
    if (isStdioMode) {
      process.stderr.write(`Failed to start server: ${error.message}\n`);
      process.stderr.write(`${error.stack}\n`);
    } else {
      console.error('❌ Failed to start server:', error.message);
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Show error when neither server.js nor api/ directory is found
 */
function showNoServerError() {
  const isStdioMode = process.env.EASY_MCP_SERVER_STDIO_MODE === 'true';
  
  // In STDIO mode, write directly to stderr to avoid interfering with JSON-RPC on stdout
  // Remove emojis in STDIO mode to prevent encoding issues
  // CRITICAL: In STDIO mode, we must NEVER write to stdout as it's used for JSON-RPC
  // Also check if stdout is being used (no MCP port means STDIO mode)
  const hasMcpPort = process.env.EASY_MCP_SERVER_MCP_PORT && process.env.EASY_MCP_SERVER_MCP_PORT.trim() !== '';
  const isActuallyStdioMode = isStdioMode || !hasMcpPort;
  
  // ALWAYS write to stderr in STDIO mode to avoid any possibility of writing to stdout
  // Even if console redirection is in place, we want to be absolutely sure
  if (isActuallyStdioMode) {
    // Write to stderr synchronously and flush to ensure it's written before exit
    // NEVER use console.log/error here as it might not be redirected yet or might have timing issues
    process.stderr.write('Error: Neither server.js nor api/ directory found in current directory\n', 'utf8');
    process.stderr.write('Tip: Run "easy-mcp-server init" to create a new project\n', 'utf8');
    process.stderr.write('Tip: Or create a server.js file with your custom configuration\n', 'utf8');
    // Force flush stderr before exiting
    if (process.stderr.flushSync) {
      process.stderr.flushSync();
    }
  } else {
    // Only use console in non-STDIO mode
    // But still check one more time to be safe
    const finalCheck = process.env.EASY_MCP_SERVER_STDIO_MODE === 'true' || 
                       (!process.env.EASY_MCP_SERVER_MCP_PORT || process.env.EASY_MCP_SERVER_MCP_PORT.trim() === '');
    if (finalCheck) {
      // Double-check: if we're actually in STDIO mode, write to stderr
      process.stderr.write('Error: Neither server.js nor api/ directory found in current directory\n', 'utf8');
      process.stderr.write('Tip: Run "easy-mcp-server init" to create a new project\n', 'utf8');
      process.stderr.write('Tip: Or create a server.js file with your custom configuration\n', 'utf8');
    } else {
      console.error('❌ Error: Neither server.js nor api/ directory found in current directory');
      console.log('💡 Tip: Run "easy-mcp-server init" to create a new project');
      console.log('💡 Tip: Or create a server.js file with your custom configuration');
    }
  }
  // Use process.exitCode to allow stderr to flush, then exit
  process.exitCode = 1;
  process.exit(1);
}

module.exports = { startServer };

