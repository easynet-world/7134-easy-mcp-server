const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const MCPBridge = require('./mcp-bridge');

class MCPBridgeReloader {
  constructor(options = {}) {
    this.root = options.root || process.cwd();
    // Handle empty EASY_MCP_SERVER_BRIDGE_CONFIG_PATH - if empty, don't load bridge
    const bridgeConfigPath = process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH;
    this.configFile = options.configFile || (bridgeConfigPath && bridgeConfigPath.trim() !== '' ? bridgeConfigPath : 'mcp-bridge.json');
    this.logger = options.logger || console;
    this.watcher = null;
    this.bridges = new Map(); // name -> MCPBridge
    this.quiet = options.quiet || false;
  }


  // Build environment variables for MCP server based on EASY_MCP_SERVER.[SERVER_NAME].[PARAM] pattern
  buildServerEnv(serverName) {
    const env = {};
    const prefix = `EASY_MCP_SERVER.${serverName.toLowerCase()}.`;
    
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix)) {
        // Convert EASY_MCP_SERVER.github.token -> GITHUB_TOKEN
        const paramName = key.substring(prefix.length);
        // Convert snake_case to UPPER_CASE for the final environment variable
        const envKey = paramName.toUpperCase().replace(/\./g, '_');
        env[envKey] = value;
      }
    }
    
    return Object.keys(env).length > 0 ? env : null;
  }

  setQuiet(quiet) {
    this.quiet = quiet;
  }

  getConfigPath() {
    // Check multiple locations in priority order:
    // 1. Explicit path from environment variable (absolute or relative to cwd)
    // 2. Current working directory
    // 3. Project root (where package.json is located)
    // 4. Package directory (fallback to package's example config)
    
    const bridgeConfigPath = process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH;
    
    if (bridgeConfigPath && bridgeConfigPath.trim() !== '') {
      // Use explicit path from environment variable
      if (path.isAbsolute(bridgeConfigPath)) {
        return bridgeConfigPath;
      } else {
        return path.resolve(this.root, bridgeConfigPath);
      }
    }
    
    // Check current working directory first
    const cwdPath = path.join(this.root, this.configFile);
    if (fs.existsSync(cwdPath)) {
      return cwdPath;
    }
    
    // Check project root (where package.json is located)
    const projectRoot = this.findProjectRoot();
    if (projectRoot && projectRoot !== this.root) {
      const projectPath = path.join(projectRoot, this.configFile);
      if (fs.existsSync(projectPath)) {
        return projectPath;
      }
    }
    
    // Fallback to current working directory (will return non-existent path)
    return cwdPath;
  }
  
  findProjectRoot() {
    let currentDir = this.root;
    const maxDepth = 10; // Prevent infinite loops
    let depth = 0;
    
    while (currentDir && depth < maxDepth) {
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          // Check if this is a project that uses easy-mcp-server
          if (packageJson.dependencies && packageJson.dependencies['easy-mcp-server']) {
            return currentDir;
          }
        } catch (e) {
          // Ignore parse errors, continue searching
        }
      }
      currentDir = path.dirname(currentDir);
      depth++;
    }
    
    return null;
  }

  loadConfig() {
    const cfgPath = this.getConfigPath();
    if (!fs.existsSync(cfgPath)) {
      this.logger.log(`🔌 No MCP bridge config found at ${cfgPath}`);
      return {};
    }
    
    try {
      const raw = fs.readFileSync(cfgPath, 'utf8');
      const config = JSON.parse(raw);
      this.logger.log(`🔌 Loaded MCP bridge config from ${cfgPath}`);
      return config;
    } catch (e) {
      this.logger.warn(`⚠️  Failed to parse ${cfgPath}: ${e.message}`);
      return {};
    }
  }

  // Resolve all server entries (Cursor-compatible). Returns array of { name, command, args }
  resolveAllServers(config) {
    const servers = [];
    if (config && config.mcpServers && typeof config.mcpServers === 'object') {
      for (const [name, entry] of Object.entries(config.mcpServers)) {
        if (entry && (entry.command || entry.args)) {
          servers.push({
            name,
            command: entry.command,
            args: Array.isArray(entry.args) ? entry.args : []
          });
        }
      }
    }
    return servers;
  }

  ensureBridges() {
    if (this.bridges.size === 0) {
      if (process.env.NODE_ENV === 'test') {
        // Provide a disabled stub in tests
        this.bridges.set('disabled', {
          rpcRequest: async () => ({ jsonrpc: '2.0', id: 0, result: { disabled: true } }),
          on: () => {}
        });
        return this.bridges;
      }
      
      // Check if EASY_MCP_SERVER_BRIDGE_CONFIG_PATH is empty or not set
      const bridgeConfigPath = process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH;
      if (!bridgeConfigPath || bridgeConfigPath.trim() === '') {
        // If bridge config path is empty, don't load any bridges
        this.logger.log('🔌 MCP Bridge disabled - EASY_MCP_SERVER_BRIDGE_CONFIG_PATH is empty');
        return this.bridges;
      }
      
      const rawCfg = this.loadConfig();
      const servers = this.resolveAllServers(rawCfg);
      servers.forEach(({ name, command, args }) => {
        try {
          // Build environment variables for this server
          const childEnv = this.buildServerEnv(name);
          
          const bridge = new MCPBridge({ command, args, quiet: this.quiet, env: childEnv });
          
          // Try to start the bridge and handle failures gracefully
          bridge.start();
          
          bridge.on('notification', (msg) => {
            try {
              if (msg && msg.method === 'notifications/configChanged') {
                this.logger.log(`♻️  MCP Bridge hot refresh from ${name}`);
              }
            } catch (err) {
              this.logger.warn(`⚠️  MCP Bridge notification handler error (${name}): ${err && err.message ? err.message : String(err)}`);
            }
          });
          
          bridge.on('error', (err) => {
            this.logger.warn(`⚠️  MCP Bridge '${name}' error: ${err && err.message ? err.message : String(err)}`);
            // Remove failed bridge from the map
            this.bridges.delete(name);
          });
          
          // Check if bridge started successfully after a short delay
          setTimeout(() => {
            if (bridge.proc && bridge.proc.exitCode === null) {
              this.bridges.set(name, bridge);
              this.logger.log(`🔌 MCP Bridge started: ${name}`);
            } else {
              this.logger.warn(`⚠️  MCP Bridge '${name}' failed to start - check your environment variables (EASY_MCP_SERVER.${name.toLowerCase()}.*)`);
            }
          }, 1000);
          
        } catch (err) {
          this.logger.warn(`⚠️  Failed to start MCP Bridge '${name}': ${err && err.message ? err.message : String(err)}`);
        }
      });
    }
    return this.bridges;
  }


  restartBridges() {
    if (this.bridges.size > 0) {
      for (const [, bridge] of this.bridges) {
        if (bridge && typeof bridge.stop === 'function') bridge.stop();
      }
      this.bridges.clear();
    }
    this.ensureBridges();
    this.logger.log('🔄 MCP Bridges reloaded due to config change');
  }

  startWatching() {
    if (this.watcher) return;
    const cfgPath = this.getConfigPath();
    this.ensureBridges();
    this.watcher = chokidar.watch(cfgPath, {
      ignoreInitial: true,
      persistent: true
    });
    this.watcher.on('add', () => this.restartBridges());
    this.watcher.on('change', () => this.restartBridges());
    this.watcher.on('unlink', () => this.restartBridges());
  }

  stopWatching() {
    if (this.watcher) {
      try { this.watcher.close(); } catch (err) {
        this.logger.warn(`⚠️  MCP Bridge watcher close error: ${err && err.message ? err.message : String(err)}`);
      }
      this.watcher = null;
    }
    if (this.bridges.size > 0) {
      for (const [, bridge] of this.bridges) {
        if (bridge && typeof bridge.stop === 'function') bridge.stop();
      }
      this.bridges.clear();
    }
  }

  getBridge(name) {
    return this.bridges.get(name);
  }

  listBridgeNames() {
    return Array.from(this.bridges.keys());
  }
}

module.exports = MCPBridgeReloader;


