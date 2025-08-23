/**
 * Hot Reloading Service
 * Watches for API file changes and automatically reloads routes
 */

const chokidar = require('chokidar');
const path = require('path');

class HotReloader {
  constructor(apiLoader, mcpServer) {
    this.apiLoader = apiLoader;
    this.mcpServer = mcpServer;
    this.watcher = null;
    this.isWatching = false;
    this.reloadQueue = [];
    this.isReloading = false;
    this.debounceTimeout = null;
    this.debounceDelay = 1000; // 1 second debounce
  }

  /**
   * Start watching for file changes
   */
  startWatching() {
    if (this.isWatching) {
      console.log('⚠️  Hot reloading is already active');
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      console.log('ℹ️  Hot reloading disabled in production');
      return;
    }

    console.log('🔄 Setting up hot reloading for API files...');
    
    this.watcher = chokidar.watch('api/**/*.js', {
      ignored: [
        /(^|[/\\])\./, // Ignore hidden files
        /node_modules/,   // Ignore node_modules
        /\.git/,          // Ignore git files
        /\.DS_Store/      // Ignore macOS files
      ],
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100
      }
    });

    this.watcher.on('change', (filePath) => {
      this.queueReload(filePath, 'changed');
    });

    this.watcher.on('add', (filePath) => {
      this.queueReload(filePath, 'added');
    });

    this.watcher.on('unlink', (filePath) => {
      this.queueReload(filePath, 'removed');
    });

    this.watcher.on('error', (error) => {
      console.error('❌ File watcher error:', error.message);
    });

    this.isWatching = true;
    console.log('✅ Hot reloading started');
  }

  /**
   * Queue a reload operation with debouncing
   */
  queueReload(filePath, event) {
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`🔄 API file ${event}: ${relativePath}`);
    
    // Clear existing debounce timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    
    // Add to queue if not already there
    if (!this.reloadQueue.find(item => item.filePath === filePath)) {
      this.reloadQueue.push({ filePath, event });
    }
    
    // Set debounce timeout
    this.debounceTimeout = setTimeout(() => {
      this.processReloadQueue();
    }, this.debounceDelay);
  }

  /**
   * Process the reload queue
   */
  async processReloadQueue() {
    if (this.isReloading || this.reloadQueue.length === 0) {
      return;
    }

    this.isReloading = true;
    const items = [...this.reloadQueue];
    this.reloadQueue = [];
    
    console.log(`🔄 Processing ${items.length} file changes...`);
    
    try {
      // Clear cache for all changed files
      items.forEach(item => {
        this.apiLoader.clearCache(item.filePath);
      });
      
      // Reload all routes
      const newRoutes = this.apiLoader.reloadAPIs();
      
      // Update MCP server if available
      if (this.mcpServer) {
        this.mcpServer.setRoutes(newRoutes);
        console.log(`🔄 MCP Server: Routes updated (${newRoutes.length} routes)`);
      }
      
      // Validate routes
      const validationIssues = this.apiLoader.validateRoutes();
      if (validationIssues.length > 0) {
        console.warn('⚠️  Route validation issues:');
        validationIssues.forEach(issue => console.warn(`  - ${issue}`));
      }
      
      // Check for loading errors
      const errors = this.apiLoader.getErrors();
      if (errors.length > 0) {
        console.warn('⚠️  API loading errors:');
        errors.forEach(error => console.warn(`  - ${error}`));
      }
      
      console.log(`✅ Hot reload complete: ${newRoutes.length} routes loaded`);
      
    } catch (error) {
      console.error(`❌ Hot reload failed: ${error.message}`);
    } finally {
      this.isReloading = false;
    }
  }

  /**
   * Stop watching for file changes
   */
  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.isWatching = false;
      
      // Clear any pending reloads
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = null;
      }
      
      this.reloadQueue = [];
      this.isReloading = false;
      
      console.log('🛑 Hot reloading stopped');
    }
  }

  /**
   * Get watching status
   */
  isActive() {
    return this.isWatching;
  }

  /**
   * Get current reload queue
   */
  getQueue() {
    return [...this.reloadQueue];
  }

  /**
   * Force immediate reload
   */
  forceReload() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    this.processReloadQueue();
  }

  /**
   * Set debounce delay
   */
  setDebounceDelay(delay) {
    this.debounceDelay = Math.max(100, delay); // Minimum 100ms
  }
}

module.exports = HotReloader;
