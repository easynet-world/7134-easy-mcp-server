/**
 * Environment Hot Reloader
 * Watches .env files for changes and reloads them automatically
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

class EnvHotReloader {
  constructor(options = {}) {
    this.userCwd = options.userCwd || process.cwd();
    this.envFiles = ['.env.local', '.env.development', '.env'];
    this.watcher = null;
    this.debounceTimeout = null;
    this.debounceDelay = options.debounceDelay || 1000; // 1 second debounce
    this.onReload = options.onReload || (() => {});
    this.logger = options.logger || console;
    this.mcpServer = options.mcpServer || null;
    this.bridgeReloader = options.bridgeReloader || null;
    this.apiLoader = options.apiLoader || null;
  }

  /**
   * Start watching .env files for changes
   */
  startWatching() {
    if (this.watcher) {
      this.logger.warn('⚠️  Env hot reloader is already watching');
      return;
    }

    // Create file patterns to watch (always watch for CRUD of these files)
    const watchPatterns = this.envFiles.map(envFile => path.join(this.userCwd, envFile));

    this.logger.log(`🔄 Setting up .env hot reload for: ${this.envFiles.join(', ')}`);

    // Create watcher
    this.watcher = chokidar.watch(watchPatterns, {
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false
    });

    // Handle file changes
    this.watcher.on('change', (filePath) => {
      this.handleEnvChange(filePath);
    });

    this.watcher.on('add', (filePath) => {
      this.handleEnvChange(filePath);
    });

    // Handle file deletions
    this.watcher.on('unlink', (filePath) => {
      this.handleEnvChange(filePath);
    });

    this.watcher.on('error', (error) => {
      this.logger.error(`❌ Env watcher error: ${error.message}`);
    });

    this.logger.log('✅ .env hot reload is now active');
  }

  /**
   * Stop watching .env files
   */
  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.logger.log('🛑 .env hot reload stopped');
    }

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
  }

  /**
   * Handle .env file changes with debouncing
   */
  handleEnvChange(_filePath) {
    // Clear existing timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    // Set new timeout
    this.debounceTimeout = setTimeout(() => {
      this.reloadEnvFiles();
    }, this.debounceDelay);
  }

  /**
   * Reload all .env files in priority order
   */
  reloadEnvFiles() {
    try {
      this.logger.log('🔄 Reloading .env files...');

      // Clear existing environment variables that were set by .env files
      this.clearEnvVariables();

      // Reload .env files in priority order
      let reloadedCount = 0;
      for (const envFile of this.envFiles) {
        const envPath = path.join(this.userCwd, envFile);
        if (fs.existsSync(envPath)) {
          try {
            require('dotenv').config({ path: envPath, override: true });
            this.logger.log(`📄 Reloaded environment from ${envFile}`);
            reloadedCount++;
          } catch (error) {
            this.logger.warn(`⚠️  Could not reload ${envFile}: ${error.message}`);
          }
        }
      }

      if (reloadedCount > 0) {
        this.logger.log(`✅ Reloaded ${reloadedCount} .env file(s)`);
        
        // Update MCP server configuration if it exists
        this.updateMCPConfiguration();
        
        // Update API loader configuration if it exists
        this.updateAPILoaderConfiguration();
        
        this.onReload();

        // Restart MCP bridges if available to pick up new credentials/config
        try {
          if (this.bridgeReloader && typeof this.bridgeReloader.restartBridges === 'function') {
            this.bridgeReloader.restartBridges();
          }
        } catch (bridgeErr) {
          this.logger.warn(`⚠️  Failed to restart MCP bridges after env reload: ${bridgeErr.message}`);
        }

        // Notify connected MCP clients about configuration changes
        try {
          if (this.mcpServer && typeof this.mcpServer.broadcastNotification === 'function') {
            const notification = {
              jsonrpc: '2.0',
              method: 'notifications/configChanged',
              params: {
                timestamp: new Date().toISOString(),
                filesReloaded: reloadedCount
              }
            };
            this.mcpServer.broadcastNotification(notification);
          }
        } catch (notifyError) {
          this.logger.warn(`⚠️  Failed to notify MCP clients about config change: ${notifyError.message}`);
        }
      } else {
        this.logger.log('📄 No .env files to reload');
      }
    } catch (error) {
      this.logger.error(`❌ Error reloading .env files: ${error.message}`);
    }
  }

  /**
   * Clear environment variables that were set by .env files
   * This is a best-effort approach since we can't track which variables were set by .env
   */
  clearEnvVariables() {
    // Note: We can't actually clear process.env variables that were already set
    // This is more of a conceptual placeholder for future enhancement
    // The dotenv override: true option will handle the actual reloading
  }

  /**
   * Update MCP server configuration with latest environment variables
   */
  updateMCPConfiguration() {
    if (!this.mcpServer) {
      return;
    }

    try {
      // Update MCP server host and port if they changed
      const newHost = process.env.EASY_MCP_SERVER_MCP_HOST || '0.0.0.0';
      const newPort = parseInt(process.env.EASY_MCP_SERVER_MCP_PORT || '8888');
      
      // Check if configuration changed
      if (this.mcpServer.host !== newHost || this.mcpServer.port !== newPort) {
        this.logger.log(`🔄 Updating MCP server configuration: ${newHost}:${newPort}`);
        
        // Update the server configuration
        this.mcpServer.host = newHost;
        this.mcpServer.port = newPort;
        
        // If the server is running, we might need to restart it
        // For now, just log the change - full restart would require more complex logic
        this.logger.log('⚠️  MCP server configuration updated. Some changes may require server restart.');
      }

      // Update MCP base path if it changed
      const newBasePath = process.env.EASY_MCP_SERVER_MCP_BASE_PATH || '../mcp';
      if (this.mcpServer.cacheManager && this.mcpServer.cacheManager.basePath !== newBasePath) {
        this.logger.log(`🔄 Updating MCP base path: ${newBasePath}`);
        // Note: Changing base path would require reinitializing the cache manager
        this.logger.log('⚠️  MCP base path change detected. This may require server restart.');
      }
    } catch (error) {
      this.logger.error(`❌ Error updating MCP configuration: ${error.message}`);
    }
  }

  /**
   * Update API loader configuration with latest environment variables
   */
  updateAPILoaderConfiguration() {
    if (!this.apiLoader) {
      return;
    }

    try {
      // Update any API loader configuration that depends on environment variables
      // This could include CORS settings, authentication settings, etc.
      const corsOrigin = process.env.EASY_MCP_SERVER_CORS_ORIGIN;
      const corsMethods = process.env.EASY_MCP_SERVER_CORS_METHODS;
      const corsCredentials = process.env.EASY_MCP_SERVER_CORS_CREDENTIALS;
      
      if (corsOrigin || corsMethods || corsCredentials) {
        this.logger.log('🔄 API CORS configuration updated from environment variables');
        // The API loader would need to be updated to handle these changes
        // For now, just log the change
        this.logger.log('⚠️  API CORS configuration updated. Some changes may require server restart.');
      }
    } catch (error) {
      this.logger.error(`❌ Error updating API loader configuration: ${error.message}`);
    }
  }

  /**
   * Set MCP server reference for configuration updates
   */
  setMCPServer(mcpServer) {
    this.mcpServer = mcpServer;
  }

  /**
   * Set API loader reference for configuration updates
   */
  setAPILoader(apiLoader) {
    this.apiLoader = apiLoader;
  }

  /**
   * Set MCP bridge reloader reference for restarting bridges on env changes
   */
  setBridgeReloader(bridgeReloader) {
    this.bridgeReloader = bridgeReloader;
  }

  /**
   * Get status of the hot reloader
   */
  getStatus() {
    return {
      isWatching: this.watcher !== null,
      envFiles: this.envFiles,
      debounceDelay: this.debounceDelay,
      userCwd: this.userCwd,
      hasMCPServer: this.mcpServer !== null,
      hasAPILoader: this.apiLoader !== null
    };
  }
}

module.exports = EnvHotReloader;
