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

class DynamicAPIMCPServer {
  constructor(host = '0.0.0.0', port = 3001, options = {}) {
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
    
    // Initialize MCP Cache Manager for intelligent caching
    this.cacheManager = new MCPCacheManager('./mcp', {
      enableHotReload: true,
      logger: options.logger
    });
    
    // Configuration options
    this.config = {
      mcp: {
        prompts: {
          enabled: options.prompts?.enabled !== false,
          directory: options.prompts?.directory || './mcp/prompts',
          watch: options.prompts?.watch !== false,
          formats: options.prompts?.formats || ['json', 'yaml', 'yml']
        },
        resources: {
          enabled: options.resources?.enabled !== false,
          directory: options.resources?.directory || './mcp/resources',
          watch: options.resources?.watch !== false,
          formats: options.resources?.formats || ['json', 'yaml', 'yml', 'md', 'txt']
        }
      }
    };
    
    // File watchers
    this.promptsWatcher = null;
    this.resourcesWatcher = null;
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
    this.loadPromptsAndResourcesFromFilesystem();
    
    // Notify all connected clients about route changes
    this.notifyRouteChanges(routes);
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
      // Load prompts if enabled
      if (this.config.mcp.prompts.enabled) {
        const promptsPath = path.resolve(process.cwd(), this.config.mcp.prompts.directory);
        await this.loadPromptsFromDirectory(promptsPath);
      }
      
      // Load resources if enabled
      if (this.config.mcp.resources.enabled) {
        const resourcesPath = path.resolve(process.cwd(), this.config.mcp.resources.directory);
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
  async loadPromptsFromDirectory(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively load subdirectories
          await this.loadPromptsFromDirectory(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          // Load supported prompt file formats
          if (this.config.mcp.prompts.formats.includes(ext.substring(1))) {
            await this.loadPromptFromFile(fullPath);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read - this is normal
      console.log('🔌 MCP Server: No prompts directory found or accessible');
    }
  }

  /**
   * Load a single prompt from a file (JSON or YAML)
   */
  async loadPromptFromFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const ext = path.extname(filePath).toLowerCase();
      
      let promptData;
      if (ext === '.json') {
        promptData = JSON.parse(content);
      } else if (ext === '.yaml' || ext === '.yml') {
        promptData = yaml.load(content);
      } else {
        throw new Error(`Unsupported file format: ${ext}`);
      }
      
      // Generate a name from the file path if not provided
      const relativePath = path.relative(path.resolve(process.cwd(), this.config.mcp.prompts.directory), filePath);
      const name = promptData.name || relativePath.replace(/\.(json|yaml|yml)$/, '').replace(/\//g, '_');
      
      const prompt = {
        name: name,
        description: promptData.description || `Prompt from ${relativePath}`,
        template: promptData.instructions || promptData.template || '',
        arguments: promptData.arguments?.properties ? 
          Object.keys(promptData.arguments.properties).map(key => ({
            name: key,
            description: promptData.arguments.properties[key].description || '',
            required: promptData.arguments.required?.includes(key) || false
          })) : []
      };
      
      this.addPrompt(prompt);
    } catch (error) {
      console.warn(`⚠️  MCP Server: Failed to load prompt from ${filePath}:`, error.message);
    }
  }

  /**
   * Load resources from a directory recursively
   */
  async loadResourcesFromDirectory(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively load subdirectories
          await this.loadResourcesFromDirectory(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          // Load supported resource file formats
          if (this.config.mcp.resources.formats.includes(ext.substring(1))) {
            await this.loadResourceFromFile(fullPath);
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
  async loadResourceFromFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const relativePath = path.relative(path.resolve(process.cwd(), this.config.mcp.resources.directory), filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      // Generate URI from file path
      const uri = `resource://${relativePath.replace(/\//g, '/')}`;
      
      // Determine MIME type and process content based on file extension
      let mimeType = 'text/plain';
      let processedContent = content;
      let resourceName = null;
      let resourceDescription = null;
      
      if (ext === '.md') {
        mimeType = 'text/markdown';
      } else if (ext === '.json') {
        mimeType = 'application/json';
        // Try to parse and re-stringify JSON for validation
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
        mimeType = 'application/x-yaml';
        // Try to parse YAML for validation
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
      } else if (ext === '.txt') {
        mimeType = 'text/plain';
      }
      
      // Generate name from file path if not provided in content
      const name = resourceName || relativePath.replace(/\//g, ' - ').replace(/\.(md|json|yaml|yml|txt)$/, '');
      const description = resourceDescription || `Resource from ${relativePath}`;
      
      const resource = {
        uri: uri,
        name: name,
        description: description,
        mimeType: mimeType,
        content: processedContent
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
    
    const promptsPath = path.resolve(process.cwd(), this.config.mcp.prompts.directory);
    
    this.promptsWatcher = chokidar.watch(promptsPath, {
      ignored: /(^|[/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });
    
    this.promptsWatcher
      .on('add', (filePath) => {
        console.log(`🔌 MCP Server: New prompt file added: ${filePath}`);
        this.loadPromptFromFile(filePath);
        this.notifyPromptsChanged();
      })
      .on('change', (filePath) => {
        console.log(`🔌 MCP Server: Prompt file changed: ${filePath}`);
        this.loadPromptFromFile(filePath);
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
    
    const resourcesPath = path.resolve(process.cwd(), this.config.mcp.resources.directory);
    
    this.resourcesWatcher = chokidar.watch(resourcesPath, {
      ignored: /(^|[/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });
    
    this.resourcesWatcher
      .on('add', (filePath) => {
        console.log(`🔌 MCP Server: New resource file added: ${filePath}`);
        this.loadResourceFromFile(filePath);
        this.notifyResourcesChanged();
      })
      .on('change', (filePath) => {
        console.log(`🔌 MCP Server: Resource file changed: ${filePath}`);
        this.loadResourceFromFile(filePath);
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
    const relativePath = path.relative(path.resolve(process.cwd(), this.config.mcp.prompts.directory), filePath);
    const name = relativePath.replace(/\.(json|yaml|yml)$/, '').replace(/\//g, '_');
    this.prompts.delete(name);
  }

  /**
   * Remove a resource by file path
   */
  removeResourceByFilePath(filePath) {
    const relativePath = path.relative(path.resolve(process.cwd(), this.config.mcp.resources.directory), filePath);
    const uri = `resource://${relativePath.replace(/\//g, '/')}`;
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
        prompts: Array.from(this.prompts.values()).map(prompt => ({
          name: prompt.name,
          description: prompt.description,
          arguments: prompt.arguments || []
        }))
      }
    };

    this.broadcastNotification(notification);
  }

  /**
   * Notify clients about resources changes
   */
  notifyResourcesChanged() {
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/resourcesChanged',
      params: {
        resources: Array.from(this.resources.values()).map(resource => ({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType
        }))
      }
    };

    this.broadcastNotification(notification);
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
    
    // Add HTTP endpoints for MCP Inspector compatibility
    this.server.on('request', (req, res) => {
      this.handleHTTPRequest(req, res);
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
    } else if (req.url === '/' && req.method === 'GET') {
      // Serve MCP server info page
      this.handleMCPInfoPage(req, res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
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
      const envHtmlPath = process.env.MCP_INFO_HTML_PATH;
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
      console.error('❌ SSE connection error:', error);
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
        name: `${route.method.toLowerCase()}_${route.path.replace(/\//g, '_').replace(/^_/, '')}`,
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
    
    const route = routes.find(r => 
      `${r.method.toLowerCase()}_${r.path.replace(/\//g, '_').replace(/^_/, '')}` === name
    );
    
    if (!route) {
      return {
        jsonrpc: '2.0',
        id: data.id,
        error: {
          code: -32602,
          message: `Tool not found: ${name}`
        }
      };
    }
    
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
          name: `${route.method.toLowerCase()}_${route.path.replace(/\//g, '_').replace(/^_/, '')}`,
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
      
      // Parse the tool name to get method and path (method is now at the end)
      const parts = name.split('_');
      const method = parts[parts.length - 1]; // Last part is the method
      const pathParts = parts.slice(0, -1); // Everything except the last part is the path
      const path = '/' + pathParts.join('/');
      
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
      const prompt = this.prompts.get(name);
      
      if (!prompt) {
        throw new Error(`Prompt not found: ${name}`);
      }
      
      // Process template with arguments if provided
      let processedTemplate = prompt.template;
      if (args && prompt.arguments) {
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
   * Handle WebSocket resources/read request
   */
  async handleReadResource(ws, data) {
    try {
      const { uri } = data;
      const resource = this.resources.get(uri);
      
      if (!resource) {
        throw new Error(`Resource not found: ${uri}`);
      }
      
      ws.send(JSON.stringify({
        type: 'read_resource_response',
        id: data.id,
        result: {
          contents: [
            {
              uri: resource.uri,
              mimeType: resource.mimeType,
              text: resource.content
            }
          ]
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
    const prompt = this.prompts.get(name);
    
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
    let processedTemplate = prompt.template;
    if (args && prompt.arguments) {
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
   * Process resources/read request
   */
  async processReadResource(data) {
    const { uri } = data.params || data;
    const resource = this.resources.get(uri);
    
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
    
    return {
      jsonrpc: '2.0',
      id: data.id,
      result: {
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: resource.content
          }
        ]
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
