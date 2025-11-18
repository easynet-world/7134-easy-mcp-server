/**
 * MCP Bridge Reloader
 * 
 * Manages external MCP server connections via bridge configuration.
 * Handles bridge server lifecycle, hot reloading of bridge configuration,
 * and environment variable mapping for bridge servers.
 * 
 * Features:
 * - Hot reloading of mcp-bridge.json configuration
 * - Automatic bridge server startup/shutdown
 * - Environment variable mapping (EASY_MCP_SERVER.* pattern)
 * - Schema adaptation for bridge tools
 * - Multiple bridge server support
 * - Graceful error handling for failed bridges
 * 
 * Configuration:
 * - Reads from mcp-bridge.json (or path from EASY_MCP_SERVER_BRIDGE_CONFIG_PATH)
 * - Supports disabled bridges via "disabled": true
 * - Automatically maps environment variables for each bridge server
 * 
 * @class MCPBridgeReloader
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const chokidar = require('chokidar');
const MCPBridge = require('../../mcp/utils/mcp-bridge');
const MCPHTTPBridge = require('../../mcp/utils/mcp-http-bridge');
const MCPSchemaAdapter = require('../../mcp/utils/mcp-schema-adapter');

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
    this.bridgesAttempted = false; // Track if we've already attempted to load bridges
    this.loadedBridgeIdentifiers = new Set(); // Track loaded bridge identifiers to prevent duplicates
    this.bridgeLoadingChain = []; // Track bridge loading chain to detect circular references
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
    
    // Return empty object instead of null to allow merging
    return env;
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

  /**
   * Check if a command exists in PATH
   * @param {string} command - The command name to check (must be a simple command name, no special chars)
   * @returns {boolean} - True if command exists, false otherwise
   */
  commandExists(command) {
    // Sanitize command name - only allow alphanumeric, dash, underscore
    if (!/^[a-zA-Z0-9_-]+$/.test(command)) {
      return false;
    }
    
    try {
      // Use 'which' on Unix-like systems, 'where' on Windows
      const isWindows = process.platform === 'win32';
      const checkCommand = isWindows ? 'where' : 'which';
      // Use spawnSync for better control and security
      const result = spawnSync(checkCommand, [command], { 
        stdio: 'ignore',
        shell: false
      });
      return result.status === 0;
    } catch (e) {
      return false;
    }
  }

  /**
   * Extract package name from npx command args
   * Handles formats like: test1@1.0.0, test1, @scope/test1@1.0.0
   * @param {string} packageSpec - Package specification from npx args
   * @returns {string} - Package name without version
   */
  extractPackageName(packageSpec) {
    if (!packageSpec) return null;
    // Remove version specifier (e.g., @1.0.0)
    const withoutVersion = packageSpec.replace(/@[\d.]+.*$/, '');
    // Remove scope prefix if present (e.g., @scope/package -> package)
    const parts = withoutVersion.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Generate a unique identifier for a bridge based on its configuration
   * This is used to detect duplicate bridges (same command/args/url with same config)
   * Includes cwd and env vars to allow same MCP with different configurations
   * @param {Object} serverConfig - Server configuration { name, command, args, url, cwd, env }
   * @param {string} resolvedCwd - Resolved working directory (absolute path)
   * @param {Object} finalEnv - Final merged environment variables
   * @returns {string} - Unique identifier for the bridge
   */
  getBridgeIdentifier({ name, command, args, url }, resolvedCwd = null, finalEnv = null) {
    if (url) {
      // For URL-based bridges, use normalized URL as identifier
      // URL-based bridges typically don't have cwd/env differences
      try {
        const urlObj = new URL(url);
        return `url:${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
      } catch (e) {
        return `url:${url}`;
      }
    } else if (command) {
      // For stdio-based bridges, include command, args, cwd, and env hash
      const normalizedArgs = Array.isArray(args) ? args.join(' ') : String(args || '');
      
      // Build base identifier
      let baseId;
      // Extract package name from npx commands for better deduplication
      if (command === 'npx' && normalizedArgs) {
        const packageName = this.extractPackageName(normalizedArgs.split(' ')[0]);
        if (packageName) {
          baseId = `stdio:npx:${packageName}`;
        } else {
          baseId = `stdio:${command}:${normalizedArgs}`;
        }
      } else {
        baseId = `stdio:${command}:${normalizedArgs}`;
      }
      
      // Include cwd if specified (allows same MCP from different directories)
      if (resolvedCwd) {
        baseId += `:cwd:${resolvedCwd}`;
      }
      
      // Include env vars hash if specified (allows same MCP with different config)
      // Only include config-specific env vars, not all inherited ones
      if (finalEnv && typeof finalEnv === 'object' && Object.keys(finalEnv).length > 0) {
        // Create a stable hash of env vars (sorted keys + values)
        // Exclude common system vars that don't affect MCP behavior
        const relevantEnv = {};
        const excludeKeys = ['PATH', 'HOME', 'USER', 'SHELL', 'PWD', 'TMPDIR', 'TMP', 'TEMP'];
        for (const [key, value] of Object.entries(finalEnv)) {
          if (!excludeKeys.includes(key) && value !== undefined && value !== null) {
            relevantEnv[key] = value;
          }
        }
        
        if (Object.keys(relevantEnv).length > 0) {
          // Create a simple hash from sorted env vars
          const envStr = Object.keys(relevantEnv)
            .sort()
            .map(key => `${key}=${String(relevantEnv[key])}`)
            .join('|');
          // Use a simple hash (first 16 chars of the string representation)
          // For better performance, we could use crypto.createHash, but this is simpler
          const envHash = Buffer.from(envStr).toString('base64').substring(0, 16);
          baseId += `:env:${envHash}`;
        }
      }
      
      return baseId;
    }
    // Fallback to name if no command/url
    return `name:${name}`;
  }

  /**
   * Check if loading a bridge would create a circular reference
   * @param {string} bridgeIdentifier - The bridge identifier to check
   * @param {string} bridgeName - The bridge name for error messages
   * @returns {boolean} - True if circular reference detected
   */
  wouldCreateCircularReference(bridgeIdentifier, bridgeName) {
    // Check if this bridge is already in the loading chain
    if (this.bridgeLoadingChain.includes(bridgeIdentifier)) {
      const chain = [...this.bridgeLoadingChain, bridgeIdentifier].join(' -> ');
      this.logger.warn(`⚠️  Circular bridge reference detected: ${chain}`);
      this.logger.warn(`   Bridge '${bridgeName}' would create a circular dependency and will be skipped.`);
      return true;
    }
    return false;
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
      const isStdioMode = process.env.EASY_MCP_SERVER_STDIO_MODE === 'true';
      if (!isStdioMode) {
        this.logger.log(`🔌 Loaded MCP bridge config from ${cfgPath}`);
      }
      return config;
    } catch (e) {
      this.logger.warn(`⚠️  Failed to parse ${cfgPath}: ${e.message}`);
      return {};
    }
  }

  // Resolve all server entries (Cursor-compatible). Returns array of { name, command, args, cwd, disabled, url }
  resolveAllServers(config) {
    const servers = [];
    if (config && config.mcpServers && typeof config.mcpServers === 'object') {
      for (const [name, entry] of Object.entries(config.mcpServers)) {
        if (entry) {
          // Check if this is a URL-based bridge
          if (entry.url) {
            servers.push({
              name,
              url: entry.url,
              disabled: entry.disabled === true,
              env: entry.env || null
            });
          } else if (entry.command || entry.args) {
            // This is a stdio-based bridge
            servers.push({
              name,
              command: entry.command,
              args: Array.isArray(entry.args) ? entry.args : [],
              cwd: entry.cwd || null,
              disabled: entry.disabled === true,
              env: entry.env || null
            });
          }
        }
      }
    }
    return servers;
  }

  ensureBridges() {
    // Only attempt to load bridges once, unless we have successful bridges
    // This prevents multiple initialization attempts when bridges fail
    if (this.bridgesAttempted && this.bridges.size === 0) {
      // Already attempted and no bridges succeeded - return empty map
      return this.bridges;
    }
    
    if (this.bridges.size === 0 && !this.bridgesAttempted) {
      this.bridgesAttempted = true; // Mark that we've attempted to load bridges
      
      if (process.env.EASY_MCP_SERVER_TEST_MODE === 'true') {
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
      // Skip bridges that have previously failed
      this.failedBridges = this.failedBridges || new Set();
      
      servers.forEach(({ name, command, args, cwd, disabled, env: configEnv, url }) => {
        // Skip disabled bridges
        if (disabled === true) {
          return;
        }
        
        // Skip bridges that have previously failed
        if (this.failedBridges.has(name)) {
          return;
        }

        // Build environment variables for this server from process.env
        const childEnv = this.buildServerEnv(name);
        
        // Merge config env with childEnv (config env takes precedence)
        const finalEnv = { ...childEnv, ...configEnv };
        
        // Resolve cwd if provided (for local projects)
        let resolvedCwd = null;
        if (cwd) {
          resolvedCwd = path.isAbsolute(cwd) ? cwd : path.resolve(this.root, cwd);
        }
        
        // Generate bridge identifier to check for duplicates
        // Include cwd and env to allow same MCP with different configurations
        const bridgeIdentifier = this.getBridgeIdentifier(
          { name, command, args, url },
          resolvedCwd,
          finalEnv
        );
        
        // Check for duplicate bridges (same command/args/url with same cwd/env already loaded)
        if (this.loadedBridgeIdentifiers.has(bridgeIdentifier)) {
          const isStdioMode = process.env.EASY_MCP_SERVER_STDIO_MODE === 'true';
          if (!isStdioMode) {
            this.logger.warn(`⚠️  Duplicate bridge detected: '${name}' (${bridgeIdentifier})`);
            this.logger.warn(`   This bridge is already loaded with the same configuration and will be skipped to avoid duplication.`);
          }
          return;
        }

        // Check for circular references
        if (this.wouldCreateCircularReference(bridgeIdentifier, name)) {
          return;
        }

        // Add to loading chain
        this.bridgeLoadingChain.push(bridgeIdentifier);
        
        try {
          // Handle URL-based bridges (HTTP/HTTPS)
          if (url) {
            try {
              const httpBridge = new MCPHTTPBridge({ 
                url, 
                quiet: this.quiet,
                timeout: 30000
              });
              
              // Wrap bridge with schema adapter for consistency
              const bridge = new MCPSchemaAdapter(httpBridge);
              
              // Initialize the bridge asynchronously
              (async () => {
                try {
                  await bridge.start();
                  this.bridges.set(name, bridge);
                  // Mark as loaded to prevent duplicates
                  this.loadedBridgeIdentifiers.add(bridgeIdentifier);
                  // Remove from loading chain
                  const index = this.bridgeLoadingChain.indexOf(bridgeIdentifier);
                  if (index > -1) {
                    this.bridgeLoadingChain.splice(index, 1);
                  }
                  const isStdioMode = process.env.EASY_MCP_SERVER_STDIO_MODE === 'true';
                  if (!isStdioMode) {
                    this.logger.log(`🔌 HTTP Bridge connected: ${name} (${url})`);
                  }
                } catch (error) {
                  // Remove from loading chain on failure
                  const index = this.bridgeLoadingChain.indexOf(bridgeIdentifier);
                  if (index > -1) {
                    this.bridgeLoadingChain.splice(index, 1);
                  }
                  this.logger.warn(`⚠️  HTTP Bridge '${name}' failed to initialize: ${error.message}`);
                  this.failedBridges = this.failedBridges || new Set();
                  this.failedBridges.add(name);
                }
              })();
              
              bridge.on('error', (err) => {
                this.logger.warn(`⚠️  HTTP Bridge '${name}' error: ${err && err.message ? err.message : String(err)}`);
                // Don't remove on error, just log it (HTTP bridges can have transient errors)
              });
              
              return; // Skip stdio bridge handling for URL bridges
            } catch (error) {
              // Remove from loading chain on failure
              const index = this.bridgeLoadingChain.indexOf(bridgeIdentifier);
              if (index > -1) {
                this.bridgeLoadingChain.splice(index, 1);
              }
              this.logger.warn(`⚠️  Failed to create HTTP Bridge '${name}': ${error.message}`);
              this.failedBridges = this.failedBridges || new Set();
              this.failedBridges.add(name);
              return;
            }
          }
          
          // Handle stdio-based bridges (existing logic)
          // Check if command exists before trying to spawn (for simple commands)
          // Skip check for npx/node/npm as they should always exist
          const isNpxCommand = command === 'npx' || command === 'node' || command === 'npm';
          if (!isNpxCommand && !this.commandExists(command)) {
            // Remove from loading chain on failure
            const index = this.bridgeLoadingChain.indexOf(bridgeIdentifier);
            if (index > -1) {
              this.bridgeLoadingChain.splice(index, 1);
            }
            const commandStr = [command, ...args].join(' ');
            this.logger.warn(`⚠️  MCP Bridge '${name}' failed to start: Command '${command}' not found`);
            this.logger.warn(`   Command: ${commandStr}`);
            this.logger.warn('   This bridge will be skipped. Remove it from mcp-bridge.json if not needed.');
            this.failedBridges = this.failedBridges || new Set();
            this.failedBridges.add(name);
            return;
          }
          
          const rawBridge = new MCPBridge({ command, args, quiet: this.quiet, env: finalEnv, cwd: resolvedCwd });
          
          // Wrap bridge with schema adapter for Chrome DevTools and other MCP servers
          const bridge = new MCPSchemaAdapter(rawBridge);
          
          // Track stderr messages to detect command/package errors
          const stderrMessages = [];
          let hasCommandError = false;
          let processExitedEarly = false;
          let exitCode = null;
          
          bridge.on('stderr', (msg) => {
            const errorMsg = msg.toString();
            stderrMessages.push(errorMsg);
            
            // Detect common command/package errors
            if (errorMsg.includes('could not determine executable') ||
                errorMsg.includes('npm error') ||
                errorMsg.includes('command not found') ||
                errorMsg.includes('ENOENT') ||
                errorMsg.includes('spawn') && errorMsg.includes('ENOENT')) {
              hasCommandError = true;
            }
          });
          
          // Track when process started to detect quick exits
          const processStartTime = Date.now();
          let processExitedQuickly = false;
          
          // Listen for process exit immediately to catch early failures
          const exitHandler = (code, _signal) => {
            const exitTime = Date.now();
            const timeSinceStart = exitTime - processStartTime;
            processExitedEarly = true;
            exitCode = code;
            
            // If process exits quickly (within 2 seconds) with non-zero code, it's likely a command/server error
            if (timeSinceStart < 2000 && code !== null && code !== 0) {
              processExitedQuickly = true;
              hasCommandError = true;
            } else if (!hasCommandError && (code !== null && code !== 0)) {
              // Even if it takes longer, a non-zero exit usually means something is wrong
              hasCommandError = true;
            }
          };
          
          // Try to start the bridge and handle failures gracefully
          bridge.start();
          
          // Attach exit handler if process is available (access through adapter)
          // Use a small delay to ensure proc is set after start()
          setTimeout(() => {
            const proc = bridge.proc || (bridge.bridge && bridge.bridge.proc);
            if (proc) {
              // Check if process already exited
              if (proc.exitCode !== null) {
                exitHandler(proc.exitCode, null);
              } else {
                proc.on('exit', exitHandler);
              }
            }
          }, 10);
          
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
            // Access proc through adapter (bridge.proc should work via proxy)
            const proc = bridge.proc || (bridge.bridge && bridge.bridge.proc);
            // Check if process exited early or has non-zero exit code
            const procExited = proc && proc.exitCode !== null;
            const procRunning = proc && proc.exitCode === null;
            
            if (procRunning) {
              this.bridges.set(name, bridge);
              // Mark as loaded to prevent duplicates
              this.loadedBridgeIdentifiers.add(bridgeIdentifier);
              // Remove from loading chain
              const index = this.bridgeLoadingChain.indexOf(bridgeIdentifier);
              if (index > -1) {
                this.bridgeLoadingChain.splice(index, 1);
              }
              const isStdioMode = process.env.EASY_MCP_SERVER_STDIO_MODE === 'true';
              if (!isStdioMode) {
                this.logger.log(`🔌 MCP Bridge started: ${name}`);
              }
            } else {
              // Remove from loading chain on failure
              const index = this.bridgeLoadingChain.indexOf(bridgeIdentifier);
              if (index > -1) {
                this.bridgeLoadingChain.splice(index, 1);
              }
              // Process exited or never started - determine error type
              // Consider it a command/server error if:
              // 1. We detected command errors from stderr
              // 2. Process exited early (within timeout window)
              // 3. Process exited with non-zero code (especially if quickly)
              const commandExists = this.commandExists(command);
              // Check if process exited - if proc is null or exitCode is set, it exited
              const actualExitCode = proc ? proc.exitCode : exitCode;
              const actuallyExited = !proc || proc.exitCode !== null || processExitedEarly;
              const hasNonZeroExit = actualExitCode !== null && actualExitCode !== 0;
              
              const isCommandNotFound = hasCommandError || processExitedEarly || processExitedQuickly || (actuallyExited && hasNonZeroExit);
              
              if (isCommandNotFound) {
                const commandStr = [command, ...args].join(' ');
                // Determine more specific error message
                let errorMsg = `⚠️  MCP Bridge '${name}' failed to start`;
                if (!commandExists) {
                  errorMsg += ': Command not found';
                } else if (processExitedQuickly || (actuallyExited && hasNonZeroExit)) {
                  errorMsg += ': Command exists but is not a valid MCP server or failed to start';
                } else if (processExitedEarly) {
                  errorMsg += ': Command exists but process exited unexpectedly';
                } else {
                  errorMsg += ': Command or package not found';
                }
                // Remove from loading chain on failure
                const failIndex = this.bridgeLoadingChain.indexOf(bridgeIdentifier);
                if (failIndex > -1) {
                  this.bridgeLoadingChain.splice(failIndex, 1);
                }
                
                this.logger.warn(errorMsg);
                this.logger.warn(`   Command: ${commandStr}`);
                
                // Check if this might be a local project (created with easy-mcp-server init)
                const isNpxCommand = command === 'npx' && args.length > 0 && args[0] === '-y';
                const packageSpec = isNpxCommand && args.length > 1 ? args[1] : null;
                const packageName = packageSpec ? this.extractPackageName(packageSpec) : null;
                
                if (isNpxCommand && packageName) {
                  // First, check if the package is globally installed and available as a command
                  const isGloballyInstalled = this.commandExists(packageName);
                  
                  if (isGloballyInstalled) {
                    this.logger.warn(`   💡 Package '${packageName}' appears to be globally installed.`);
                    this.logger.warn('   Use the binary directly instead of npx:');
                    this.logger.warn(`   "${name}": {`);
                    this.logger.warn(`     "command": "${packageName}",`);
                    this.logger.warn('     "args": []');
                    this.logger.warn('   }');
                  } else {
                    // Check multiple possible locations for local project
                    const possiblePaths = [
                      path.resolve(this.root, '..', packageName), // Sibling directory
                      path.resolve(this.root, packageName), // Subdirectory
                      path.resolve(process.cwd(), '..', packageName), // From cwd
                      path.resolve(process.cwd(), packageName) // From cwd subdirectory
                    ];
                    
                    let localProjectPath = null;
                    for (const possiblePath of possiblePaths) {
                      if (fs.existsSync(possiblePath) && fs.existsSync(path.join(possiblePath, 'package.json'))) {
                        // Check if it's an easy-mcp-server project
                        const packageJson = JSON.parse(fs.readFileSync(path.join(possiblePath, 'package.json'), 'utf8'));
                        if (packageJson.dependencies && packageJson.dependencies['easy-mcp-server']) {
                          localProjectPath = possiblePath;
                          break;
                        }
                      }
                    }
                    
                    if (localProjectPath) {
                      const relativePath = path.relative(this.root, localProjectPath);
                      this.logger.warn(`   💡 This appears to be a local project created with 'easy-mcp-server init ${packageName}'`);
                      this.logger.warn(`   Found at: ${localProjectPath}`);
                      this.logger.warn('   To use it as a bridge, update mcp-bridge.json:');
                      this.logger.warn(`   "${name}": {`);
                      this.logger.warn('     "command": "npx",');
                      this.logger.warn('     "args": ["easy-mcp-server"],');
                      this.logger.warn(`     "cwd": "${relativePath.startsWith('..') ? relativePath : '../' + relativePath}",`);
                      this.logger.warn('     "env": {');
                      this.logger.warn('       "EASY_MCP_SERVER_STDIO_MODE": "true"');
                      this.logger.warn('     }');
                      this.logger.warn('   }');
                      this.logger.warn('   Note: MCP bridges require STDIO mode. The env variable is required.');
                    } else {
                      this.logger.warn('   💡 If this is a local project, use a path-based command with STDIO mode:');
                      this.logger.warn('   Example: {');
                      this.logger.warn('     "command": "npx",');
                      this.logger.warn('     "args": ["easy-mcp-server"],');
                      this.logger.warn(`     "cwd": "../${packageName}",`);
                      this.logger.warn('     "env": { "EASY_MCP_SERVER_STDIO_MODE": "true" }');
                      this.logger.warn('   }');
                    }
                  }
                } else if (!isNpxCommand) {
                  // For non-npx commands, provide simpler error message
                  this.logger.warn(`   💡 Make sure the command '${command}' is installed and available in your PATH.`);
                }
                
                this.logger.warn('   This bridge will be skipped. Remove it from mcp-bridge.json if not needed.');
              } else {
                this.logger.warn(`⚠️  MCP Bridge '${name}' failed to start - check your environment variables (EASY_MCP_SERVER.${name.toLowerCase()}.*)`);
              }
              // Mark as failed to prevent retries
              this.failedBridges = this.failedBridges || new Set();
              this.failedBridges.add(name);
            }
          }, 1000);
          
        } catch (err) {
          this.logger.warn(`⚠️  Failed to start MCP Bridge '${name}': ${err && err.message ? err.message : String(err)}`);
          // Mark as failed to prevent retries
          this.failedBridges = this.failedBridges || new Set();
          this.failedBridges.add(name);
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
    // Clear failed bridges on config change so they can be retried
    if (this.failedBridges) {
      this.failedBridges.clear();
    }
    // Reset attempted flag so bridges can be retried after config change
    this.bridgesAttempted = false;
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


