const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const MCPBridge = require('./mcp-bridge');

class MCPBridgeReloader {
  constructor(options = {}) {
    this.root = options.root || process.cwd();
    this.configFile = options.configFile || process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH || 'mcp-bridge.json';
    this.logger = options.logger || console;
    this.watcher = null;
    this.bridges = new Map(); // name -> MCPBridge
    this.quiet = options.quiet || false;
  }

  setQuiet(quiet) {
    this.quiet = quiet;
  }

  getConfigPath() {
    return path.join(this.root, this.configFile);
  }

  loadConfig() {
    const cfgPath = this.getConfigPath();
    if (!fs.existsSync(cfgPath)) return {};
    try {
      const raw = fs.readFileSync(cfgPath, 'utf8');
      return JSON.parse(raw);
    } catch (e) {
      this.logger.warn(`⚠️  Failed to parse ${this.configFile}: ${e.message}`);
      return {};
    }
  }

  // Resolve all server entries (Cursor-compatible). Returns array of { name, command, args }
  resolveAllServers(config) {
    const servers = [];
    if (config && config.mcpServers && typeof config.mcpServers === 'object') {
      for (const [name, entry] of Object.entries(config.mcpServers)) {
        if (entry && (entry.command || entry.args)) {
          servers.push({ name, command: entry.command, args: Array.isArray(entry.args) ? entry.args : [] });
        }
      }
    }
    return servers;
  }

  ensureBridges() {
    if (this.bridges.size === 0) {
      if (process.env.NODE_ENV === 'test' || process.env.EASY_MCP_SERVER_BRIDGE_ENABLED === 'false') {
        // Provide a disabled stub in tests/disabled mode
        this.bridges.set('disabled', {
          rpcRequest: async () => ({ jsonrpc: '2.0', id: 0, result: { disabled: true } }),
          on: () => {}
        });
        return this.bridges;
      }
      const rawCfg = this.loadConfig();
      const servers = this.resolveAllServers(rawCfg);
      servers.forEach(({ name, command, args }) => {
        try {
          const bridge = new MCPBridge({ command, args, quiet: this.quiet });
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
          this.bridges.set(name, bridge);
          this.logger.log(`🔌 MCP Bridge started: ${name}`);
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


