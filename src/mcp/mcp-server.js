/**
 * MCP (Model Context Protocol) Server
 * Handles AI model communication and API execution
 */

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const chokidar = require('chokidar');
const MCPCacheManager = require('../utils/mcp-cache-manager');
const SimpleParameterParser = require('../utils/parameter-template-parser');

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
    
    // Helper method for conditional logging
    this.log = (...args) => {
      if (!this.quiet) {
        console.log(...args);
      }
    };
    
    this.warn = (...args) => {
      if (!this.quiet) {
        console.warn(...args);
      }
    };
    
    // Initialize MCP Cache Manager for intelligent caching
    // Use configured base path instead of hardcoded './mcp'
    const originalBasePath = options.mcp?.basePath || './mcp';
    
    // Check if custom MCP directory exists, otherwise fall back to package directory
    const fs = require('fs');
    const customMcpPath = path.resolve(originalBasePath);
    const packageMcpPath = path.resolve(__dirname, '..', '..', 'mcp');
    
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

    // File watchers
    this.promptsWatcher = null;
    this.resourcesWatcher = null;
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
   * Build the merged tools list from local routes and bridge servers.
   */
  async buildMergedToolsList() {
    const routes = this.getLoadedRoutes();
    const tools = routes.map(route => {
      const processor = route.processorInstance;
      const openApi = processor?.openApi;
      const inputSchema = {
        type: 'object',
        properties: {
          body: { type: 'object', description: 'Request body' },
          query: { type: 'object', description: 'Query parameters' },
          headers: { type: 'object', description: 'Request headers' }
        }
      };
      if (openApi?.requestBody?.content?.['application/json']?.schema) {
        inputSchema.properties.body = {
          ...inputSchema.properties.body,
          ...openApi.requestBody.content['application/json'].schema
        };
      }
      if (openApi?.requestBody?.content?.['application/json']?.schema?.required) {
        inputSchema.required = ['body'];
      }
      return {
        name: `${route.method.toLowerCase()}_${route.path.replace(/\//g, '_').replace(/^_/, '')}`,
        description: processor?.mcpDescription || openApi?.description || processor?.description || `Execute ${route.method} request to ${route.path}`,
        inputSchema,
        responseSchema: openApi?.responses?.['200']?.content?.['application/json']?.schema || null,
        method: route.method,
        path: route.path,
        tags: openApi?.tags || ['api']
      };
    });

    if (this.bridgeReloader) {
      try {
        const bridges = this.bridgeReloader.ensureBridges();
        for (const [, bridge] of bridges.entries()) {
          try {
            const bridgeResult = await bridge.rpcRequest('tools/list', {}, 5000); // 5 second timeout
            if (bridgeResult && Array.isArray(bridgeResult.tools)) {
              bridgeResult.tools.forEach(t => {
                tools.push({
                  name: t.name,
                  description: t.description || 'Bridge tool',
                  inputSchema: t.inputSchema || { type: 'object', properties: {} },
                  responseSchema: null,
                  tags: ['bridge']
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
   * Add a prompt to the server
   */
  addPrompt(prompt) {
    this.prompts.set(prompt.name, prompt);
    console.log('🔌 MCP Server: Added prompt:', prompt.name);
  }

  /**
   * Add a resource to the server
   */
  addResource(resource) {
    this.resources.set(resource.uri, resource);
    console.log('🔌 MCP Server: Added resource:', resource.uri);
  }

  /**
   * Discover prompts and resources from API routes
   */
  discoverPromptsAndResources(routes) {
    routes.forEach(route => {
      const processor = route.processorInstance;
      
      // Check if processor has prompts
      if (processor && processor.prompts) {
        processor.prompts.forEach(prompt => {
          this.addPrompt({
            name: prompt.name || `${route.path.replace(/\//g, '_').replace(/^_/, '')}_${route.method.toLowerCase()}_prompt`,
            description: prompt.description || `Prompt for ${route.method} ${route.path}`,
            template: prompt.template,
            arguments: prompt.arguments || []
          });
        });
      }
      
      // Check if processor has resources
      if (processor && processor.resources) {
        processor.resources.forEach(resource => {
          this.addResource({
            uri: resource.uri || `${route.path}/resource`,
            name: resource.name || `${route.path} resource`,
            description: resource.description || `Resource for ${route.method} ${route.path}`,
            mimeType: resource.mimeType || 'text/plain',
            content: resource.content || ''
          });
        });
      }
    });
  }

  /**
   * Load prompts and resources from filesystem
   */
  async loadPromptsAndResourcesFromFilesystem() {
    try {
      // Load prompts if enabled and cache manager is not available
      if (this.config.mcp.prompts.enabled && !this.cacheManager) {
        const promptsPath = path.resolve(this.resolvedBasePath, 'prompts');
        await this.loadPromptsFromDirectory(promptsPath);
      }
      
      // Load resources if enabled and cache manager is not available
      if (this.config.mcp.resources.enabled && !this.cacheManager) {
        const resourcesPath = path.resolve(this.resolvedBasePath, 'resources');
        await this.loadResourcesFromDirectory(resourcesPath);
      }
      
      console.log(`🔌 MCP Server: Loaded ${this.prompts.size} prompts and ${this.resources.size} resources from filesystem`);
      
      // Setup file watchers if enabled
      if (this.config.mcp.prompts.watch && this.config.mcp.prompts.enabled) {
        this.setupPromptsWatcher();
      }
      if (this.config.mcp.resources.watch && this.config.mcp.resources.enabled) {
        this.setupResourcesWatcher();
      }
    } catch (error) {
      console.warn('⚠️  MCP Server: Failed to load prompts and resources from filesystem:', error.message);
    }
  }

  /**
   * Load prompts from a directory recursively
   */
  async loadPromptsFromDirectory(dirPath, baseDir = null) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const promptsBase = baseDir || dirPath;
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively load subdirectories
          await this.loadPromptsFromDirectory(fullPath, promptsBase);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          // Load any file format if '*' is specified, or check specific formats
          const shouldLoad = this.config.mcp.prompts.formats.includes('*') || 
                           this.config.mcp.prompts.formats.includes(ext.substring(1));
          
          if (shouldLoad) {
            await this.loadPromptFromFile(fullPath, promptsBase);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read - this is normal
      console.log('🔌 MCP Server: No prompts directory found or accessible');
    }
  }

  /**
   * Load a single prompt from a file (supports any format)
   */
  async loadPromptFromFile(filePath, baseDir = null) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      
      // Check if file extension is supported based on MCP server configuration
      const supportedFormats = this.config.mcp.prompts.formats;
      if (!supportedFormats.includes('*')) {
        const supportedExtensions = supportedFormats.map(fmt => `.${fmt}`);
        if (!supportedExtensions.includes(ext)) {
          console.log(`🔌 MCP Server: Skipping unsupported file format: ${filePath} (${ext})`);
          return;
        }
      }
      
      const content = await fs.readFile(filePath, 'utf8');
      const promptsBasePath = baseDir || path.resolve(this.resolvedBasePath, 'prompts');
      const relativePath = path.relative(promptsBasePath, filePath);
      
      // Extract template parameters using the parameter parser
      const parsed = SimpleParameterParser.parse(content, path.basename(filePath));
      
      let promptData = {};
      let template = content;
      let description = `Prompt from ${path.basename(filePath)}`;
      let arguments_ = [];
      
      // Try to parse structured formats for metadata extraction
      if (ext === '.json') {
        try {
          promptData = JSON.parse(content);
          template = promptData.instructions || promptData.template || content;
          description = promptData.description || description;
          arguments_ = promptData.arguments?.properties ? 
            Object.keys(promptData.arguments.properties).map(key => ({
              name: key,
              description: promptData.arguments.properties[key].description || '',
              required: promptData.arguments.required?.includes(key) || false
            })) : [];
        } catch (parseError) {
          console.warn(`⚠️  MCP Server: Invalid JSON in ${filePath}, treating as plain text`);
        }
      } else if (ext === '.yaml' || ext === '.yml') {
        try {
          promptData = yaml.load(content);
          template = promptData.instructions || promptData.template || content;
          description = promptData.description || description;
          arguments_ = promptData.arguments?.properties ? 
            Object.keys(promptData.arguments.properties).map(key => ({
              name: key,
              description: promptData.arguments.properties[key].description || '',
              required: promptData.arguments.required?.includes(key) || false
            })) : [];
        } catch (parseError) {
          console.warn(`⚠️  MCP Server: Invalid YAML in ${filePath}, treating as plain text`);
        }
      } else {
        // For any other format, treat as plain text template
        template = content;
        description = `Prompt from ${path.basename(filePath)}`;
      }
      
      // Generate a name from the file path if not provided
      // Use relative path with underscores for nested directories, or just filename for root level
      let name = promptData.name;
      if (!name) {
        if (relativePath.startsWith('..')) {
          // If the path goes outside the prompts directory, just use the filename
          name = path.basename(filePath, path.extname(filePath));
        } else {
          // Use relative path with underscores for nested directories
          name = relativePath.replace(/\//g, '_').replace(/\.[^/.]+$/, '');
        }
      }
      
      // If no arguments were defined in structured format, use extracted parameters
      if (arguments_.length === 0 && parsed.hasParameters) {
        arguments_ = parsed.parameters.map(param => ({
          name: param,
          description: `Parameter: ${param}`,
          required: false
        }));
      }
      
      const prompt = {
        name: name,
        description: description,
        template: template,
        arguments: arguments_,
        // Add template support
        hasParameters: parsed.hasParameters,
        parameters: parsed.parameters,
        parameterCount: parsed.parameterCount,
        isTemplate: parsed.hasParameters,
        filePath: relativePath,
        format: parsed.format
      };
      
      this.addPrompt(prompt);
    } catch (error) {
      console.warn(`⚠️  MCP Server: Failed to load prompt from ${filePath}:`, error.message);
    }
  }

  /**
   * Load resources from a directory recursively
   */
  async loadResourcesFromDirectory(dirPath, baseDir = null) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const resourcesBase = baseDir || dirPath;
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively load subdirectories
          await this.loadResourcesFromDirectory(fullPath, resourcesBase);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          // Load any file format if '*' is specified, or check specific formats
          const shouldLoad = this.config.mcp.resources.formats.includes('*') || 
                           this.config.mcp.resources.formats.includes(ext.substring(1));
          
          if (shouldLoad) {
            await this.loadResourceFromFile(fullPath, resourcesBase);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read - this is normal
      console.log('🔌 MCP Server: No resources directory found or accessible');
    }
  }

  /**
   * Load a single resource from a file
   */
  async loadResourceFromFile(filePath, baseDir = null) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      
      // Check if file extension is supported based on MCP server configuration
      const supportedFormats = this.config.mcp.resources.formats;
      if (!supportedFormats.includes('*')) {
        const supportedExtensions = supportedFormats.map(fmt => `.${fmt}`);
        if (!supportedExtensions.includes(ext)) {
          console.log(`🔌 MCP Server: Skipping unsupported file format: ${filePath} (${ext})`);
          return;
        }
      }
      
      const content = await fs.readFile(filePath, 'utf8');
      const resourcesBasePath = baseDir || path.resolve(this.resolvedBasePath, 'resources');
      const relativePath = path.relative(resourcesBasePath, filePath);
      
      // Generate URI from file path - use relative path, but clean up if it goes outside the resources directory
      let cleanRelativePath = relativePath;
      if (relativePath.startsWith('..')) {
        // If the path goes outside the resources directory, just use the filename
        cleanRelativePath = path.basename(filePath);
      } else {
        // Normalize the path to use forward slashes consistently
        cleanRelativePath = relativePath.replace(/\\/g, '/');
      }
      const uri = `resource://${cleanRelativePath}`;
      
      // Extract template parameters using the parameter parser
      const parsed = SimpleParameterParser.parse(content, path.basename(filePath));
      
      // Determine MIME type and process content based on file extension
      let mimeType = this.getMimeTypeForExtension(ext);
      let processedContent = content;
      let resourceName = null;
      let resourceDescription = null;
      
      // Try to parse structured formats for metadata extraction
      if (ext === '.json') {
        try {
          const jsonData = JSON.parse(content);
          processedContent = JSON.stringify(jsonData, null, 2);
          // Extract name and description from JSON if available
          if (jsonData.name) resourceName = jsonData.name;
          if (jsonData.description) resourceDescription = jsonData.description;
          if (jsonData.mimeType) mimeType = jsonData.mimeType;
        } catch (parseError) {
          console.warn(`⚠️  MCP Server: Invalid JSON in ${filePath}, treating as plain text`);
        }
      } else if (ext === '.yaml' || ext === '.yml') {
        try {
          const yamlData = yaml.load(content);
          processedContent = yaml.dump(yamlData, { indent: 2 });
          // Extract name and description from YAML if available
          if (yamlData.name) resourceName = yamlData.name;
          if (yamlData.description) resourceDescription = yamlData.description;
          if (yamlData.mimeType) mimeType = yamlData.mimeType;
        } catch (parseError) {
          console.warn(`⚠️  MCP Server: Invalid YAML in ${filePath}, treating as plain text`);
        }
      }
      
      // Generate name from file path if not provided in content
      // Use just the filename without extension for simple names
      const fileName = path.basename(filePath, path.extname(filePath));
      const name = resourceName || fileName;
      const description = resourceDescription || `Resource from ${path.basename(filePath)}`;
      
      const resource = {
        uri: uri,
        name: name,
        description: description,
        mimeType: mimeType,
        content: processedContent,
        // Add template support
        hasParameters: parsed.hasParameters,
        parameters: parsed.parameters,
        parameterCount: parsed.parameterCount,
        isTemplate: parsed.hasParameters,
        filePath: relativePath,
        format: parsed.format
      };
      
      this.addResource(resource);
    } catch (error) {
      console.warn(`⚠️  MCP Server: Failed to load resource from ${filePath}:`, error.message);
    }
  }

  /**
   * Setup file watcher for prompts directory
   */
  setupPromptsWatcher() {
    if (this.promptsWatcher) {
      this.promptsWatcher.close();
    }
    
    const promptsPath = path.resolve(this.resolvedBasePath, 'prompts');
    
    this.promptsWatcher = chokidar.watch(promptsPath, {
      ignored: /(^|[/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });
    
    this.promptsWatcher
      .on('add', (filePath) => {
        console.log(`🔌 MCP Server: New prompt file added: ${filePath}`);
        this.loadPromptFromFile(filePath, promptsPath);
        this.notifyPromptsChanged();
      })
      .on('change', (filePath) => {
        console.log(`🔌 MCP Server: Prompt file changed: ${filePath}`);
        this.loadPromptFromFile(filePath, promptsPath);
        this.notifyPromptsChanged();
      })
      .on('unlink', (filePath) => {
        console.log(`🔌 MCP Server: Prompt file removed: ${filePath}`);
        this.removePromptByFilePath(filePath);
        this.notifyPromptsChanged();
      })
      .on('error', (error) => {
        console.error('❌ MCP Server: Prompts watcher error:', error);
      });
    
    console.log(`🔌 MCP Server: Watching prompts directory: ${promptsPath}`);
  }

  /**
   * Setup file watcher for resources directory
   */
  setupResourcesWatcher() {
    if (this.resourcesWatcher) {
      this.resourcesWatcher.close();
    }
    
    const resourcesPath = path.resolve(this.resolvedBasePath, 'resources');
    
    this.resourcesWatcher = chokidar.watch(resourcesPath, {
      ignored: /(^|[/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });
    
    this.resourcesWatcher
      .on('add', (filePath) => {
        console.log(`🔌 MCP Server: New resource file added: ${filePath}`);
        this.loadResourceFromFile(filePath, resourcesPath);
        this.notifyResourcesChanged();
      })
      .on('change', (filePath) => {
        console.log(`🔌 MCP Server: Resource file changed: ${filePath}`);
        this.loadResourceFromFile(filePath, resourcesPath);
        this.notifyResourcesChanged();
      })
      .on('unlink', (filePath) => {
        console.log(`🔌 MCP Server: Resource file removed: ${filePath}`);
        this.removeResourceByFilePath(filePath);
        this.notifyResourcesChanged();
      })
      .on('error', (error) => {
        console.error('❌ MCP Server: Resources watcher error:', error);
      });
    
    console.log(`🔌 MCP Server: Watching resources directory: ${resourcesPath}`);
  }

  /**
   * Remove a prompt by file path
   */
  removePromptByFilePath(filePath) {
    const relativePath = path.relative(path.resolve(this.resolvedBasePath, 'prompts'), filePath);
    // Remove any file extension and replace slashes with underscores
    const name = relativePath.replace(/\.[^/.]+$/, '').replace(/\//g, '_');
    console.log(`🔌 MCP Server: Removing prompt: ${name} (from ${filePath})`);
    this.prompts.delete(name);
  }

  /**
   * Remove a resource by file path
   */
  removeResourceByFilePath(filePath) {
    const relativePath = path.relative(path.resolve(this.resolvedBasePath, 'resources'), filePath);
    // Clean up the relative path similar to how it's done in loadResourceFromFile
    let cleanRelativePath = relativePath;
    if (relativePath.startsWith('..')) {
      cleanRelativePath = path.basename(filePath);
    } else {
      cleanRelativePath = relativePath.replace(/\\/g, '/');
    }
    const uri = `resource://${cleanRelativePath}`;
    console.log(`🔌 MCP Server: Removing resource: ${uri} (from ${filePath})`);
    this.resources.delete(uri);
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
        this.handleHTTPRequest(req, res);
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
        this.handleMessage(ws, message);
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
  handleHTTPRequest(req, res) {
    // Set CORS headers for Inspector
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.url === '/sse' && req.method === 'GET') {
      this.handleSSEConnection(req, res);
    } else if (req.url === '/mcp' && req.method === 'POST') {
      this.handleHTTPMCPRequest(req, res);
    } else if (req.url === '/' && req.method === 'POST') {
      // StreamableHttp transport
      this.handleStreamableHttpRequest(req, res);
    } else if (req.method === 'GET' && this.tryServeStatic(req, res)) {
      // served static file for non-root requests
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  /**
   * Try to serve static files from public directory for MCP HTTP server
   */
  tryServeStatic(req, res) {
    try {
      const fsSync = require('fs');
      const staticDir = path.resolve(process.env.EASY_MCP_SERVER_STATIC_DIRECTORY || './public');
      const urlPath = decodeURIComponent(req.url.split('?')[0] || '/');
      let requestedPath = urlPath;
      if (requestedPath === '/') {
        requestedPath = (process.env.EASY_MCP_SERVER_DEFAULT_FILE || 'index.html');
      } else if (requestedPath.startsWith('/')) {
        requestedPath = requestedPath.slice(1);
      }
      const filePath = path.resolve(staticDir, requestedPath);
      if (!filePath.startsWith(staticDir)) {
        return false; // prevent path traversal
      }
      try {
        const stat = fsSync.statSync(filePath);
        if (stat.isDirectory()) {
          return false;
        }
        const data = fsSync.readFileSync(filePath);
        const contentType = this.getContentTypeByExt(path.extname(filePath).toLowerCase());
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
        return true;
      } catch (_err) {
        return false;
      }
    } catch (_) {
      return false;
    }
  }

  serveFileIfExists(filePath, res) {
    return fs.stat(filePath)
      .then((stat) => {
        if (stat.isDirectory()) {
          // No directory listing
          return false;
        }
        return fs.readFile(filePath).then((data) => {
          const contentType = this.getContentTypeByExt(path.extname(filePath).toLowerCase());
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
          return true;
        });
      })
      .catch(() => false);
  }

  getContentTypeByExt(ext) {
    switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    case '.ico': return 'image/x-icon';
    case '.txt': return 'text/plain; charset=utf-8';
    default: return 'application/octet-stream';
    }
  }

  /**
   * Handle MCP server info page
   */
  handleMCPInfoPage(req, res) {
    const fs = require('fs');
    const path = require('path');
    
    try {
      // Check for custom HTML file paths in order of priority:
      // 1. Environment variable MCP_INFO_HTML_PATH
      // 2. Custom file in project root (mcp-info.html)
      // 3. Default file in src/mcp directory
      const envHtmlPath = process.env.EASY_MCP_SERVER_MCP_INFO_HTML_PATH;
      const customHtmlPath = path.join(process.cwd(), 'mcp-info.html');
      const defaultHtmlPath = path.join(__dirname, 'mcp-info.html');
      
      let htmlPath;
      
      if (envHtmlPath && fs.existsSync(envHtmlPath)) {
        htmlPath = envHtmlPath;
        console.log('🔧 Using custom MCP info page from environment:', htmlPath);
      } else if (fs.existsSync(customHtmlPath)) {
        htmlPath = customHtmlPath;
        console.log('🔧 Using custom MCP info page from project root:', htmlPath);
      } else {
        htmlPath = defaultHtmlPath;
        console.log('🔧 Using default MCP info page:', htmlPath);
      }
      
      const html = fs.readFileSync(htmlPath, 'utf8');
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch (error) {
      console.error('❌ Error reading MCP info page:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error loading MCP server info page');
    }
  }

  /**
   * Handle Server-Sent Events connection
   */
  handleSSEConnection(req, res) {
    console.log('🔌 New MCP SSE client connected');
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type'
    });

    // Send MCP server initialization message
    const initMessage = {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          prompts: {},
          resources: {}
        },
        serverInfo: {
          name: 'easy-mcp-server',
          version: require('../../package.json').version
        }
      }
    };
    
    res.write(`data: ${JSON.stringify(initMessage)}\n\n`);

    // Store the response object for later use
    const clientId = Date.now().toString();
    this.httpClients.set(clientId, res);

    req.on('close', () => {
      console.log('🔌 MCP SSE client disconnected');
      this.httpClients.delete(clientId);
    });

    req.on('error', (error) => {
      // ECONNRESET/aborted is normal when clients disconnect
      if (error && (error.code === 'ECONNRESET' || error.message === 'aborted')) {
        console.log('🔌 MCP SSE client connection closed');
      } else {
        console.warn('⚠️  SSE connection issue:', error?.message || error);
      }
      this.httpClients.delete(clientId);
    });
  }

  /**
   * Handle HTTP MCP requests
   */
  handleHTTPMCPRequest(req, res) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const response = await this.processMCPRequest(data);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  }

  /**
   * Handle StreamableHttp requests
   */
  handleStreamableHttpRequest(req, res) {
    console.log('🔌 New MCP StreamableHttp client connected');
    
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        console.log('📨 Received MCP request:', data.method);
        
        // Handle MCP initialization
        if (data.method === 'initialize') {
          const response = {
            jsonrpc: '2.0',
            id: data.id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {},
                prompts: {},
                resources: {}
              },
              serverInfo: {
                name: 'easy-mcp-server',
                version: require('../../package.json').version
              }
            }
          };
          
          res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(response));
          return;
        }
        
        const response = await this.processMCPRequest(data);
        
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(response));
      } catch (error) {
        console.error('❌ StreamableHttp error:', error);
        res.writeHead(400, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ 
          jsonrpc: '2.0',
          id: null,
          error: { 
            code: -32603, 
            message: error.message 
          } 
        }));
      }
    });
  }

  /**
   * Process MCP requests
   */
  async processMCPRequest(data) {
    try {
      if (data.method === 'tools/list') {
        return await this.processListTools(data);
      } else if (data.method === 'tools/call') {
        return await this.processCallTool(data);
      } else if (data.method === 'prompts/list') {
        return await this.processListPrompts(data);
      } else if (data.method === 'prompts/get') {
        return await this.processGetPrompt(data);
      } else if (data.method === 'resources/list') {
        return await this.processListResources(data);
      } else if (data.method === 'resources/read') {
        return await this.processReadResource(data);
      } else if (data.method === 'resources/templates/list') {
        return await this.processListResourceTemplates(data);
      } else if (data.method === 'ping') {
        return { 
          jsonrpc: '2.0', 
          id: data.id, 
          result: { type: 'pong' } 
        };
      } else if (data.method === 'cache/stats') {
        return await this.processCacheStats(data);
      } else if (data.method === 'cache/clear') {
        return await this.processCacheClear(data);
      } else {
        return { 
          jsonrpc: '2.0', 
          id: data.id, 
          error: { 
            code: -32601, 
            message: `Method not found: ${data.method}` 
          } 
        };
      }
    } catch (error) {
      return { 
        jsonrpc: '2.0', 
        id: data.id, 
        error: { 
          code: -32603, 
          message: `Internal error: ${error.message}` 
        } 
      };
    }
  }

  /**
   * Process tools/list request
   */
  async processListTools(data) {
    const routes = this.getLoadedRoutes();
    console.log('🔍 MCP HTTP: Routes loaded:', routes.length);
    
    const tools = routes.map(route => {
      const processor = route.processorInstance;
      const openApi = processor?.openApi;

      // Build rich input schema with request body and other details
      const inputSchema = {
        type: 'object',
        properties: {
          body: { type: 'object', description: 'Request body' },
          query: { type: 'object', description: 'Query parameters' },
          headers: { type: 'object', description: 'Request headers' }
        }
      };

      // Add request body schema if available from annotations
      if (openApi?.requestBody?.content?.['application/json']?.schema) {
        inputSchema.properties.body = {
          ...inputSchema.properties.body,
          ...openApi.requestBody.content['application/json'].schema
        };
      }

      // Add required fields if specified
      if (openApi?.requestBody?.content?.['application/json']?.schema?.required) {
        inputSchema.required = ['body'];
      }

      // Create concise description without embedding full schemas
      let enhancedDescription = processor?.mcpDescription || openApi?.description || processor?.description || `Execute ${route.method} request to ${route.path}`;
      
      // Add brief schema information to description if available (without full JSON)
      if (openApi?.requestBody?.content?.['application/json']?.schema) {
        const requestSchema = openApi.requestBody.content['application/json'].schema;
        const requiredFields = requestSchema.required ? ` (required: ${requestSchema.required.join(', ')})` : '';
        enhancedDescription += `\n\n**Request Body**: ${requestSchema.type || 'object'}${requiredFields}`;
      }
        
      if (openApi?.responses?.['200']?.content?.['application/json']?.schema) {
        const responseSchema = openApi.responses['200'].content['application/json'].schema;
        enhancedDescription += `\n\n**Response**: ${responseSchema.type || 'object'}`;
      }

      return {
        name: `api_${route.path.replace(/\//g, '_')}_${route.method.toLowerCase()}`,
        description: enhancedDescription,
        inputSchema: inputSchema,
        // Add response schema information as separate field for compatibility
        responseSchema: openApi?.responses?.['200']?.content?.['application/json']?.schema || null,
        // Add additional metadata
        method: route.method,
        path: route.path,
        tags: openApi?.tags || ['api']
      };
    });
    
    // If bridge reloader is available, attempt to merge bridge tools
    if (this.bridgeReloader) {
      try {
        const bridges = this.bridgeReloader.ensureBridges();
        for (const [serverName, bridge] of bridges.entries()) {
          try {
            const bridgeResult = await bridge.rpcRequest('tools/list', {}, 5000); // 5 second timeout
            if (bridgeResult && Array.isArray(bridgeResult.tools)) {
              // Normalize bridge tools into a compatible shape with server name prefix
              bridgeResult.tools.forEach(t => {
                tools.push({
                  name: `/${serverName}/${t.name}`, // Add server name as prefix with forward slash
                  description: `[${serverName}] ${t.description || 'Bridge tool'}`,
                  inputSchema: t.inputSchema || { type: 'object', properties: {} },
                  responseSchema: null,
                  tags: ['bridge', serverName]
                });
              });
            }
          } catch (e) {
            // Log bridge errors but don't fail the whole list
            console.warn(`⚠️  Bridge tools unavailable for ${serverName}: ${e.message}`);
          }
        }
      } catch (e) {
        // Ignore overall bridge errors
      }
    }

    return {
      jsonrpc: '2.0',
      id: data.id,
      result: {
        tools
      }
    };
  }

  /**
   * Process tools/call request
   */
  async processCallTool(data) {
    const { name, arguments: args } = data.params || data;
    const routes = this.getLoadedRoutes();
    
    // First try to find API route (format: api_[path]_[http_method])
    const route = routes.find(r => 
      `api_${r.path.replace(/\//g, '_')}_${r.method.toLowerCase()}` === name
    );
    
    if (route) {
      // Handle API route
      const result = await this.executeAPIEndpoint(route, args);
      return {
        jsonrpc: '2.0',
        id: data.id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        }
      };
    }
    
    // If not found in API routes, try bridge tools
    if (this.bridgeReloader) {
      try {
        const bridges = this.bridgeReloader.ensureBridges();
        for (const [serverName, bridge] of bridges.entries()) {
          try {
            // Check if the tool name starts with the server name prefix (format: /[serverName]/[toolName])
            const prefix = `/${serverName}/`;
            if (name.startsWith(prefix)) {
              // Remove the prefix to get the original tool name
              const originalToolName = name.substring(prefix.length);
              const bridgeResult = await bridge.rpcRequest('tools/call', { name: originalToolName, arguments: args }, 5000);
              if (bridgeResult && bridgeResult.content) {
                return {
                  jsonrpc: '2.0',
                  id: data.id,
                  result: bridgeResult
                };
              }
            }
          } catch (e) {
            // Continue to next bridge if this one fails
            continue;
          }
        }
      } catch (e) {
        // Bridge error, fall through to not found
      }
    }
    
    // Tool not found in either API routes or bridge tools
    return {
      jsonrpc: '2.0',
      id: data.id,
      error: {
        code: -32602,
        message: `Tool not found: ${name}`
      }
    };
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
        const openApi = processor?.openApi;
        
        // Build rich input schema with request body and other details
        const inputSchema = {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body' },
            query: { type: 'object', description: 'Query parameters' },
            headers: { type: 'object', description: 'Request headers' }
          }
        };
        
        // Add request body schema if available from annotations
        if (openApi?.requestBody?.content?.['application/json']?.schema) {
          inputSchema.properties.body = {
            ...inputSchema.properties.body,
            ...openApi.requestBody.content['application/json'].schema
          };
        }
        
        // Add required fields if specified
        if (openApi?.requestBody?.content?.['application/json']?.schema?.required) {
          inputSchema.required = ['body'];
        }
        
        return {
          name: `${route.path}/${route.method.toLowerCase()}`,
          description: processor?.mcpDescription || openApi?.description || processor?.description || `Execute ${route.method} request to ${route.path}`,
          inputSchema: inputSchema,
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
   * Process prompts/list request with intelligent caching
   */
  async processListPrompts(data) {
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
   * Process prompts/get request
   */
  async processGetPrompt(data) {
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
   * Process resources/list request with intelligent caching
   */
  async processListResources(data) {
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
  getMimeTypeForExtension(ext) {
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
   * Process resources/templates/list request
   */
  async processListResourceTemplates(data) {
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
   * Process resources/read request with template support
   */
  async processReadResource(data) {
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
   */
  async executeAPIEndpoint(route, args) {
    // Create mock request and response objects
    const mockReq = {
      method: route.method,
      path: route.path,
      body: args.body || {},
      query: args.query || {},
      headers: args.headers || {},
      params: {}
    };

    const mockRes = {
      statusCode: 200,
      headers: {},
      json: function(data) {
        this.data = data;
        // Only set statusCode to 200 if it hasn't been explicitly set
        if (!this._statusSet) {
          this.statusCode = 200;
        }
        return this;
      },
      send: function(data) {
        this.data = data;
        // Only set statusCode to 200 if it hasn't been explicitly set
        if (!this._statusSet) {
          this.statusCode = 200;
        }
        return this;
      },
      status: function(code) {
        this.statusCode = code;
        this._statusSet = true;
        return this;
      }
    };

    // Execute the processor
    if (route.processorInstance && typeof route.processorInstance.process === 'function') {
      await route.processorInstance.process(mockReq, mockRes);
      return {
        success: true,
        statusCode: mockRes.statusCode,
        data: mockRes.data,
        endpoint: `${route.method} ${route.path}`,
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error(`Processor not available for ${route.method} ${route.path}`);
    }
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
          
          // Build rich input schema with request body and other details
          const inputSchema = {
            type: 'object',
            properties: {
              body: { type: 'object', description: 'Request body' },
              query: { type: 'object', description: 'Query parameters' },
              headers: { type: 'object', description: 'Request headers' }
            }
          };
          
          // Add request body schema if available from annotations
          if (openApi?.requestBody?.content?.['application/json']?.schema) {
            inputSchema.properties.body = {
              ...inputSchema.properties.body,
              ...openApi.requestBody.content['application/json'].schema
            };
          }
          
          // Add required fields if specified
          if (openApi?.requestBody?.content?.['application/json']?.schema?.required) {
            inputSchema.required = ['body'];
          }
          
          // Create concise description without embedding full schemas
          let enhancedDescription = processor?.mcpDescription || openApi?.description || processor?.description || `Execute ${route.method} request to ${route.path}`;
          
          // Add brief schema information to description if available (without full JSON)
          if (openApi?.requestBody?.content?.['application/json']?.schema) {
            const requestSchema = openApi.requestBody.content['application/json'].schema;
            const requiredFields = requestSchema.required ? ` (required: ${requestSchema.required.join(', ')})` : '';
            enhancedDescription += `\n\n**Request Body**: ${requestSchema.type || 'object'}${requiredFields}`;
          }
          
          if (openApi?.responses?.['200']?.content?.['application/json']?.schema) {
            const responseSchema = openApi.responses['200'].content['application/json'].schema;
            enhancedDescription += `\n\n**Response**: ${responseSchema.type || 'object'}`;
          }

          return {
            name: `${route.path.replace(/\//g, '_').replace(/^_/, '')}_${route.method.toLowerCase()}`,
            description: enhancedDescription,
            inputSchema: inputSchema,
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
  async processCacheStats(data) {
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
   * Process cache/clear request
   */
  async processCacheClear(data) {
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
}

module.exports = DynamicAPIMCPServer;
