/**
 * MCP (Model Context Protocol) Server
 * Handles AI model communication and API execution
 */

const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const MCPCacheManager = require('../../utils/mcp/mcp-cache-manager');
const SchemaNormalizer = require('../utils/schema-normalizer');
const ToolBuilder = require('../builders/tool-builder');
const ToolExecutor = require('../executors/tool-executor');
const PromptHandler = require('../handlers/prompt-handler');
const ResourceHandler = require('../handlers/resource-handler');
const HTTPHandler = require('../handlers/http-handler');
const WebSocketHandler = require('../handlers/websocket-handler');
const MCPRequestProcessor = require('../processors/mcp-request-processor');

class DynamicAPIMCPServer {
  constructor(host = '0.0.0.0', port = parseInt(process.env.EASY_MCP_SERVER_MCP_PORT) || 8888, options = {}) {
    this.host = host;
    this.port = port;
    this.wss = null;
    this.server = null;
    this.clients = new Set();
    this.httpClients = new Map();
    
    // Don't import server module to avoid circular dependency
    this.getLoadedRoutes = () => [];
    
    // Initialize prompts and resources storage
    this.prompts = new Map();
    this.resources = new Map();
    
    // Add quiet mode option
    this.quiet = options.quiet || process.env.EASY_MCP_SERVER_QUIET === 'true';
    
    // Enhanced performance monitoring and metrics
    this.metrics = {
      startTime: Date.now(),
      requestCount: 0,
      errorCount: 0,
      toolCalls: 0,
      promptRequests: 0,
      resourceRequests: 0,
      bridgeRequests: 0,
      averageResponseTime: 0,
      responseTimes: [],
      errorTypes: new Map(),
      lastActivity: Date.now()
    };
    
    // Enhanced error handling configuration
    this.errorHandling = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      enableDetailedErrors: options.enableDetailedErrors !== false,
      logLevel: options.logLevel || 'info'
    };
    
