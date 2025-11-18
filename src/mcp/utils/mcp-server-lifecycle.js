/**
 * MCP Server Lifecycle Manager
 * 
 * Handles server creation, startup, and shutdown
 */

const http = require('http');
const WebSocket = require('ws');

class MCPServerLifecycle {
  constructor(server) {
    this.server = server;
  }

  /**
   * Create HTTP and WebSocket server
   */
  createServer() {
    const MCPRequestProcessor = require('../processors/mcp-request-processor');
    const HTTPHandler = require('../handlers/transport/http-handler');
    const WebSocketHandler = require('../handlers/transport/websocket-handler');
    const STDIOHandler = require('../handlers/transport/stdio-handler');

    // Initialize request processor
    this.server.mcpRequestProcessor = new MCPRequestProcessor(this.server, {
      toolBuilder: this.server.toolBuilder,
      toolExecutor: this.server.toolExecutor,
      promptHandler: this.server.promptHandler,
      resourceHandler: this.server.resourceHandler,
      schemaNormalizer: this.server.schemaNormalizer,
      getLoadedRoutes: this.server.getLoadedRoutes.bind(this.server),
      trackRequest: this.server.trackRequest.bind(this.server),
      handleError: this.server.handleError.bind(this.server)
    });
    
    // Initialize STDIO handler if in STDIO mode
    if (this.server.stdioMode) {
      this.server.stdioHandler = new STDIOHandler(this.server, {
        processMCPRequest: this.server.mcpRequestProcessor.processMCPRequest.bind(this.server.mcpRequestProcessor)
      });
    } else {
      // Initialize HTTP and WebSocket handlers only if not in STDIO mode
      this.server.httpHandler = new HTTPHandler(this.server, {
        processMCPRequest: this.server.mcpRequestProcessor.processMCPRequest.bind(this.server.mcpRequestProcessor)
      });
      
      this.server.wsHandler = new WebSocketHandler(this.server, {
        processMCPRequest: (data) => this.server.mcpRequestProcessor.processMCPRequest(data)
      });
      
      // Create HTTP server with explicit IPv4 binding
      this.server.server = http.createServer();
      // Harden against server errors to avoid process crashes
      this.server.server.on('error', (err) => {
        try {
          console.error('❌ MCP HTTP server error (continuing):', err);
        } catch (logErr) { /* ignore logging error */ }
      });
      
      // Add HTTP endpoints for MCP Inspector compatibility
      this.server.server.on('request', (req, res) => {
        try {
          this.server.httpHandler.handleHTTPRequest(req, res);
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
      console.log(`🔌 MCP Server: Host configured as: ${this.server.host}`);
    }
  }
  
  /**
   * Create WebSocket server after HTTP server is bound
   */
  createWebSocketServer() {
    // Create WebSocket server with explicit host binding
    this.server.wss = new WebSocket.Server({ 
      server: this.server.server,
      host: this.server.host,
      family: 4,  // Force IPv4 family
      perMessageDeflate: false,
      clientTracking: true
    });
    
    this.server.wss.on('connection', (ws) => {
      console.log('🔌 New MCP WebSocket client connected');
      this.server.clients.add(ws);
      
      ws.on('message', (message) => {
        this.server.wsHandler.handleMessage(ws, message);
      });
      
      ws.on('close', () => {
        console.log('🔌 MCP WebSocket client disconnected');
        this.server.clients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error('❌ MCP WebSocket client error:', error.message);
        this.server.clients.delete(ws);
      });
    });
  }

  /**
   * Start the MCP server
   */
  async start() {
    this.createServer();
    this.server.attachBridgeListeners();

    // If in STDIO mode, start STDIO handler instead of HTTP/WebSocket server
    if (this.server.stdioMode) {
      // Redirect console.log to stderr in STDIO mode to keep stdout clean for JSON-RPC
      const originalConsoleLog = console.log;
      console.log = function(...args) {
        process.stderr.write(args.join(' ') + '\n');
      };
      // Store original for potential restoration
      console.log.original = originalConsoleLog;

      this.server.stdioHandler.start();
      if (!this.server.quiet) {
        // Remove emojis in STDIO mode to prevent encoding issues
        process.stderr.write('MCP Server started in STDIO mode\n');
        process.stderr.write('Reading from stdin, writing to stdout\n');
        process.stderr.write('Available MCP commands:\n');
        process.stderr.write('  - tools/list: Discover available API endpoints\n');
        process.stderr.write('  - tools/call: Execute a specific API endpoint\n');
        process.stderr.write('  - ping: Health check\n');
      }
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      const listenOptions = {
        host: this.server.host,
        port: this.server.port,
        family: 4  // Force IPv4
      };
      
      if (this.server.host === '0.0.0.0') {
        listenOptions.host = '0.0.0.0';
        listenOptions.family = 4;
      }
      
      this.server.server.listen(listenOptions, () => {
        this.createWebSocketServer();
        
        console.log('🚀 MCP Server started successfully!');
        console.log(`📡 WebSocket server listening on ws://${this.server.host}:${this.server.port} (IPv4)`);
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
      
      this.server.server.on('error', reject);
    });
  }

  /**
   * Stop the MCP server
   */
  stop() {
    // Close file watchers
    if (this.server.promptsWatcher) {
      this.server.promptsWatcher.close();
    }
    if (this.server.resourcesWatcher) {
      this.server.resourcesWatcher.close();
    }
    
    if (this.server.wss) {
      this.server.wss.close();
    }
    if (this.server.server) {
      this.server.server.close();
    }
    console.log('🛑 MCP Server stopped');
  }
}

module.exports = MCPServerLifecycle;

