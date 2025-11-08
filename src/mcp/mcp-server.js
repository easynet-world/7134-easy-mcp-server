/**
 * MCP (Model Context Protocol) Server
 * Handles AI model communication and API execution
 * 
 * JSON-RPC 2.0 Error Codes:
 * - -32601: Method not found
 * - -32602: Invalid params
 * - -32603: Internal error
 */

const path = require('path');
const MCPCacheManager = require('./utils/mcp-cache-manager');
const SchemaNormalizer = require('./utils/schema-normalizer');
const MCPServerMetrics = require('./utils/mcp-server-metrics');
const MCPToolMerger = require('./utils/mcp-tool-merger');
const MCPNotificationManager = require('./utils/mcp-notification-manager');
const MCPServerLifecycle = require('./utils/mcp-server-lifecycle');
const ToolBuilder = require('./builders/tool-builder');
const ToolExecutor = require('./executors/tool-executor');
const PromptHandler = require('./handlers/content/prompt-handler');
const ResourceHandler = require('./handlers/content/resource-handler');

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
    
    // Initialize metrics and logging
    this.metricsManager = new MCPServerMetrics({ ...options, quiet: this.quiet });
    this.metrics = this.metricsManager.metrics;
    this.errorHandling = this.metricsManager.errorHandling;
    
    // Delegate logging methods to metrics manager
    this.log = (level, message, data) => this.metricsManager.log(level, message, data);
    this.warn = (message, data) => this.metricsManager.warn(message, data);
    this.error = (message, data) => this.metricsManager.error(message, data);
    this.info = (message, data) => this.metricsManager.info(message, data);
    this.debug = (message, data) => this.metricsManager.debug(message, data);
    this.shouldLog = (level) => this.metricsManager.shouldLog(level);
    this.trackRequest = (type, startTime, success, errorType) => this.metricsManager.trackRequest(type, startTime, success, errorType);
    this.handleError = (error, context) => this.metricsManager.handleError(error, context);
    
    // Initialize MCP Cache Manager for intelligent caching
    // Use configured base path instead of hardcoded './mcp'
    const originalBasePath = options.mcp?.basePath || './mcp';
    
    // Check if custom MCP directory exists, otherwise fall back to package directory
    const fs = require('fs');
    // Resolve custom path: if relative, resolve from current working directory; if absolute, use as-is
    const customMcpPath = path.isAbsolute(originalBasePath) 
      ? originalBasePath 
      : path.resolve(process.cwd(), originalBasePath);
    // Resolve package MCP directory from project root (go up from src/mcp to project root, then to mcp)
    const packageMcpPath = path.resolve(__dirname, '..', '..', 'mcp');
    
    let resolvedBasePath;
    if (!fs.existsSync(customMcpPath)) {
      console.log(`🔌 MCP Server: Custom MCP directory not found at ${customMcpPath}, falling back to package directory`);
      resolvedBasePath = packageMcpPath;
    } else {
      console.log(`🔌 MCP Server: Using custom MCP directory at ${customMcpPath}`);
      resolvedBasePath = customMcpPath;
    }
    
    // Initialize notification manager
    this.notificationManager = new MCPNotificationManager(this);
    
    this.cacheManager = new MCPCacheManager(resolvedBasePath, {
      enableHotReload: true,
      logger: options.logger,
      onChange: ({ type }) => {
        // Broadcast notifications when cache detects changes
        if (type === 'prompts') {
          this.notificationManager.notifyPromptsChanged();
        } else if (type === 'resources') {
          this.notificationManager.notifyResourcesChanged();
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
    
    // Initialize tool merger
    this.toolMerger = new MCPToolMerger({
      getLoadedRoutes: () => this.getLoadedRoutes(),
      schemaNormalizer: this.schemaNormalizer,
      bridgeReloader: this.bridgeReloader
    });
    
    // Initialize lifecycle manager
    this.lifecycleManager = new MCPServerLifecycle(this);
    
    // Initialize request processor, HTTP, WebSocket, and STDIO handlers (will be set up after methods are available)
    this.mcpRequestProcessor = null;
    this.httpHandler = null;
    this.wsHandler = null;
    this.stdioHandler = null;
    
    // Check if STDIO mode is enabled
    this.stdioMode = options.stdioMode || process.env.EASY_MCP_SERVER_STDIO_MODE === 'true';
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
            this.notificationManager.broadcast({
              jsonrpc: '2.0',
              method: msg?.method || 'notifications/bridge',
              params: msg?.params || { source: 'bridge' }
            });

            // On config/tools changes, refresh merged tools and notify clients
            const method = msg && msg.method ? String(msg.method) : '';
            if (method.includes('tools') || method.includes('configChanged')) {
              await this.notificationManager.notifyRouteChanges();
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
    return this.toolMerger.buildMergedToolsList();
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
    this.notificationManager.notifyRouteChanges();
    
    // Also notify about prompts and resources changes after hot reload
    this.notificationManager.notifyPromptsChanged();
    this.notificationManager.notifyResourcesChanged();
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
    return this.promptHandler.setupPromptsWatcher(() => this.notificationManager.notifyPromptsChanged());
  }

  /**
   * @deprecated Use this.resourceHandler.setupResourcesWatcher() instead
   */
  setupResourcesWatcher() {
    return this.resourceHandler.setupResourcesWatcher(() => this.notificationManager.notifyResourcesChanged());
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
    return this.notificationManager.notifyPromptsChanged();
  }

  /**
   * Notify clients about resources changes
   */
  notifyResourcesChanged() {
    return this.notificationManager.notifyResourcesChanged();
  }

  /**
   * Broadcast notification to all connected clients
   */
  broadcastNotification(notification) {
    return this.notificationManager.broadcast(notification);
  }

  /**
   * Create HTTP and WebSocket server
   */
  createServer() {
    return this.lifecycleManager.createServer();
  }
  
  /**
   * Create WebSocket server after HTTP server is bound
   */
  createWebSocketServer() {
    return this.lifecycleManager.createWebSocketServer();
  }

  /**
   * @deprecated Use this.mcpRequestProcessor.processMCPRequest() instead
   */
  async processMCPRequest(data) {
    // Lazy initialization if not already initialized
    if (!this.mcpRequestProcessor) {
      const MCPRequestProcessor = require('./processors/mcp-request-processor');
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
   * @deprecated Use this.mcpRequestProcessor.processMCPRequest() instead
   */
  async processListTools(data) {
    return this.processMCPRequest({ ...data, method: 'tools/list' });
  }

  /**
   * @deprecated Use this.mcpRequestProcessor.processMCPRequest() instead
   */
  async processCallTool(data) {
    return this.processMCPRequest({ ...data, method: 'tools/call' });
  }

  /**
   * @deprecated Use this.mcpRequestProcessor.processMCPRequest() instead
   */
  async processListPrompts(data) {
    return this.processMCPRequest({ ...data, method: 'prompts/list' });
  }

  /**
   * @deprecated Use this.mcpRequestProcessor.processMCPRequest() instead
   */
  async processGetPrompt(data) {
    return this.processMCPRequest({ ...data, method: 'prompts/get' });
  }

  /**
   * @deprecated Use this.mcpRequestProcessor.processMCPRequest() instead
   */
  async processListResources(data) {
    return this.processMCPRequest({ ...data, method: 'resources/list' });
  }

  /**
   * @deprecated Use this.mcpRequestProcessor.processMCPRequest() instead
   */
  async processReadResource(data) {
    return this.processMCPRequest({ ...data, method: 'resources/read' });
  }

  /**
   * @deprecated Use this.resourceHandler.getMimeTypeForExtension() instead
   */
  getMimeTypeForExtension(ext) {
    return this.resourceHandler.getMimeTypeForExtension(ext);
  }

  /**
   * @deprecated Use this.toolExecutor.executeAPIEndpoint() instead
   */
  async executeAPIEndpoint(route, args) {
    return this.toolExecutor.executeAPIEndpoint(route, args, {
      schemaNormalizer: this.schemaNormalizer
    });
  }

  /**
   * @deprecated Use this.httpHandler.handleSSEConnection() instead
   */
  handleSSEConnection(req, res) {
    if (!this.httpHandler) return;
    return this.httpHandler.handleSSEConnection(req, res, {
      httpClients: this.httpClients,
      cacheManager: this.cacheManager
    });
  }

  /**
   * @deprecated Use this.httpHandler.handleHTTPMCPRequest() instead
   */
  handleHTTPMCPRequest(req, res) {
    if (!this.httpHandler) return;
    return this.httpHandler.handleHTTPMCPRequest(req, res);
  }

  /**
   * @deprecated Use this.httpHandler.handleStreamableHttpRequest() instead
   */
  handleStreamableHttpRequest(req, res) {
    if (!this.httpHandler) return;
    return this.httpHandler.handleStreamableHttpRequest(req, res);
  }

  /**
   * Notify clients about route changes
   */
  async notifyRouteChanges(_routes) {
    return this.notificationManager.notifyRouteChanges();
  }

  /**
   * Start the MCP server
   */
  async run() {
    return this.lifecycleManager.start();
  }

  /**
   * Stop the MCP server
   */
  stop() {
    return this.lifecycleManager.stop();
  }

  /**
   * @deprecated Use this.mcpRequestProcessor.processMCPRequest() instead
   */
  async processHealth(data) {
    return this.processMCPRequest({ ...data, method: 'health' });
  }

  /**
   * @deprecated Use this.mcpRequestProcessor.processMCPRequest() instead
   */
  async processMetrics(data) {
    return this.processMCPRequest({ ...data, method: 'metrics' });
  }

  /**
   * @deprecated Use this.mcpRequestProcessor.processMCPRequest() instead
   */
  async processCacheStats(data) {
    return this.processMCPRequest({ ...data, method: 'cache/stats' });
  }

  /**
   * @deprecated Use this.mcpRequestProcessor.processMCPRequest() instead
   */
  async processCacheClear(data) {
    return this.processMCPRequest({ ...data, method: 'cache/clear' });
  }

  /**
   * @deprecated Use this.wsHandler.handleMessage() instead
   */
  async handleListTools(ws, data) {
    if (!this.wsHandler) {
      // Lazy initialization
      const WebSocketHandler = require('./handlers/transport/websocket-handler');
      this.wsHandler = new WebSocketHandler(this, {
        processMCPRequest: (data) => this.processMCPRequest(data)
      });
    }
    // Format as WebSocket message (legacy format)
    const jsonrpcResponse = await this.processMCPRequest({ 
      jsonrpc: '2.0',
      id: data.id,
      method: 'tools/list'
    });
    
    // Convert JSON-RPC response to legacy WebSocket format
    const wsResponse = {
      type: 'list_tools_response',
      id: data.id,
      tools: jsonrpcResponse.result?.tools || []
    };
    
    if (ws && ws.send) {
      ws.send(JSON.stringify(wsResponse));
    }
  }
}

module.exports = DynamicAPIMCPServer;
