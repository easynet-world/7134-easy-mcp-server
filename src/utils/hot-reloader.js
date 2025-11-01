/**
 * Hot Reloading Service
 * Watches for API file changes and automatically reloads routes
 */

const chokidar = require('chokidar');
const path = require('path');
const PackageInstaller = require('./dev/package-installer');
const PackageDetector = require('./dev/package-detector');

class HotReloader {
  constructor(apiLoader, mcpServer, options = {}) {
    this.apiLoader = apiLoader;
    this.mcpServer = mcpServer;
    this.watcher = null;
    this.isWatching = false;
    this.reloadQueue = [];
    this.isReloading = false;
    this.debounceTimeout = null;
    this.debounceDelay = 1000; // 1 second debounce
    
    // Package installation features
    this.autoInstallEnabled = options.autoInstall !== false; // Default to true
    this.packageInstaller = new PackageInstaller({
      userCwd: options.userCwd || process.cwd(),
      logger: options.logger || console
    });
    this.packageDetector = new PackageDetector({
      logger: options.logger || console
    });
  }

  /**
   * Start watching for file changes
   */
  startWatching() {
    if (this.isWatching) {
      console.log('⚠️  Hot reloading is already active');
      return;
    }

    if (process.env.EASY_MCP_SERVER_PRODUCTION_MODE === 'true') {
      console.log('ℹ️  Hot reloading disabled in production');
      return;
    }

    console.log('🔄 Setting up hot reloading for API files...');

    // Watch the configured API path rather than a hardcoded 'api/'
    const apiRoot = this.apiLoader && this.apiLoader.apiPath
      ? this.apiLoader.apiPath
      : path.join(process.cwd(), 'api');
    const watchPattern = path.join(apiRoot, '**/*.js');

    this.watcher = chokidar.watch(watchPattern, {
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
    const base = (this.apiLoader && this.apiLoader.apiPath) || process.cwd();
    const relativePath = path.relative(base, filePath);
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
      // Step 1: Detect and install missing packages for new/changed files
      if (this.autoInstallEnabled) {
        await this.handlePackageInstallation(items);
      }
      
      // Step 2: Clear cache for all changed files
      items.forEach(item => {
        this.apiLoader.clearCache(item.filePath);
      });
      
      // Step 3: Reload all routes (clear express routes first to avoid duplicates)
      try {
        const stack = this.apiLoader.app && this.apiLoader.app._router && this.apiLoader.app._router.stack;
        if (Array.isArray(stack)) {
          this.apiLoader.app._router.stack = stack.filter(layer => {
            return !(layer && layer.route && layer.route.path);
          });
        }
      } catch (e) { /* ignore route cleanup errors */ }

      const newRoutes = this.apiLoader.reloadAPIs();
      
      // Step 4: Update MCP server if available
      if (this.mcpServer) {
        this.mcpServer.setRoutes(newRoutes);
        console.log(`🔄 MCP Server: Routes updated (${newRoutes.length} routes)`);
        
        // Step 4.1: Refresh MCP cache if available
        if (this.mcpServer.cacheManager) {
          this.mcpServer.cacheManager.clearCache('all');
          console.log('🔄 MCP Cache: Cleared cache for hot reload');
        }
      
        // Step 4.2: Notify clients about all MCP components refresh
        this.notifyMCPComponentsRefresh();
      }
      
      // Step 5: Validate routes
      if (this.apiLoader.validateRoutes) {
        const validationIssues = this.apiLoader.validateRoutes();
        if (validationIssues.length > 0) {
          console.warn('⚠️  Route validation issues:');
          validationIssues.forEach(issue => console.warn(`  - ${issue}`));
        }
      }
      
      // Step 6: Check for loading errors
      if (this.apiLoader.getErrors) {
        const errors = this.apiLoader.getErrors();
        if (errors.length > 0) {
          console.warn('⚠️  API loading errors:');
          errors.forEach(error => console.warn(`  - ${error}`));
        }
      }
      
      console.log(`✅ Hot reload complete: ${newRoutes.length} routes loaded`);
      
    } catch (error) {
      console.error(`❌ Hot reload failed: ${error.message}`);
    } finally {
      this.isReloading = false;
    }
  }

  /**
   * Handle package installation for changed files
   */
  async handlePackageInstallation(items) {
    try {
      // Only process added and changed files (not removed files)
      const filesToAnalyze = items.filter(item => 
        item.event === 'added' || item.event === 'changed'
      );

      if (filesToAnalyze.length === 0) {
        return;
      }

      console.log(`📦 Analyzing ${filesToAnalyze.length} files for package dependencies...`);

      // Detect required packages from all changed files
      const filePaths = filesToAnalyze.map(item => item.filePath);
      const requiredPackages = this.packageDetector.detectPackagesFromFiles(filePaths);

      if (requiredPackages.length === 0) {
        console.log('📦 No external package dependencies detected');
        return;
      }

      console.log(`📦 Detected packages: ${requiredPackages.join(', ')}`);

      // Check which packages are missing and install them
      const missingPackages = requiredPackages.filter(pkg => 
        !this.packageInstaller.isPackageInstalled(pkg)
      );

      if (missingPackages.length === 0) {
        console.log('📦 All required packages are already installed');
        return;
      }

      console.log(`📦 Installing missing packages: ${missingPackages.join(', ')}`);
      
      const installResult = await this.packageInstaller.installMissingPackagesForFile(
        filesToAnalyze[0].filePath, // Use first file as reference
        missingPackages
      );

      if (installResult.success) {
        console.log(`✅ Successfully installed packages: ${installResult.installed.join(', ')}`);
      } else {
        console.warn(`⚠️  Failed to install some packages: ${installResult.failed ? installResult.failed.join(', ') : 'unknown'}`);
        console.warn('💡 You may need to install them manually: npm install <package-name>');
      }

    } catch (error) {
      console.warn(`⚠️  Package installation analysis failed: ${error.message}`);
      // Don't throw - let the hot reload continue
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

  /**
   * Enable or disable auto package installation
   */
  setAutoInstall(enabled) {
    this.autoInstallEnabled = enabled;
    console.log(`📦 Auto package installation ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get package installation status
   */
  getPackageInstallStatus() {
    return {
      autoInstallEnabled: this.autoInstallEnabled,
      installerStatus: this.packageInstaller.getStatus(),
      knownPackages: this.packageDetector.getKnownPackages()
    };
  }

  /**
   * Manually install packages
   */
  async installPackages(packages, options = {}) {
    if (!this.autoInstallEnabled) {
      console.log('📦 Auto package installation is disabled');
      return { success: false, reason: 'disabled' };
    }

    return await this.packageInstaller.installPackages(packages, options);
  }

  /**
   * Check if a package is installed
   */
  isPackageInstalled(packageName) {
    return this.packageInstaller.isPackageInstalled(packageName);
  }

  /**
   * Detect packages from a file
   */
  detectPackagesFromFile(filePath) {
    return this.packageDetector.detectPackagesFromFile(filePath);
  }

  /**
   * Add known packages to the detector
   */
  addKnownPackages(packages) {
    this.packageDetector.addKnownPackages(packages);
  }

  /**
   * Notify connected clients about MCP components refresh after hot reload
   */
  notifyMCPComponentsRefresh() {
    if (!this.mcpServer) {
      return;
    }

    console.log('🔄 Notifying clients about MCP components refresh...');
    
    try {
      // Notify about tools/routes changes (already handled by setRoutes)
      // The setRoutes method already calls notifyRouteChanges()
      
      // Notify about prompts changes
      if (this.mcpServer.notifyPromptsChanged) {
        this.mcpServer.notifyPromptsChanged();
      }
      
      // Notify about resources changes  
      if (this.mcpServer.notifyResourcesChanged) {
        this.mcpServer.notifyResourcesChanged();
      }
      
      // Send a comprehensive refresh notification
      this.mcpServer.broadcastNotification({
        jsonrpc: '2.0',
        method: 'notifications/mcpComponentsRefreshed',
        params: {
          timestamp: new Date().toISOString(),
          components: ['tools', 'prompts', 'resources'],
          message: 'All MCP components have been refreshed due to hot reload'
        }
      });
      
      console.log('✅ MCP components refresh notifications sent to all connected clients');
      
    } catch (error) {
      console.warn('⚠️  Failed to notify clients about MCP components refresh:', error.message);
    }
  }
}

module.exports = HotReloader;
