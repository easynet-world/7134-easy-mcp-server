/**
 * MCP (Model Context Protocol) Server
 * Handles AI model communication and API execution
 */

const WebSocket = require('ws');
const http = require('http');

class DynamicAPIMCPServer {
  constructor(host = '0.0.0.0', port = 3001) {
    this.host = host;
    this.port = port;
    this.wss = null;
    this.server = null;
    this.clients = new Set();
    this.httpClients = new Map();
    
    // Don't import server module to avoid circular dependency
    this.getLoadedRoutes = () => [];
  }

  /**
   * Set routes after server is loaded
   */
  setRoutes(routes) {
    console.log('🔌 MCP Server: Setting routes:', routes.length);
    console.log('🔌 MCP Server: Route details:', routes.map(r => ({ method: r.method, path: r.path })));
    this.getLoadedRoutes = () => routes;
    
    // Notify all connected clients about route changes
    this.notifyRouteChanges(routes);
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
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
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
          prompts: {}
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
                prompts: {}
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
      } else if (data.method === 'ping') {
        return { 
          jsonrpc: '2.0', 
          id: data.id, 
          result: { type: 'pong' } 
        };
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
      
      // Parse the tool name to get method and path
      const [method, ...pathParts] = name.split('_');
      const path = '/' + pathParts.join('/');
      
      console.log('🔍 MCP Server: Tool call request:', { name, method, path });
      
      // Find the route
      const routes = this.getLoadedRoutes();
      console.log('🔍 MCP Server: Available routes:', routes.map(r => ({ method: r.method, path: r.path })));
      
      const route = routes.find(r => 
        r.method.toLowerCase() === method.toUpperCase() && 
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
        console.log('  - list_tools: Discover available API endpoint');
        console.log('  - call_tool: Execute a specific API endpoint');
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
    if (this.wss) {
      this.wss.close();
    }
    if (this.server) {
      this.server.close();
    }
    console.log('🛑 MCP Server stopped');
  }
}

module.exports = DynamicAPIMCPServer;
