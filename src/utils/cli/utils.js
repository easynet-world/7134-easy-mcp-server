/**
 * CLI Utility Functions
 * Handles environment loading, hot reloading, and dependency installation
 */

const fs = require('fs');
const path = require('path');

/**
 * Check if STDIO mode is enabled
 * Also checks if MCP port is not set (which indicates STDIO mode)
 */
function isStdioMode() {
  // Check explicit flag first
  if (process.env.EASY_MCP_SERVER_STDIO_MODE === 'true') {
    return true;
  }
  // If no MCP port is set, we're likely in STDIO mode
  const hasMcpPort = process.env.EASY_MCP_SERVER_MCP_PORT && 
                     process.env.EASY_MCP_SERVER_MCP_PORT.trim() !== '';
  return !hasMcpPort;
}

/**
 * Load .env files from user directory
 * Loads files in order: .env.local, .env.development, .env
 */
function loadUserEnvFiles() {
  const userCwd = process.cwd();
  const envFiles = ['.env.local', '.env.development', '.env'];
  
  for (const envFile of envFiles) {
    const envPath = path.join(userCwd, envFile);
    if (fs.existsSync(envPath)) {
      try {
        require('dotenv').config({ path: envPath });
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