    // Enhanced logging methods with structured logging
    this.log = (level, message, data = {}) => {
      if (!this.quiet && this.shouldLog(level)) {
        const timestamp = new Date().toISOString();
        // Structured log entry for future use (currently unused but kept for potential structured logging)
        // const logEntry = {
        //   timestamp,
        //   level,
        //   message,
        //   data,
        //   server: 'mcp-server',
        //   host: this.host,
        //   port: this.port
        // };
        
        if (level === 'error') {
          console.error(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data);
        } else if (level === 'warn') {
          console.warn(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data);
        } else {
          console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data);
        }
      }
    };
    
    this.warn = (message, data = {}) => {
      this.log('warn', message, data);
    };
    
    this.error = (message, data = {}) => {
      this.log('error', message, data);
      this.metrics.errorCount++;
    };
    
    this.info = (message, data = {}) => {
      this.log('info', message, data);
    };
    
    this.debug = (message, data = {}) => {
      this.log('debug', message, data);
    };
    
    // Helper method to determine if we should log at this level
    this.shouldLog = (level) => {
      const levels = { debug: 0, info: 1, warn: 2, error: 3 };
      return levels[level] >= levels[this.errorHandling.logLevel];
    };
    
    // Performance tracking methods
    this.trackRequest = (type, startTime, success = true, errorType = null) => {
      const responseTime = Date.now() - startTime;
      this.metrics.requestCount++;
      this.metrics.lastActivity = Date.now();
      
      if (success) {
        // Map type to specific metric counters
        if (type === 'tool') {
          this.metrics.toolCalls++;
        } else if (type === 'prompt') {
          this.metrics.promptRequests++;
        } else if (type === 'resource') {
          this.metrics.resourceRequests++;
        } else if (type === 'bridge') {
          this.metrics.bridgeRequests++;
        } else {
          // Generic counter for other types
          this.metrics[`${type}Requests`] = (this.metrics[`${type}Requests`] || 0) + 1;
        }
      } else {
        this.metrics.errorCount++;
        if (errorType) {
          this.metrics.errorTypes.set(errorType, (this.metrics.errorTypes.get(errorType) || 0) + 1);
        }
      }
      
      // Track response times (keep last 100)
      this.metrics.responseTimes.push(responseTime);
      if (this.metrics.responseTimes.length > 100) {
        this.metrics.responseTimes.shift();
      }
      
      // Calculate average response time
      this.metrics.averageResponseTime = this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length;
    };
    
    // Enhanced error handling method
    this.handleError = (error, context = {}) => {
      const errorInfo = {
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
        server: 'mcp-server'
      };
      
      this.error('MCP Server Error', errorInfo);
      
      // Return structured error response
      return {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: this.errorHandling.enableDetailedErrors ? error.message : 'Internal Server Error',
          data: this.errorHandling.enableDetailedErrors ? errorInfo : undefined
        }
      };
    };
    
    // Initialize MCP Cache Manager for intelligent caching
    // Use configured base path instead of hardcoded './mcp'
    const originalBasePath = options.mcp?.basePath || './mcp';
    
    // Check if custom MCP directory exists, otherwise fall back to package directory
    const fs = require('fs');
    // Resolve custom path: if relative, resolve from current working directory; if absolute, use as-is
    const customMcpPath = path.isAbsolute(originalBasePath) 
      ? originalBasePath 
      : path.resolve(process.cwd(), originalBasePath);
    // Resolve package MCP directory from project root (go up from src/mcp/core to project root, then to mcp)
    const packageMcpPath = path.resolve(__dirname, '..', '..', '..', 'mcp');
    
    let resolvedBasePath;
    if (!fs.existsSync(customMcpPath)) {
      console.log(`🔌 MCP Server: Custom MCP directory not found at ${customMcpPath}, falling back to package directory`);
      resolvedBasePath = packageMcpPath;
    } else {
      console.log(`🔌 MCP Server: Using custom MCP directory at ${customMcpPath}`);
      resolvedBasePath = customMcpPath;
    }
    
    this.cacheManager = new MCPCacheManager(resolvedBasePath, {
      enableHotReload: true,
      logger: options.logger,
      onChange: ({ type }) => {
        // Broadcast notifications when cache detects changes
        if (type === 'prompts') {
          this.notifyPromptsChanged();
        } else if (type === 'resources') {
          this.notifyResourcesChanged();
        }
      }
    });
    
    // Store the resolved base path for internal use
    this.resolvedBasePath = resolvedBasePath;
    
    // Initialize modular components
    this.schemaNormalizer = new SchemaNormalizer();
    this.toolBuilder = new ToolBuilder(this.schemaNormalizer);
    this.toolExecutor = new ToolExecutor();
    
    // Initialize prompt and resource handlers (will be set up after config is available)
    this.promptHandler = null;
    this.resourceHandler = null;
    
    // Expose schema normalization methods for backward compatibility
    this.normalizeNestedSchema = (schema) => this.schemaNormalizer.normalizeNestedSchema(schema);
    this.flattenBodyProperties = (bodySchema, inputSchema) => 
      this.schemaNormalizer.flattenBodyProperties(bodySchema, inputSchema, (s) => this.schemaNormalizer.normalizeNestedSchema(s));
    this.safeExtractParameterSchema = (p) => this.schemaNormalizer.safeExtractParameterSchema(p);
    
    // Configuration options
    this.config = {
      mcp: {
        basePath: originalBasePath, // Store the original base path for reference
        prompts: {
          enabled: options.prompts?.enabled !== false,
          directory: options.prompts?.directory || path.join(originalBasePath, 'prompts'),
          watch: options.prompts?.watch !== false,
          // Support any file format by default - let the system auto-detect
          formats: options.prompts?.formats || ['*'],
          // Enable template parameter substitution
          enableTemplates: options.prompts?.enableTemplates !== false
        },
        resources: {
          enabled: options.resources?.enabled !== false,
          directory: options.resources?.directory || path.join(originalBasePath, 'resources'),
          watch: options.resources?.watch !== false,
          // Support any file format by default - let the system auto-detect
          formats: options.resources?.formats || ['*'],
          // Enable template parameter substitution
          enableTemplates: options.resources?.enableTemplates !== false
        }
      }
    };
    
    // Optional bridge reloader to merge external MCP tools
    this.bridgeReloader = options.bridgeReloader || null;
    
    // Pass quiet mode to bridge reloader if available
    if (this.bridgeReloader && this.bridgeReloader.setQuiet) {
      this.bridgeReloader.setQuiet(this.quiet);
    }

    // Initialize prompt and resource handlers after config is set
    this.promptHandler = new PromptHandler(this.prompts, this.config, this.resolvedBasePath, this.cacheManager);
    this.resourceHandler = new ResourceHandler(this.resources, this.config, this.resolvedBasePath, this.cacheManager);
    
    // Initialize request processor, HTTP and WebSocket handlers (will be set up after methods are available)
    this.mcpRequestProcessor = null;
    this.httpHandler = null;
    this.wsHandler = null;
  }

  /**
   * Attach listeners to MCP bridge servers and forward notifications to MCP clients.
   * Also refresh and broadcast merged tools on relevant notifications.
   */
  attachBridgeListeners() {
    if (!this.bridgeReloader) return;
    try {
      const bridges = this.bridgeReloader.ensureBridges();
      for (const [, bridge] of bridges.entries()) {
        if (!bridge || typeof bridge.on !== 'function') continue;
        bridge.on('notification', async (msg) => {
          try {
            // Forward any bridge notification to clients for visibility
            this.broadcastNotification({
              jsonrpc: '2.0',
              method: msg?.method || 'notifications/bridge',
              params: msg?.params || { source: 'bridge' }
            });

            // On config/tools changes, refresh merged tools and notify clients
            const method = msg && msg.method ? String(msg.method) : '';
            if (method.includes('tools') || method.includes('configChanged')) {
              const mergedTools = await this.buildMergedToolsList();
              this.broadcastNotification({
                jsonrpc: '2.0',
                method: 'notifications/toolsChanged',
                params: { tools: mergedTools }
              });
            }
          } catch (_) {
            // ignore notification forwarding errors
          }
        });
      }
    } catch (_) {
      // ignore
    }
  }

  /**
   * @deprecated Use this.schemaNormalizer.normalizeNestedSchema() instead
   * Kept for backward compatibility - delegates to SchemaNormalizer
   */
  normalizeNestedSchema(schema) {
    return this.schemaNormalizer.normalizeNestedSchema(schema);
  }
  
  /**
   * @deprecated Use this.schemaNormalizer.flattenBodyProperties() instead
   * Kept for backward compatibility - delegates to SchemaNormalizer
   */
  flattenBodyProperties(bodySchema, inputSchema) {
    return this.schemaNormalizer.flattenBodyProperties(
      bodySchema,
      inputSchema,
      (s) => this.schemaNormalizer.normalizeNestedSchema(s)
    );
  }

  /**
   * Build the merged tools list from local routes and bridge servers.
   */
  async buildMergedToolsList() {
    const routes = this.getLoadedRoutes();
    const tools = routes.map(route => {
      const processor = route.processorInstance;
      const openApi = processor?.openApi;

      // Build standard flat MCP tool inputSchema format
      const inputSchema = {
        type: 'object',
        properties: {},
        required: []
      };

      // Add query, header, and path parameters directly to properties
      if (Array.isArray(openApi?.parameters) && openApi.parameters.length > 0) {
        for (const p of openApi.parameters) {
          if (!p || !p.name || !p.in) continue;
          const propValue = this.safeExtractParameterSchema(p);
          inputSchema.properties[p.name] = propValue;
          if (p.required) {
            inputSchema.required.push(p.name);
          }
        }
      }

      // Handle request body: flatten nested object properties to top level
      if (openApi?.requestBody?.content?.['application/json']?.schema) {
        const bodySchema = openApi.requestBody.content['application/json'].schema;
        this.flattenBodyProperties(bodySchema, inputSchema);
        if (openApi.requestBody.required && bodySchema.type !== 'object') {
          inputSchema.required.push('body');
        }
      }

      // Handle path parameters from route pattern
      if (!openApi?.parameters || !openApi.parameters.some(p => p.in === 'path')) {
        const matches = route.path.match(/:([A-Za-z0-9_]+)/g) || [];
        for (const m of matches) {
          const name = m.slice(1);
          if (!inputSchema.properties[name]) {
            inputSchema.properties[name] = { type: 'string', description: `${name} parameter` };
            inputSchema.required.push(name);
          }
        }
      }

      const normalizedInputSchema = this.normalizeNestedSchema(inputSchema);

      return {
        name: `${route.method.toLowerCase()}_${route.path.replace(/\//g, '_').replace(/^_/, '')}`,
        description: processor?.mcpDescription || openApi?.description || processor?.description || `Execute ${route.method} request to ${route.path}`,
        inputSchema: normalizedInputSchema,
        responseSchema: openApi?.responses?.['200']?.content?.['application/json']?.schema || null,
        method: route.method,
        path: route.path,
        tags: openApi?.tags || ['api']
      };
    });

    if (this.bridgeReloader) {
      try {
        const bridges = this.bridgeReloader.ensureBridges();
        for (const [serverName, bridge] of bridges.entries()) {
          try {
            const bridgeResult = await bridge.rpcRequest('tools/list', {}, 5000); // 5 second timeout
            if (bridgeResult && Array.isArray(bridgeResult.tools)) {
              bridgeResult.tools.forEach(t => {
                // Skip null/undefined tools
                if (!t || typeof t !== 'object') {
                  console.warn(`⚠️  Skipping invalid bridge tool from ${serverName}`);
                  return;
                }
                
                // Only strip prefixes from Chrome DevTools to avoid naming conflicts
                let cleanName = t.name;
                if (!cleanName) {
                  console.warn(`⚠️  Skipping bridge tool without name from ${serverName}`);
                  return;
                }
                
                if (serverName === 'chrome') {
                  const prefixes = ['chrome_', 'mcp_'];
                  for (const prefix of prefixes) {
                    if (cleanName.startsWith(prefix)) {
                      cleanName = cleanName.substring(prefix.length);
                      break;
                    }
                  }
                }
                
                // Safely process inputSchema - handle various formats
                let inputSchema = { type: 'object', properties: {} };
                if (t.inputSchema) {
                  if (typeof t.inputSchema === 'object') {
                    // Ensure inputSchema has required structure
                    inputSchema = {
                      type: t.inputSchema.type || 'object',
                      properties: t.inputSchema.properties || {},
                      ...(t.inputSchema.required && { required: t.inputSchema.required }),
                      ...(t.inputSchema.additionalProperties !== undefined && { additionalProperties: t.inputSchema.additionalProperties })
                    };
                  }
                }
                
                tools.push({
                  name: cleanName, // Cleaned name (only for Chrome tools)
                  description: `[${serverName}] ${t.description || 'Bridge tool'}`,
                  inputSchema: inputSchema,
                  responseSchema: null,
                  tags: ['bridge', serverName],
                  // Store original name for mapping back when calling the tool
                  _bridgeToolName: t.name,
                  _bridgeServerName: serverName
                });
              });
            }
          } catch (e) {
            // Log bridge errors but don't fail the whole list
            console.warn(`⚠️  Bridge tools unavailable: ${e.message}`);
          }
        }
      } catch (_) {
        // ignore overall bridge errors
      }
    }
    return tools;
  }

  /**
   * Set routes after server is loaded
   */
  setRoutes(routes) {
    console.log('🔌 MCP Server: Setting routes:', routes.length);
    console.log('🔌 MCP Server: Route details:', routes.map(r => ({ method: r.method, path: r.path })));
    this.getLoadedRoutes = () => routes;
    
    // Auto-discover prompts and resources from API routes
    this.discoverPromptsAndResources(routes);
    
    // Load prompts and resources from filesystem
    this.loadPromptsAndResourcesFromFilesystem().catch(error => {
      console.warn('⚠️  MCP Server: Failed to load prompts and resources:', error.message);
    });
    
    // Notify all connected clients about route changes
    this.notifyRouteChanges(routes);
    
    // Also notify about prompts and resources changes after hot reload
    this.notifyPromptsChanged();
    this.notifyResourcesChanged();
  }

  /**
   * @deprecated Use this.promptHandler.addPrompt() instead
   */
  addPrompt(prompt) {
    return this.promptHandler.addPrompt(prompt);
  }

  /**
   * @deprecated Use this.resourceHandler.addResource() instead
   */
  addResource(resource) {
    return this.resourceHandler.addResource(resource);
  }

  /**
   * Discover prompts and resources from API routes
   */
  discoverPromptsAndResources(routes) {
    this.promptHandler.discoverPromptsFromRoutes(routes);
    this.resourceHandler.discoverResourcesFromRoutes(routes);
  }

  /**
   * Load prompts and resources from filesystem
   */
  async loadPromptsAndResourcesFromFilesystem() {
    await Promise.all([
      this.promptHandler.loadPromptsFromFilesystem(),
      this.resourceHandler.loadResourcesFromFilesystem()
    ]);
    console.log(`🔌 MCP Server: Loaded ${this.prompts.size} prompts and ${this.resources.size} resources from filesystem`);
  }

  /**
   * @deprecated Use this.promptHandler.loadPromptsFromDirectory() instead
   */
  async loadPromptsFromDirectory(dirPath, baseDir = null) {
    return this.promptHandler.loadPromptsFromDirectory(dirPath, baseDir);
  }

  /**
   * @deprecated Use this.promptHandler.loadPromptFromFile() instead
   */
  async loadPromptFromFile(filePath, baseDir = null) {
    return this.promptHandler.loadPromptFromFile(filePath, baseDir);
  }

  /**
   * @deprecated Use this.resourceHandler.loadResourcesFromDirectory() instead
   */
  async loadResourcesFromDirectory(dirPath, baseDir = null) {
    return this.resourceHandler.loadResourcesFromDirectory(dirPath, baseDir);
  }

  /**
   * @deprecated Use this.resourceHandler.loadResourceFromFile() instead
   */
  async loadResourceFromFile(filePath, baseDir = null) {
    return this.resourceHandler.loadResourceFromFile(filePath, baseDir);
  }

  /**
   * @deprecated Use this.promptHandler.setupPromptsWatcher() instead
   */
  setupPromptsWatcher() {
    return this.promptHandler.setupPromptsWatcher(() => this.notifyPromptsChanged());
  }

  /**
   * @deprecated Use this.resourceHandler.setupResourcesWatcher() instead
   */
  setupResourcesWatcher() {
    return this.resourceHandler.setupResourcesWatcher(() => this.notifyResourcesChanged());
  }

  /**
   * @deprecated Use this.promptHandler.removePromptByFilePath() instead
   */
  removePromptByFilePath(filePath) {
    return this.promptHandler.removePromptByFilePath(filePath);
  }

  /**
   * @deprecated Use this.resourceHandler.removeResourceByFilePath() instead
   */
  removeResourceByFilePath(filePath) {
    return this.resourceHandler.removeResourceByFilePath(filePath);
  }

  /**
   * Notify clients about prompts changes
   */
  notifyPromptsChanged() {
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/promptsChanged',
      params: {
        // Include both static and cached prompts
        prompts: []
      }
    };

    // Build payload including cached prompts (if available)
    (async () => {
      try {
        const staticPrompts = Array.from(this.prompts.values()).map(prompt => ({
          name: prompt.name,
          description: prompt.description,
          arguments: prompt.arguments || [],
          source: 'static'
        }));
        let cachedPrompts = [];
        if (this.cacheManager) {
          cachedPrompts = await this.cacheManager.getPrompts();
        }
        notification.params.prompts = [...staticPrompts, ...cachedPrompts];
      } catch (e) {
        // Fallback to static only
        notification.params.prompts = Array.from(this.prompts.values()).map(prompt => ({
          name: prompt.name,
          description: prompt.description,
          arguments: prompt.arguments || [],
          source: 'static'
        }));
      } finally {
        this.broadcastNotification(notification);
      }
    })();
  }

  /**
   * Notify clients about resources changes
   */
  notifyResourcesChanged() {
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/resourcesChanged',
      params: {
        // Include both static and cached resources
        resources: []
      }
    };

    // Build payload including cached resources (if available)
    (async () => {
      try {
        const staticResources = Array.from(this.resources.values()).map(resource => ({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
          source: 'static'
        }));
        let cachedResources = [];
        if (this.cacheManager) {
          cachedResources = await this.cacheManager.getResources();
        }
        notification.params.resources = [...staticResources, ...cachedResources];
      } catch (e) {
        // Fallback to static only
        notification.params.resources = Array.from(this.resources.values()).map(resource => ({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
          source: 'static'
        }));
      } finally {
        this.broadcastNotification(notification);
      }
    })();
  }

  /**
   * Broadcast notification to all connected clients
   */
  broadcastNotification(notification) {
    // Notify WebSocket clients
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(notification));
      }
    });

    // Notify HTTP clients
    this.httpClients.forEach((res, clientId) => {
      try {
        res.write(`data: ${JSON.stringify(notification)}\n\n`);
      } catch (error) {
        // Remove disconnected clients
        this.httpClients.delete(clientId);
      }
    });
  }

  /**
   * Create HTTP and WebSocket server
   */
  createServer() {
    // Initialize handlers
    this.mcpRequestProcessor = new MCPRequestProcessor(this, {
      toolBuilder: this.toolBuilder,
      toolExecutor: this.toolExecutor,
      promptHandler: this.promptHandler,
      resourceHandler: this.resourceHandler,
      schemaNormalizer: this.schemaNormalizer,
      getLoadedRoutes: this.getLoadedRoutes.bind(this),
      trackRequest: this.trackRequest.bind(this),
      handleError: this.handleError.bind(this)
    });
    
    this.httpHandler = new HTTPHandler(this, {
      processMCPRequest: this.mcpRequestProcessor.processMCPRequest.bind(this.mcpRequestProcessor)
    });
    
    this.wsHandler = new WebSocketHandler(this, {
      getLoadedRoutes: this.getLoadedRoutes.bind(this),
      toolBuilder: this.toolBuilder,
      toolExecutor: this.toolExecutor,
      promptHandler: this.promptHandler,
      resourceHandler: this.resourceHandler,
      schemaNormalizer: this.schemaNormalizer
    });
    
    // Create HTTP server with explicit IPv4 binding
    this.server = http.createServer();
    // Harden against server errors to avoid process crashes
    this.server.on('error', (err) => {
      try {
        console.error('❌ MCP HTTP server error (continuing):', err);
      } catch (logErr) { /* ignore logging error */ }
    });
    
    // Add HTTP endpoints for MCP Inspector compatibility
    this.server.on('request', (req, res) => {
      try {
        this.httpHandler.handleHTTPRequest(req, res);
      } catch (err) {
        try {
          console.error('❌ MCP HTTP request handling error:', err);
        } catch (logErr) { /* ignore logging error */ }
        try {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
        } catch (writeErr) { /* ignore write error */ }
      }
    });
    
    // Log the host configuration for debugging
    console.log(`🔌 MCP Server: Host configured as: ${this.host}`);
  }
  
  /**
   * Create WebSocket server after HTTP server is bound
   */
  createWebSocketServer() {
    // Create WebSocket server with explicit host binding
    // Try to force IPv4 binding by creating server independently
    this.wss = new WebSocket.Server({ 
      server: this.server,
      host: this.host,  // Explicitly set the host for WebSocket binding
      family: 4,  // Force IPv4 family
      // Additional options to force IPv4 binding
      perMessageDeflate: false,
      clientTracking: true
    });
    
    this.wss.on('connection', (ws) => {
      console.log('🔌 New MCP WebSocket client connected');
      this.clients.add(ws);
      
      ws.on('message', (message) => {
        this.wsHandler.handleMessage(ws, message);
      });
      
      ws.on('close', () => {
        console.log('🔌 MCP WebSocket client disconnected');
        this.clients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error('❌ MCP WebSocket client error:', error.message);
        this.clients.delete(ws);
      });
    });
  }

  /**
   * Handle HTTP requests
   */
  /**
   * @deprecated Use this.httpHandler.handleHTTPRequest() instead
   */
  handleHTTPRequest(req, res) {
    return this.httpHandler.handleHTTPRequest(req, res);
  }

  /**
   * @deprecated Use this.httpHandler.tryServeStatic() instead
   */
  tryServeStatic(req, res) {
    return this.httpHandler.tryServeStatic(req, res, {
      getContentTypeByExt: (ext) => this.httpHandler.getContentTypeByExt(ext)
    });
  }

  /**
   * @deprecated Use this.httpHandler.serveFileIfExists() instead
   */
  serveFileIfExists(filePath, res) {
    return this.httpHandler.serveFileIfExists(filePath, res, {
      getContentTypeByExt: (ext) => this.httpHandler.getContentTypeByExt(ext)
    });
  }

  /**
   * @deprecated Use this.httpHandler.getContentTypeByExt() instead
   */
  getContentTypeByExt(ext) {
    return this.httpHandler.getContentTypeByExt(ext);
  }

  /**
   * @deprecated Use this.httpHandler.handleMCPInfoPage() instead
   */
  handleMCPInfoPage(req, res) {
    return this.httpHandler.handleMCPInfoPage(req, res);
  }

  /**
   * @deprecated Use this.httpHandler.handleSSEConnection() instead
   */
  handleSSEConnection(req, res) {
    return this.httpHandler.handleSSEConnection(req, res, {
      httpClients: this.httpClients,
      cacheManager: this.cacheManager
    });
  }

  /**
   * @deprecated Use this.httpHandler.handleHTTPMCPRequest() instead
   */
  handleHTTPMCPRequest(req, res) {
    return this.httpHandler.handleHTTPMCPRequest(req, res);
  }

  /**
   * @deprecated Use this.httpHandler.handleStreamableHttpRequest() instead
   */
  handleStreamableHttpRequest(req, res) {
    return this.httpHandler.handleStreamableHttpRequest(req, res);
  }

  /**
   * @deprecated Use this.mcpRequestProcessor.processMCPRequest() instead
   */
  async processMCPRequest(data) {
    // Lazy initialization if not already initialized
    if (!this.mcpRequestProcessor) {
      this.mcpRequestProcessor = new MCPRequestProcessor(this, {
        toolBuilder: this.toolBuilder,
        toolExecutor: this.toolExecutor,
        promptHandler: this.promptHandler,
        resourceHandler: this.resourceHandler,
        schemaNormalizer: this.schemaNormalizer,
        getLoadedRoutes: this.getLoadedRoutes.bind(this),
        trackRequest: this.trackRequest.bind(this),
        handleError: this.handleError.bind(this)
      });
    }
    return this.mcpRequestProcessor.processMCPRequest(data);
  }
  
  /**
   * @deprecated Legacy method - delegates to MCPRequestProcessor
   */
  async processMCPRequestLegacy(data) {
    const startTime = Date.now();
    
    try {
      let result;
      
      if (data.method === 'tools/list') {
        result = await this.processListTools(data);
        this.trackRequest('tool', startTime, true);
      } else if (data.method === 'tools/call') {
        result = await this.processCallTool(data);
        this.trackRequest('tool', startTime, true);
      } else if (data.method === 'prompts/list') {
        result = await this.processListPrompts(data);
        this.trackRequest('prompt', startTime, true);
      } else if (data.method === 'prompts/get') {
        result = await this.processGetPrompt(data);
        this.trackRequest('prompt', startTime, true);
      } else if (data.method === 'resources/list') {
        result = await this.processListResources(data);
        this.trackRequest('resource', startTime, true);
      } else if (data.method === 'resources/read') {
        result = await this.processReadResource(data);
        this.trackRequest('resource', startTime, true);
      } else if (data.method === 'resources/templates/list') {
        result = await this.processListResourceTemplates(data);
        this.trackRequest('resource', startTime, true);
      } else if (data.method === 'ping') {
        result = { 
          jsonrpc: '2.0', 
          id: data.id, 
          result: { type: 'pong' } 
        };
        this.trackRequest('ping', startTime, true);
      } else if (data.method === 'cache/stats') {
        result = await this.processCacheStats(data);
        this.trackRequest('cache', startTime, true);
      } else if (data.method === 'cache/clear') {
        result = await this.processCacheClear(data);
        this.trackRequest('cache', startTime, true);
      } else if (data.method === 'health') {
        result = await this.processHealth(data);
        this.trackRequest('health', startTime, true);
      } else if (data.method === 'metrics') {
        result = await this.processMetrics(data);
        this.trackRequest('metrics', startTime, true);
      } else {
        this.trackRequest('unknown', startTime, false, 'method_not_found');
        return { 
          jsonrpc: '2.0', 
          id: data.id, 
          error: { 
            code: -32601, 
            message: `Method not found: ${data.method}` 
          } 
        };
      }
      
      return result;
    } catch (error) {
      this.trackRequest('error', startTime, false, 'internal_error');
      return this.handleError(error, { method: data.method, id: data.id });
    }
  }

  /**
   * @deprecated Use this.mcpRequestProcessor.processListTools() instead
   */
  async processListTools(data) {
    return this.mcpRequestProcessor.processListTools(data);
  }

  /**
   * @deprecated Use this.mcpRequestProcessor.processCallTool() instead
   */
  async processCallTool(data) {
    const { name, arguments: args } = data.params || data;
    
    try {
      const result = await this.toolExecutor.executeTool(name, args, {
        getLoadedRoutes: this.getLoadedRoutes.bind(this),
        bridgeReloader: this.bridgeReloader,
        executeAPIEndpoint: (route, args) => this.toolExecutor.executeAPIEndpoint(route, args, {
          schemaNormalizer: this.schemaNormalizer
        })
      });
      
      return {
        jsonrpc: '2.0',
        id: data.id,
        result
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: data.id,
        error: {
          code: -32602,
          message: error.message || `Tool not found: ${name}`
        }
      };
    }
  }

  /**
   * Handle WebSocket messages
   */
  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
      case 'list_tools':
        this.handleListTools(ws, data);
        break;
      case 'call_tool':
        this.handleCallTool(ws, data);
        break;
      case 'list_prompts':
        this.handleListPrompts(ws, data);
        break;
      case 'get_prompt':
        this.handleGetPrompt(ws, data);
        break;
      case 'list_resources':
        this.handleListResources(ws, data);
        break;
      case 'read_resource':
        this.handleReadResource(ws, data);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', id: data.id }));
        break;
      default:
        ws.send(JSON.stringify({
          type: 'error',
          id: data.id,
          error: `Unknown message type: ${data.type}`
        }));
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        error: `Invalid JSON: ${error.message}`
      }));
    }
  }

  /**
   * Handle WebSocket tools/list request
   */
  async handleListTools(ws, data) {
    try {
      const routes = this.getLoadedRoutes();
      console.log('🔍 MCP Server: Routes loaded:', routes.length);
      console.log('🔍 MCP Server: Route details:', routes.map(r => ({ method: r.method, path: r.path })));
      
      const tools = routes.map(route => {
        const processor = route.processorInstance;
        let openApi = processor?.openApi;
        // Fallback: generate OpenAPI on the fly if missing or incomplete
        try {
          const needsFallback = !openApi || (!openApi.requestBody && !Array.isArray(openApi.parameters));
          if (needsFallback) {
            const { apiSpecTs } = require('../../utils/api/openapi-helper');
            openApi = apiSpecTs(route.filePath);
          }
        } catch (_) { /* ignore fallback errors */ }
        
        // Build standard flat MCP tool inputSchema format
        const inputSchema = {
          type: 'object',
          properties: {},
          required: []
        };

        // Add query, header, and path parameters directly to properties
        if (Array.isArray(openApi?.parameters) && openApi.parameters.length > 0) {
          for (const p of openApi.parameters) {
            if (!p || !p.name || !p.in) continue;
            const propValue = this.safeExtractParameterSchema(p);
            inputSchema.properties[p.name] = propValue;
            if (p.required) {
              inputSchema.required.push(p.name);
            }
          }
        }

        // Handle request body: merge properties into top level if object schema
        if (openApi?.requestBody?.content?.['application/json']?.schema) {
          const bodySchema = openApi.requestBody.content['application/json'].schema;
          if (bodySchema.type === 'object' && bodySchema.properties) {
            for (const [key, value] of Object.entries(bodySchema.properties)) {
              inputSchema.properties[key] = value;
            }
            if (bodySchema.required && Array.isArray(bodySchema.required)) {
              for (const reqField of bodySchema.required) {
                if (!inputSchema.required.includes(reqField)) {
                  inputSchema.required.push(reqField);
                }
              }
            }
          } else {
            inputSchema.properties.body = this.normalizeNestedSchema(bodySchema);
            if (openApi.requestBody.required) {
              inputSchema.required.push('body');
            }
          }
        }

        // Handle path parameters from route pattern
        if (!openApi?.parameters || !openApi.parameters.some(p => p.in === 'path')) {
          const matches = route.path.match(/:([A-Za-z0-9_]+)/g) || [];
          for (const m of matches) {
            const name = m.slice(1);
            if (!inputSchema.properties[name]) {
              inputSchema.properties[name] = { type: 'string', description: `${name} parameter` };
              inputSchema.required.push(name);
            }
          }
        }

        const normalizedInputSchema = this.normalizeNestedSchema(inputSchema);
        
        // Use same naming convention as HTTP /mcp/tools for stability in inspectors
        const toolName = `api_${route.path.replace(/\//g, '_')}_${route.method.toLowerCase()}`;
        return {
          name: toolName,
          description: processor?.mcpDescription || openApi?.description || processor?.description || `Execute ${route.method} request to ${route.path}`,
          inputSchema: normalizedInputSchema,
          // Add response schema information
          responseSchema: openApi?.responses?.['200']?.content?.['application/json']?.schema || null,
          // Add additional metadata
          method: route.method,
          path: route.path,
          tags: openApi?.tags || ['api'],
          processor: route.processor
        };
      });
      
      ws.send(JSON.stringify({
        type: 'list_tools_response',
        id: data.id,
        tools,
        totalTools: tools.length
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        id: data.id,
        error: `Failed to list tools: ${error.message}`
      }));
    }
  }

  /**
   * Handle WebSocket tools/call request
   */
  async handleCallTool(ws, data) {
    try {
      const { name, arguments: args } = data;
      
      // Parse the tool name to get method and path (format: [full_path]/[http_method])
      const lastSlashIndex = name.lastIndexOf('/');
      const method = name.substring(lastSlashIndex + 1); // Everything after the last slash is the method
      const path = name.substring(0, lastSlashIndex); // Everything before the last slash is the path
      
      console.log('🔍 MCP Server: Tool call request:', { name, method, path });
      
      // Find the route
      const routes = this.getLoadedRoutes();
      console.log('🔍 MCP Server: Available routes:', routes.map(r => ({ method: r.method, path: r.path })));
      
      const route = routes.find(r => 
        r.method.toUpperCase() === method.toUpperCase() && 
        r.path === path
      );
      
      console.log('🔍 MCP Server: Found route:', route);
      
      if (!route) {
        throw new Error(`API endpoint not found: ${method.toUpperCase()} ${path}`);
      }
      
      // Execute the API endpoint
      const result = await this.executeAPIEndpoint(route, args);
      
      ws.send(JSON.stringify({
        type: 'call_tool_response',
        id: data.id,
        result
      }));
      
    } catch (error) {
      console.error('❌ MCP Server: Error in handleCallTool:', error.message);
      ws.send(JSON.stringify({
        type: 'error',
        id: data.id,
        error: `Error executing API endpoint: ${error.message}`
      }));
    }
  }

  /**
   * Handle WebSocket prompts/list request
   */
  async handleListPrompts(ws, data) {
    try {
      const prompts = Array.from(this.prompts.values()).map(prompt => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments || []
      }));
      
      ws.send(JSON.stringify({
        type: 'list_prompts_response',
        id: data.id,
        prompts,
        totalPrompts: prompts.length
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        id: data.id,
        error: `Failed to list prompts: ${error.message}`
      }));
    }
  }

  /**
   * Handle WebSocket prompts/get request
   */
  async handleGetPrompt(ws, data) {
    try {
      const { name, arguments: args } = data;
      let prompt = null;
      
      // Try to get from cache first (if available)
      if (this.cacheManager) {
        try {
          const cachedPrompts = await this.cacheManager.getPrompts();
          prompt = cachedPrompts.find(p => p.name === name);
        } catch (error) {
          console.warn('⚠️  MCP Server: Failed to get cached prompts:', error.message);
        }
      }
      
      // If not found in cache, try static prompts
      if (!prompt) {
        prompt = this.prompts.get(name);
      }
      
      if (!prompt) {
        throw new Error(`Prompt not found: ${name}`);
      }
      
      // Process template with arguments if provided
      // Handle both 'template' and 'content' fields for compatibility
      let processedTemplate = prompt.template || prompt.content || '';
      if (args && prompt.arguments && processedTemplate) {
        prompt.arguments.forEach(arg => {
          if (args[arg.name] !== undefined) {
            const placeholder = new RegExp(`{{${arg.name}}}`, 'g');
            processedTemplate = processedTemplate.replace(placeholder, args[arg.name]);
          }
        });
      }
      
      ws.send(JSON.stringify({
        type: 'get_prompt_response',
        id: data.id,
        result: {
          description: prompt.description,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: processedTemplate
              }
            }
          ]
        }
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        id: data.id,
        error: `Error getting prompt: ${error.message}`
      }));
    }
  }

  /**
   * Handle WebSocket resources/list request
   */
  async handleListResources(ws, data) {
    try {
      const resources = Array.from(this.resources.values()).map(resource => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType
      }));
      
      ws.send(JSON.stringify({
        type: 'list_resources_response',
        id: data.id,
        resources,
        totalResources: resources.length
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        id: data.id,
        error: `Failed to list resources: ${error.message}`
      }));
    }
  }

  /**
   * Handle WebSocket resources/read request with template support
   */
  async handleReadResource(ws, data) {
    try {
      const { uri, arguments: args } = data;
      let resource = null;
      
      // Try to get from cache first (if available)
      if (this.cacheManager) {
        try {
          const cachedResources = await this.cacheManager.getResources();
          resource = cachedResources.find(r => r.uri === uri);
        } catch (error) {
          console.warn('⚠️  MCP Server: Failed to get cached resources:', error.message);
        }
      }
      
      // If not found in cache, try static resources
      if (!resource) {
        resource = this.resources.get(uri);
      }
      
      if (!resource) {
        throw new Error(`Resource not found: ${uri}`);
      }
      
      // Process template with arguments if provided and resource has parameters
      // Handle both 'content' and 'template' fields for compatibility
      let processedContent = resource.content || resource.template || '';
      if (args && resource.hasParameters && this.config.mcp.resources.enableTemplates && processedContent) {
        resource.parameters.forEach(param => {
          if (args[param] !== undefined) {
            const placeholder = new RegExp(`{{${param}}}`, 'g');
            processedContent = processedContent.replace(placeholder, args[param]);
          }
        });
      }
      
      ws.send(JSON.stringify({
        type: 'read_resource_response',
        id: data.id,
        result: {
          contents: [
            {
              uri: resource.uri,
              mimeType: resource.mimeType,
              text: processedContent
            }
          ],
          // Add template metadata if available
          ...(resource.hasParameters && {
            template: {
              hasParameters: resource.hasParameters,
              parameters: resource.parameters,
              parameterCount: resource.parameterCount
            }
          })
        }
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        id: data.id,
        error: `Error reading resource: ${error.message}`
      }));
    }
  }

  /**
   * @deprecated Use this.mcpRequestProcessor.processListPrompts() instead
   */
  async processListPrompts(data) {
    if (!this.mcpRequestProcessor) {
      this.mcpRequestProcessor = new MCPRequestProcessor(this, {
        toolBuilder: this.toolBuilder,
        toolExecutor: this.toolExecutor,
        promptHandler: this.promptHandler,
        resourceHandler: this.resourceHandler,
        schemaNormalizer: this.schemaNormalizer,
        getLoadedRoutes: this.getLoadedRoutes.bind(this),
        trackRequest: this.trackRequest.bind(this),
        handleError: this.handleError.bind(this)
      });
    }
    return this.mcpRequestProcessor.processListPrompts(data);
  }
  
  /**
   * @deprecated Legacy method - delegates to MCPRequestProcessor
   */
  async processListPromptsLegacy(data) {
    try {
      // Get static prompts from memory
      const staticPrompts = Array.from(this.prompts.values()).map(prompt => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments || [],
        source: 'static'
      }));

      // Get cached prompts (with hot swapping)
      const cachedPrompts = await this.cacheManager.getPrompts();

      // Combine static and cached prompts
      const allPrompts = [...staticPrompts, ...cachedPrompts];
      
      return {
        jsonrpc: '2.0',
        id: data.id,
        result: {
          prompts: allPrompts,
          total: allPrompts.length,
          static: staticPrompts.length,
          cached: cachedPrompts.length,
          cacheStats: this.cacheManager.getCacheStats().prompts
        }
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: data.id,
        error: {
          code: -32603,
          message: `Failed to list prompts: ${error.message}`
        }
      };
    }
  }

  /**
   * @deprecated Use this.mcpRequestProcessor.processGetPrompt() instead
   */
  async processGetPrompt(data) {
    if (!this.mcpRequestProcessor) {
      this.mcpRequestProcessor = new MCPRequestProcessor(this, {
        toolBuilder: this.toolBuilder,
        toolExecutor: this.toolExecutor,
        promptHandler: this.promptHandler,
        resourceHandler: this.resourceHandler,
        schemaNormalizer: this.schemaNormalizer,
        getLoadedRoutes: this.getLoadedRoutes.bind(this),
        trackRequest: this.trackRequest.bind(this),
        handleError: this.handleError.bind(this)
      });
    }
    return this.mcpRequestProcessor.processGetPrompt(data);
  }
  
  /**
   * @deprecated Legacy method - delegates to MCPRequestProcessor
   */
  async processGetPromptLegacy(data) {
    const { name, arguments: args } = data.params || data;
    let prompt = null;
    
    // Try to get from cache first (if available)
    if (this.cacheManager) {
      try {
        const cachedPrompts = await this.cacheManager.getPrompts();
        prompt = cachedPrompts.find(p => p.name === name);
      } catch (error) {
        console.warn('⚠️  MCP Server: Failed to get cached prompts:', error.message);
      }
    }
    
    // If not found in cache, try static prompts
    if (!prompt) {
      prompt = this.prompts.get(name);
    }
    
    if (!prompt) {
      return {
        jsonrpc: '2.0',
        id: data.id,
        error: {
          code: -32602,
          message: `Prompt not found: ${name}`
        }
      };
    }
    
    // Process template with arguments if provided
    // Handle both 'template' and 'content' fields for compatibility
    let processedTemplate = prompt.template || prompt.content || '';
    if (args && prompt.arguments && processedTemplate) {
      prompt.arguments.forEach(arg => {
        if (args[arg.name] !== undefined) {
          const placeholder = new RegExp(`{{${arg.name}}}`, 'g');
          processedTemplate = processedTemplate.replace(placeholder, args[arg.name]);
        }
      });
    }
    
    return {
      jsonrpc: '2.0',
      id: data.id,
      result: {
        description: prompt.description,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: processedTemplate
            }
          }
        ]
      }
    };
  }

  /**
   * @deprecated Use this.mcpRequestProcessor.processListResources() instead
   */
  async processListResources(data) {
    if (!this.mcpRequestProcessor) {
      this.mcpRequestProcessor = new MCPRequestProcessor(this, {
        toolBuilder: this.toolBuilder,
        toolExecutor: this.toolExecutor,
        promptHandler: this.promptHandler,
        resourceHandler: this.resourceHandler,
        schemaNormalizer: this.schemaNormalizer,
        getLoadedRoutes: this.getLoadedRoutes.bind(this),
        trackRequest: this.trackRequest.bind(this),
        handleError: this.handleError.bind(this)
      });
    }
    return this.mcpRequestProcessor.processListResources(data);
  }
  
  /**
   * @deprecated Legacy method - delegates to MCPRequestProcessor
   */
  async processListResourcesLegacy(data) {
    try {
      // Get static resources from memory
      const staticResources = Array.from(this.resources.values()).map(resource => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
        source: 'static'
      }));

      // Get cached resources (with hot swapping)
      const cachedResources = await this.cacheManager.getResources();

      // Combine static and cached resources
      const allResources = [...staticResources, ...cachedResources];
      
      return {
        jsonrpc: '2.0',
        id: data.id,
        result: {
          resources: allResources,
          total: allResources.length,
          static: staticResources.length,
          cached: cachedResources.length,
          cacheStats: this.cacheManager.getCacheStats().resources
        }
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: data.id,
        error: {
          code: -32603,
          message: `Failed to list resources: ${error.message}`
        }
      };
    }
  }

  /**
   * Get MIME type for file extension
   */
  /**
   * @deprecated Use this.resourceHandler.getMimeTypeForExtension() instead
   */
  getMimeTypeForExtension(ext) {
    return this.resourceHandler.getMimeTypeForExtension(ext);
  }
  
  /**
   * @deprecated Legacy method - delegates to ResourceHandler
   */
  getMimeTypeForExtensionLegacy(ext) {
    const mimeTypes = {
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.yaml': 'application/x-yaml',
      '.yml': 'application/x-yaml',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.py': 'text/x-python',
      '.java': 'text/x-java-source',
      '.cpp': 'text/x-c++src',
      '.c': 'text/x-csrc',
      '.h': 'text/x-chdr',
      '.hpp': 'text/x-c++hdr',
      '.cs': 'text/x-csharp',
      '.php': 'text/x-php',
      '.rb': 'text/x-ruby',
      '.go': 'text/x-go',
      '.rs': 'text/x-rust',
      '.swift': 'text/x-swift',
      '.kt': 'text/x-kotlin',
      '.scala': 'text/x-scala',
      '.sh': 'text/x-shellscript',
      '.bash': 'text/x-shellscript',
      '.zsh': 'text/x-shellscript',
      '.fish': 'text/x-fish',
      '.ps1': 'text/x-powershell',
      '.bat': 'text/x-msdos-batch',
      '.cmd': 'text/x-msdos-batch',
      '.html': 'text/html',
      '.htm': 'text/html',
      '.xml': 'text/xml',
      '.css': 'text/css',
      '.scss': 'text/x-scss',
      '.sass': 'text/x-sass',
      '.less': 'text/x-less',
      '.sql': 'text/x-sql',
      '.r': 'text/x-r',
      '.m': 'text/x-objective-c',
      '.mm': 'text/x-objective-c++',
      '.pl': 'text/x-perl',
      '.pm': 'text/x-perl',
      '.lua': 'text/x-lua',
      '.dart': 'text/x-dart',
      '.elm': 'text/x-elm',
      '.clj': 'text/x-clojure',
      '.cljs': 'text/x-clojure',
      '.hs': 'text/x-haskell',
      '.ml': 'text/x-ocaml',
      '.fs': 'text/x-fsharp',
      '.vb': 'text/x-vb',
      '.asm': 'text/x-asm',
      '.s': 'text/x-asm',
      '.tex': 'text/x-tex',
      '.rst': 'text/x-rst',
      '.adoc': 'text/x-asciidoc',
      '.asciidoc': 'text/x-asciidoc',
      '.org': 'text/x-org',
      '.wiki': 'text/x-wiki',
      '.toml': 'text/x-toml',
      '.ini': 'text/x-ini',
      '.cfg': 'text/x-config',
      '.conf': 'text/x-config',
      '.properties': 'text/x-properties',
      '.env': 'text/x-env',
      '.dockerfile': 'text/x-dockerfile',
      '.makefile': 'text/x-makefile',
      '.cmake': 'text/x-cmake',
      '.gradle': 'text/x-gradle',
      '.maven': 'text/x-maven',
      '.pom': 'text/x-maven',
      '.log': 'text/x-log',
      '.diff': 'text/x-diff',
      '.patch': 'text/x-patch',
      '.csv': 'text/csv',
      '.tsv': 'text/tab-separated-values',
      '.rtf': 'text/rtf',
      '.vtt': 'text/vtt',
      '.srt': 'text/x-subrip',
      '.sub': 'text/x-subviewer',
      '.smi': 'text/x-sami'
    };
    
    return mimeTypes[ext.toLowerCase()] || 'text/plain';
  }

  /**
   * @deprecated Use this.mcpRequestProcessor.processListResourceTemplates() instead
   */
  async processListResourceTemplates(data) {
    return this.mcpRequestProcessor.processListResourceTemplates(data);
  }
  
  /**
   * @deprecated Legacy method - delegates to MCPRequestProcessor
   */
  async processListResourceTemplatesLegacy(data) {
    try {
      // Get all resources that have template parameters
      const allResources = Array.from(this.resources.values());
      const templateResources = allResources.filter(resource => resource.hasParameters);
      
      return {
        jsonrpc: '2.0',
        id: data.id,
        result: {
          resourceTemplates: templateResources.map(resource => ({
            uri: resource.uri,
            uriTemplate: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType,
            parameters: resource.parameters,
            parameterCount: resource.parameterCount,
            isTemplate: resource.isTemplate
          })),
          total: templateResources.length
        }
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: data.id,
        error: {
          code: -32603,
          message: `Failed to list resource templates: ${error.message}`
        }
      };
    }
  }

  /**
   * @deprecated Use this.mcpRequestProcessor.processReadResource() instead
   */
  async processReadResource(data) {
    if (!this.mcpRequestProcessor) {
      this.mcpRequestProcessor = new MCPRequestProcessor(this, {
        toolBuilder: this.toolBuilder,
        toolExecutor: this.toolExecutor,
        promptHandler: this.promptHandler,
        resourceHandler: this.resourceHandler,
        schemaNormalizer: this.schemaNormalizer,
        getLoadedRoutes: this.getLoadedRoutes.bind(this),
        trackRequest: this.trackRequest.bind(this),
        handleError: this.handleError.bind(this)
      });
    }
    return this.mcpRequestProcessor.processReadResource(data);
  }
  
  /**
   * @deprecated Legacy method - delegates to MCPRequestProcessor
   */
  async processReadResourceLegacy(data) {
    const { uri, arguments: args } = data.params || data;
    let resource = null;
    
    // Try to get from cache first (if available)
    if (this.cacheManager) {
      try {
        const cachedResources = await this.cacheManager.getResources();
        resource = cachedResources.find(r => r.uri === uri);
      } catch (error) {
        console.warn('⚠️  MCP Server: Failed to get cached resources:', error.message);
      }
    }
    
    // If not found in cache, try static resources
    if (!resource) {
      resource = this.resources.get(uri);
    }
    
    if (!resource) {
      return {
        jsonrpc: '2.0',
        id: data.id,
        error: {
          code: -32602,
          message: `Resource not found: ${uri}`
        }
      };
    }
    
    // Process template with arguments if provided and resource has parameters
    // Handle both 'content' and 'template' fields for compatibility
    let processedContent = resource.content || resource.template || '';
    if (args && resource.hasParameters && this.config.mcp.resources.enableTemplates && processedContent) {
      resource.parameters.forEach(param => {
        if (args[param] !== undefined) {
          const placeholder = new RegExp(`{{${param}}}`, 'g');
          processedContent = processedContent.replace(placeholder, args[param]);
        }
      });
    }
    
    return {
      jsonrpc: '2.0',
      id: data.id,
      result: {
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: processedContent
          }
        ],
        // Add template metadata if available
        ...(resource.hasParameters && {
          template: {
            hasParameters: resource.hasParameters,
            parameters: resource.parameters,
            parameterCount: resource.parameterCount
          }
        })
      }
    };
  }

  /**
   * Execute API endpoint
   * Maps flat MCP tool arguments to nested API handler structure
   */
  /**
   * Execute an API endpoint
   * @deprecated Use this.toolExecutor.executeAPIEndpoint() instead
   */
  async executeAPIEndpoint(route, args) {
    return this.toolExecutor.executeAPIEndpoint(route, args, {
      schemaNormalizer: this.schemaNormalizer
    });
  }

  /**
   * Notify clients about route changes
   */
  notifyRouteChanges(routes) {
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/toolsChanged',
      params: {
        tools: routes.map(route => {
          const processor = route.processorInstance;
          const openApi = processor?.openApi;
          
          // Build standard flat MCP tool inputSchema format
          const inputSchema = {
            type: 'object',
            properties: {},
            required: []
          };

          // Add query, header, and path parameters directly to properties
          if (Array.isArray(openApi?.parameters) && openApi.parameters.length > 0) {
            for (const p of openApi.parameters) {
              if (!p || !p.name || !p.in) continue;
              const propValue = this.safeExtractParameterSchema(p);
              inputSchema.properties[p.name] = propValue;
              if (p.required) {
                inputSchema.required.push(p.name);
              }
            }
          }

          // Handle request body: merge properties into top level if object schema
          if (openApi?.requestBody?.content?.['application/json']?.schema) {
            const bodySchema = openApi.requestBody.content['application/json'].schema;
            if (bodySchema.type === 'object' && bodySchema.properties) {
              for (const [key, value] of Object.entries(bodySchema.properties)) {
                inputSchema.properties[key] = value;
              }
              if (bodySchema.required && Array.isArray(bodySchema.required)) {
                for (const reqField of bodySchema.required) {
                  if (!inputSchema.required.includes(reqField)) {
                    inputSchema.required.push(reqField);
                  }
                }
              }
            } else {
              inputSchema.properties.body = this.normalizeNestedSchema(bodySchema);
              if (openApi.requestBody.required) {
                inputSchema.required.push('body');
              }
            }
          }

          // Handle path parameters from route pattern
          if (!openApi?.parameters || !openApi.parameters.some(p => p.in === 'path')) {
            const matches = route.path.match(/:([A-Za-z0-9_]+)/g) || [];
            for (const m of matches) {
              const name = m.slice(1);
              if (!inputSchema.properties[name]) {
                inputSchema.properties[name] = { type: 'string', description: `${name} parameter` };
                inputSchema.required.push(name);
              }
            }
          }

          const normalizedInputSchema = this.normalizeNestedSchema(inputSchema);
          
          // Create concise description
          let enhancedDescription = processor?.mcpDescription || openApi?.description || processor?.description || `Execute ${route.method} request to ${route.path}`;
          
          if (openApi?.responses?.['200']?.content?.['application/json']?.schema) {
            const responseSchema = openApi.responses['200'].content['application/json'].schema;
            enhancedDescription += `\n\n**Response**: ${responseSchema.type || 'object'}`;
          }

          return {
            name: `${route.path.replace(/\//g, '_').replace(/^_/, '')}_${route.method.toLowerCase()}`,
            description: enhancedDescription,
            inputSchema: normalizedInputSchema,
            // Add response schema information as separate field for compatibility
            responseSchema: openApi?.responses?.['200']?.content?.['application/json']?.schema || null,
            // Add additional metadata
            method: route.method,
            path: route.path,
            tags: openApi?.tags || ['api']
          };
        })
      }
    };

    // Notify WebSocket clients
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(notification));
      }
    });

    // Notify HTTP clients
    this.httpClients.forEach((res, clientId) => {
      try {
        res.write(`data: ${JSON.stringify(notification)}\n\n`);
      } catch (error) {
        // Remove disconnected clients
        this.httpClients.delete(clientId);
      }
    });
  }

  /**
   * Start the MCP server
   */
  async run() {
    this.createServer();
    // Attach bridge listeners so notifications are forwarded
    this.attachBridgeListeners();
    
    return new Promise((resolve, reject) => {
      // Force IPv4 binding to avoid IPv6 issues
      const listenOptions = {
        host: this.host,
        port: this.port,
        family: 4  // Force IPv4
      };
      
      // Ensure we're binding to all interfaces for IPv4
      if (this.host === '0.0.0.0') {
        listenOptions.host = '0.0.0.0';
        // Force IPv4 binding more explicitly
        listenOptions.family = 4;
      }
      
      this.server.listen(listenOptions, () => {
        // Create WebSocket server after HTTP server is bound
        this.createWebSocketServer();
        
        console.log('🚀 MCP Server started successfully!');
        console.log(`📡 WebSocket server listening on ws://${this.host}:${this.port} (IPv4)`);
        console.log('🌐 HTTP endpoints available:');
        console.log('  - GET  /sse  - Server-Sent Events for Inspector');
        console.log('  - POST /mcp  - HTTP MCP requests');
        console.log('  - POST /     - StreamableHttp for Inspector');
        console.log('🔧 Available MCP commands:');
        console.log('  - tools/list: Discover available API endpoints');
        console.log('  - tools/call: Execute a specific API endpoint');
        console.log('  - ping: Health check');
        resolve();
      });
      
      this.server.on('error', reject);
    });
  }

  /**
   * Stop the MCP server
   */
  stop() {
    // Close file watchers
    if (this.promptsWatcher) {
      this.promptsWatcher.close();
    }
    if (this.resourcesWatcher) {
      this.resourcesWatcher.close();
    }
    
    if (this.wss) {
      this.wss.close();
    }
    if (this.server) {
      this.server.close();
    }
    console.log('🛑 MCP Server stopped');
  }

  /**
   * Process cache/stats request
   */
  /**
   * @deprecated Use this.mcpRequestProcessor.processCacheStats() instead
   */
  async processCacheStats(data) {
    return this.mcpRequestProcessor.processCacheStats(data);
  }
  
  /**
   * @deprecated Legacy method
   */
  async processCacheStatsLegacy(data) {
    try {
      const stats = this.cacheManager.getCacheStats();
      
      return {
        jsonrpc: '2.0',
        id: data.id,
        result: {
          cache: stats,
          server: {
            staticPrompts: this.prompts.size,
            staticResources: this.resources.size,
            uptime: process.uptime()
          }
        }
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: data.id,
        error: {
          code: -32603,
          message: `Failed to get cache stats: ${error.message}`
        }
      };
    }
  }

  /**
   * @deprecated Use this.mcpRequestProcessor.processCacheClear() instead
   */
  async processCacheClear(data) {
    return this.mcpRequestProcessor.processCacheClear(data);
  }
  
  /**
   * @deprecated Legacy method
   */
  async processCacheClearLegacy(data) {
    try {
      const { type = 'all' } = data.params || {};
      
      this.cacheManager.clearCache(type);
      
      return {
        jsonrpc: '2.0',
        id: data.id,
        result: {
          success: true,
          message: `Cache cleared: ${type}`,
          cleared: type
        }
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: data.id,
        error: {
          code: -32603,
          message: `Failed to clear cache: ${error.message}`
        }
      };
    }
  }

  /**
   * @deprecated Use this.mcpRequestProcessor.processHealth() instead
   */
  async processHealth(data) {
    if (!this.mcpRequestProcessor) {
      this.mcpRequestProcessor = new MCPRequestProcessor(this, {
        toolBuilder: this.toolBuilder,
        toolExecutor: this.toolExecutor,
        promptHandler: this.promptHandler,
        resourceHandler: this.resourceHandler,
        schemaNormalizer: this.schemaNormalizer,
        getLoadedRoutes: this.getLoadedRoutes.bind(this),
        trackRequest: this.trackRequest.bind(this),
        handleError: this.handleError.bind(this)
      });
    }
    return this.mcpRequestProcessor.processHealth(data);
  }
  
  /**
   * @deprecated Legacy method
   */
  async processHealthLegacy(data) {
    const startTime = Date.now();
    
    try {
      const uptime = Date.now() - this.metrics.startTime;
      const routes = this.getLoadedRoutes();
      const isHealthy = this.metrics.errorCount < this.metrics.requestCount * 0.1; // Less than 10% error rate
      
      const health = {
        status: isHealthy ? 'healthy' : 'degraded',
        uptime,
        server: {
          host: this.host,
          port: this.port,
          clients: this.clients.size,
          httpClients: this.httpClients.size
        },
        metrics: {
          totalRequests: this.metrics.requestCount,
          errorRate: this.metrics.requestCount > 0 ? (this.metrics.errorCount / this.metrics.requestCount) * 100 : 0,
          averageResponseTime: this.metrics.averageResponseTime,
          lastActivity: new Date(this.metrics.lastActivity).toISOString()
        },
        resources: {
          prompts: this.prompts.size,
          resources: this.resources.size,
          routes: routes.length
        },
        cache: this.cacheManager ? await this.cacheManager.getCacheStats() : null
      };
      
      this.trackRequest('health', startTime, true);
      
      return {
        jsonrpc: '2.0',
        id: data.id,
        result: health
      };
    } catch (error) {
      this.trackRequest('health', startTime, false, 'health_check_error');
      return this.handleError(error, { method: 'health' });
    }
  }

  /**
   * @deprecated Use this.mcpRequestProcessor.processMetrics() instead
   */
  async processMetrics(data) {
    if (!this.mcpRequestProcessor) {
      this.mcpRequestProcessor = new MCPRequestProcessor(this, {
        toolBuilder: this.toolBuilder,
        toolExecutor: this.toolExecutor,
        promptHandler: this.promptHandler,
        resourceHandler: this.resourceHandler,
        schemaNormalizer: this.schemaNormalizer,
        getLoadedRoutes: this.getLoadedRoutes.bind(this),
        trackRequest: this.trackRequest.bind(this),
        handleError: this.handleError.bind(this)
      });
    }
    return this.mcpRequestProcessor.processMetrics(data);
  }
  
  /**
   * @deprecated Legacy method
   */
  async processMetricsLegacy(data) {
    const startTime = Date.now();
    
    try {
      const uptime = Date.now() - this.metrics.startTime;
      const routes = this.getLoadedRoutes();
      
      const metrics = {
        server: {
          uptime,
          startTime: new Date(this.metrics.startTime).toISOString(),
          lastActivity: new Date(this.metrics.lastActivity).toISOString(),
          host: this.host,
          port: this.port
        },
        performance: {
          totalRequests: this.metrics.requestCount,
          averageResponseTime: this.metrics.averageResponseTime,
          responseTimes: {
            min: Math.min(...this.metrics.responseTimes),
            max: Math.max(...this.metrics.responseTimes),
            avg: this.metrics.averageResponseTime,
            count: this.metrics.responseTimes.length
          }
        },
        requests: {
          toolCalls: this.metrics.toolCalls,
          promptRequests: this.metrics.promptRequests,
          resourceRequests: this.metrics.resourceRequests,
          bridgeRequests: this.metrics.bridgeRequests
        },
        errors: {
          total: this.metrics.errorCount,
          errorRate: this.metrics.requestCount > 0 ? (this.metrics.errorCount / this.metrics.requestCount) * 100 : 0,
          types: Object.fromEntries(this.metrics.errorTypes)
        },
        resources: {
          prompts: this.prompts.size,
          resources: this.resources.size,
          routes: routes.length,
          clients: this.clients.size,
          httpClients: this.httpClients.size
        },
        cache: this.cacheManager ? await this.cacheManager.getCacheStats() : null
      };
      
      this.trackRequest('metrics', startTime, true);
      
      return {
        jsonrpc: '2.0',
        id: data.id,
        result: metrics
      };
    } catch (error) {
      this.trackRequest('metrics', startTime, false, 'metrics_error');
      return this.handleError(error, { method: 'metrics' });
    }
  }
}

module.exports = DynamicAPIMCPServer;
