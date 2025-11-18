/**
 * CLI Utility Functions
 * Handles environment loading, hot reloading, and dependency installation
 */

const fs = require('fs');
const path = require('path');

/**
 * Check if STDIO mode is enabled
 * Also checks if MCP port is not set (which indicates STDIO mode)
 * If bridge mode is detected (mcp-bridge.json exists), defaults to STDIO mode
 */
function isStdioMode() {
  // Check explicit flag first
  if (process.env.EASY_MCP_SERVER_STDIO_MODE === 'true') {
    return true;
  }
  // If explicitly set to false and port is set, use HTTP mode
  if (process.env.EASY_MCP_SERVER_STDIO_MODE === 'false') {
    const hasMcpPort = process.env.EASY_MCP_SERVER_MCP_PORT && 
                       process.env.EASY_MCP_SERVER_MCP_PORT.trim() !== '';
    return !hasMcpPort;
  }
  
  // Check if bridge mode is active (mcp-bridge.json exists)
  // In bridge mode, default to STDIO unless port is explicitly set
  let bridgeConfigPath = process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH;
  if (!bridgeConfigPath) {
    // Check for mcp-bridge.json in current working directory
    const cwd = process.cwd();
    const defaultBridgeConfig = path.join(cwd, 'mcp-bridge.json');
    if (fs.existsSync(defaultBridgeConfig)) {
      bridgeConfigPath = defaultBridgeConfig;
    }
  }
  
  const hasBridgeConfig = bridgeConfigPath && fs.existsSync(bridgeConfigPath);
  const hasMcpPort = process.env.EASY_MCP_SERVER_MCP_PORT && 
                     process.env.EASY_MCP_SERVER_MCP_PORT.trim() !== '';
  
  // If bridge mode is active, default to STDIO unless port is explicitly set
  if (hasBridgeConfig && !hasMcpPort) {
    return true;
  }
  
  // If no MCP port is set, we're likely in STDIO mode
  return !hasMcpPort;
}

/**
 * Load .env files from user directory
 * Loads files in order: .env.local, .env.development, .env
 * If EASY_MCP_SERVER_STDIO_MODE is already set to 'true', port-related variables
 * from .env files will not override it to prevent conflicts when running as a bridge
 */
function loadUserEnvFiles() {
  const userCwd = process.cwd();
  const envFiles = ['.env.local', '.env.development', '.env'];
  
  // Check if STDIO mode is already set (e.g., by bridge loader)
  const stdioModeAlreadySet = process.env.EASY_MCP_SERVER_STDIO_MODE === 'true';
  
  for (const envFile of envFiles) {
    const envPath = path.join(userCwd, envFile);
    if (fs.existsSync(envPath)) {
      try {
        // If STDIO mode is already set, we need to filter out port-related vars
        // to prevent .env from overriding the bridge configuration
        if (stdioModeAlreadySet) {
          // Load .env file but don't override port-related variables
          const dotenv = require('dotenv');
          const envConfig = dotenv.config({ path: envPath, override: false });
          
          if (envConfig.parsed) {
            // Remove port-related variables that would conflict with STDIO mode
            delete envConfig.parsed.EASY_MCP_SERVER_PORT;
            delete envConfig.parsed.EASY_MCP_SERVER_MCP_PORT;
            
            // Apply the filtered config
            for (const [key, value] of Object.entries(envConfig.parsed)) {
              if (!process.env[key]) {
                process.env[key] = value;
              }
            }
          }
        } else {
          // Normal loading when not in STDIO mode
          require('dotenv').config({ path: envPath });
        }
        
        if (!isStdioMode()) {
          console.log(`📄 Loaded environment from ${envFile}`);
        }
      } catch (error) {
        if (!isStdioMode()) {
          console.warn(`⚠️  Warning: Could not load ${envFile}: ${error.message}`);
        }
      }
    }
  }
}

/**
 * Global env hot reloader instance
 */
let envHotReloader = null;

/**
 * Initialize environment variable hot reloader
 * Watches .env files for changes and reloads them automatically
 */
function initializeEnvHotReloader() {
  // Skip in STDIO mode
  if (isStdioMode()) {
    return;
  }
  
  try {
    const EnvHotReloader = require('../loaders/env-hot-reloader');
    envHotReloader = new EnvHotReloader({
      debounceDelay: 1000,
      onReload: () => {
        console.log('🔄 Environment variables reloaded - some changes may require server restart');
      },
      logger: console
    });
    envHotReloader.startWatching();
  } catch (error) {
    console.warn(`⚠️  Could not initialize .env hot reload: ${error.message}`);
  }
}

/**
 * Auto-install missing dependencies
 * Runs npm install if package.json exists
 * @returns {Promise<void>}
 */
async function autoInstallDependencies() {
  // CRITICAL: Double-check STDIO mode before doing anything
  // This function should NEVER run in STDIO mode
  if (isStdioMode()) {
    // Silently return - don't do anything in STDIO mode
    return;
  }
  
  const userCwd = process.cwd();
  const packageJsonPath = path.join(userCwd, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.log('📦 No package.json found - skipping auto-install');
    return;
  }
  
  console.log('📦 Checking for missing dependencies...');
  
  try {
    const { spawn } = require('child_process');
    
    // Run npm install with inherit stdio (we're not in STDIO mode)
    const installProcess = spawn('npm', ['install'], {
      cwd: userCwd,
      stdio: 'inherit'
    });
    
    return new Promise((resolve) => {
      installProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Dependencies installed successfully');
        } else {
          console.warn(`⚠️  npm install completed with code ${code}`);
        }
        resolve(); // Don't fail the server startup
      });
      
      installProcess.on('error', (error) => {
        console.warn(`⚠️  Could not run npm install: ${error.message}`);
        resolve(); // Don't fail the server startup
      });
    });
  } catch (error) {
    console.warn(`⚠️  Error during auto-install: ${error.message}`);
  }
}

/**
 * Parse port configuration from environment variables
 * @returns {Object} Configuration with port and mcpPort
 */
function parsePortArguments() {
  // Don't use default ports in STDIO mode
  const isStdioMode = process.env.EASY_MCP_SERVER_STDIO_MODE === 'true';

  const config = {
    port: isStdioMode ? process.env.EASY_MCP_SERVER_PORT : (process.env.EASY_MCP_SERVER_PORT || 8887),
    mcpPort: isStdioMode ? process.env.EASY_MCP_SERVER_MCP_PORT : (process.env.EASY_MCP_SERVER_MCP_PORT || 8888)
  };

  return config;
}

module.exports = {
  loadUserEnvFiles,
  initializeEnvHotReloader,
  autoInstallDependencies,
  parsePortArguments
};

