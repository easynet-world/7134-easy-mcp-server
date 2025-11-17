/**
 * MCP HTTP Bridge Client
 * 
 * Connects to external MCP servers via HTTP/HTTPS.
 * Communicates with external MCP servers using JSON-RPC 2.0 over HTTP POST.
 * Supports multiple transport protocols:
 * - Standard HTTP MCP: POST /mcp
 * - StreamableHttp: POST / (for MCP Inspector compatibility)
 * - SSE: GET /sse (for receiving notifications via Server-Sent Events)
 * 
 * Features:
 * - JSON-RPC 2.0 protocol implementation
 * - HTTP/HTTPS transport
 * - Request/response correlation (ID-based)
 * - SSE support for real-time notifications
 * - Event emitter for notifications
 * - Initialization handshake
 * - Error handling and timeout support
 * - Automatic endpoint detection (/mcp or /)
 * 
 * Communication Protocol:
 * - HTTP POST requests with JSON-RPC 2.0 payloads
 * - SSE connection for receiving notifications
 * - Supports requests (with ID) and responses
 * - Handles errors and timeouts
 * 
 * @class MCPHTTPBridge
 * @extends EventEmitter
 */

const https = require('https');
const http = require('http');
const { EventEmitter } = require('events');
const { URL } = require('url');

class MCPHTTPBridge extends EventEmitter {
  constructor(options = {}) {
    super();
    this.url = options.url;
    if (!this.url) {
      throw new Error('MCPHTTPBridge requires a URL');
    }
    
    // Parse URL to determine protocol
    try {
      this.parsedUrl = new URL(this.url);
      this.baseUrl = `${this.parsedUrl.protocol}//${this.parsedUrl.host}${this.parsedUrl.pathname}`;
      // Ensure base URL ends with / for proper path joining
      if (!this.baseUrl.endsWith('/')) {
        this.baseUrl += '/';
      }
    } catch (error) {
      throw new Error(`Invalid URL: ${this.url}`);
    }
    
    this.nextId = 1;
    this.pending = new Map(); // id -> { resolve, reject }
    this.initialized = false;
    this.initPromise = null;
    this.quiet = options.quiet || false;
    this.timeout = options.timeout || 30000; // 30 second default timeout
    this.workingEndpoint = '/mcp'; // Default endpoint, will be determined during initialization
    this.sseConnection = null; // SSE connection for notifications
    this.sseSupported = false; // Whether SSE is supported by the server
  }

  /**
   * Make HTTP request to MCP server
   * @param {string} method - HTTP method (POST)
   * @param {string} path - Request path
   * @param {object} payload - JSON-RPC payload
   * @returns {Promise<object>} - Response result
   */
  async _httpRequest(method, path, payload) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const data = JSON.stringify(payload);
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + (url.search || ''),
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data, 'utf8')
        },
        timeout: this.timeout
      };

      const req = httpModule.request(options, (res) => {
        // Handle redirects (3xx status codes)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          req.destroy();
          // Follow redirect
          const redirectUrl = new URL(res.headers.location, url);
          return this._httpRequest(method, redirectUrl.pathname + (redirectUrl.search || ''), payload)
            .then(resolve)
            .catch(reject);
        }
        
        // Check for non-2xx status codes
        if (res.statusCode < 200 || res.statusCode >= 300) {
          req.destroy();
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage || 'Request failed'}`));
          return;
        }
        
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk.toString();
        });
        
        res.on('end', () => {
          try {
            // Check if response is HTML (likely an error page or redirect)
            const trimmedBody = body.trim();
            if (trimmedBody.startsWith('<!DOCTYPE') || trimmedBody.startsWith('<html')) {
              reject(new Error('Server returned HTML instead of JSON. This might indicate the endpoint is incorrect or the server is not an MCP server. Response preview: ' + trimmedBody.substring(0, 200)));
              return;
            }
            
            const result = JSON.parse(body);
            
            // Handle JSON-RPC response
            if (result.error) {
              reject(new Error(result.error.message || `MCP error: ${result.error.code || 'unknown'}`));
            } else {
              resolve(result.result || result);
            }
          } catch (e) {
            reject(new Error('Failed to parse response: ' + e.message + '. Response preview: ' + body.substring(0, 200)));
          }
        });
      });

      req.on('error', (e) => {
        if (e.code === 'ECONNREFUSED') {
          reject(new Error(`Cannot connect to MCP server at ${this.url}. Is the server running?`));
        } else if (e.code === 'ETIMEDOUT' || e.code === 'ECONNRESET') {
          reject(new Error(`Connection timeout. Is the MCP server running at ${this.url}?`));
        } else {
          reject(e);
        }
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(data);
      req.end();
    });
  }

  /**
   * Start the bridge (initializes connection for HTTP bridges)
   */
  start() {
    // HTTP bridges need to initialize the connection
    if (!this.initPromise) {
      this.initPromise = this._initialize();
    }
    return this.initPromise;
  }

  /**
   * Initialize the bridge with the MCP server
   */
  async _initialize() {
    try {
      const initRequest = {
        jsonrpc: '2.0',
        id: 0,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'easy-mcp-server',
            version: '1.0.0'
          }
        }
      };

      if (!this.quiet) {
        console.log(`🔌 HTTP Bridge: Initializing connection to ${this.url}`);
      }

      // Try /mcp endpoint first, then fall back to root
      let result;
      let workingEndpoint = '/mcp';
      try {
        result = await this._httpRequest('POST', '/mcp', initRequest);
      } catch (error) {
        // If /mcp fails, try root endpoint
        if (!this.quiet) {
          console.log('🔌 HTTP Bridge: /mcp endpoint failed, trying root endpoint');
        }
        try {
          result = await this._httpRequest('POST', '/', initRequest);
          workingEndpoint = '/';
        } catch (retryError) {
          throw new Error(`Failed to initialize: ${error.message}`);
        }
      }

      this.initialized = true;
      this.workingEndpoint = workingEndpoint; // Store the working endpoint for future requests
      if (!this.quiet) {
        console.log(`🔌 HTTP Bridge: Initialization completed for ${this.url} (using ${workingEndpoint} endpoint)`);
      }

      // Send initialized notification (ignore errors)
      this._httpRequest('POST', workingEndpoint, {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {}
      }).catch(() => {
        // Ignore errors for notifications - they're not critical
      });

      // Try to establish SSE connection for notifications
      this._connectSSE().catch(() => {
        if (!this.quiet) {
          console.log(`🔌 HTTP Bridge: SSE not available for ${this.url} (this is normal if server doesn't support SSE)`);
        }
      });

      return result;
    } catch (error) {
      if (!this.quiet) {
        console.error(`❌ HTTP Bridge: Initialization failed for ${this.url}:`, error.message);
      }
      throw error;
    }
  }

  /**
   * Connect to SSE endpoint for receiving notifications
   */
  _connectSSE() {
    return new Promise((resolve, reject) => {
      const url = new URL('/sse', this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + (url.search || ''),
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        },
        timeout: this.timeout
      };

      const req = httpModule.request(options, (res) => {
        // Check if this is an SSE response
        if (res.statusCode !== 200) {
          reject(new Error(`SSE connection failed with status ${res.statusCode}`));
          return;
        }

        const contentType = res.headers['content-type'] || '';
        if (!contentType.includes('text/event-stream')) {
          reject(new Error('Server does not support SSE'));
          return;
        }

        this.sseSupported = true;
        this.sseConnection = res;
        
        if (!this.quiet) {
          console.log(`🔌 HTTP Bridge: SSE connection established for ${this.url}`);
        }

        let buffer = '';
        
        res.on('data', (chunk) => {
          buffer += chunk.toString();
          
          // Process complete SSE messages (lines ending with \n\n)
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || ''; // Keep incomplete message in buffer
          
          for (const line of lines) {
            if (line.trim()) {
              this._processSSEMessage(line);
            }
          }
        });

        res.on('end', () => {
          if (!this.quiet) {
            console.log(`🔌 HTTP Bridge: SSE connection closed for ${this.url}`);
          }
          this.sseConnection = null;
          this.sseSupported = false;
          
          // Try to reconnect after a delay
          setTimeout(() => {
            if (this.initialized) {
              this._connectSSE().catch(() => {
                // Ignore reconnection errors
              });
            }
          }, 5000);
        });

        res.on('error', (error) => {
          if (!this.quiet) {
            console.warn(`⚠️  HTTP Bridge: SSE connection error for ${this.url}:`, error.message);
          }
          this.sseConnection = null;
          this.sseSupported = false;
        });

        resolve();
      });

      req.on('error', (e) => {
        reject(e);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('SSE connection timeout'));
      });

      req.end();
    });
  }

  /**
   * Process SSE message and emit as notification
   */
  _processSSEMessage(message) {
    try {
      // SSE format: "data: {json}\n\n"
      const lines = message.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6); // Remove "data: " prefix
          const data = JSON.parse(jsonStr);
          
          // Emit as notification if it's a notification (no id)
          if (data && data.method && data.id == null) {
            this.emit('notification', data);
            if (!this.quiet) {
              console.log(`🔌 HTTP Bridge: Received notification: ${data.method}`);
            }
          }
        }
      }
    } catch (error) {
      // Ignore parsing errors for SSE messages
      if (!this.quiet) {
        console.warn('⚠️  HTTP Bridge: Failed to parse SSE message:', error.message);
      }
    }
  }

  /**
   * Stop the bridge (closes SSE connection and clears pending requests)
   */
  stop() {
    // Close SSE connection if open
    if (this.sseConnection) {
      try {
        this.sseConnection.destroy();
      } catch (error) {
        // Ignore errors when closing
      }
      this.sseConnection = null;
    }
    
    // Clear pending requests
    for (const [, pending] of this.pending) {
      pending.reject(new Error('Bridge stopped'));
    }
    this.pending.clear();
    this.initialized = false;
    this.initPromise = null;
    this.sseSupported = false;
  }

  /**
   * Send RPC request to the MCP server
   * @param {string} method - RPC method name
   * @param {object} params - RPC parameters
   * @param {number} timeout - Request timeout in milliseconds
   * @returns {Promise<object>} - Response result
   */
  async rpcRequest(method, params = {}, timeout = 30000) {
    // Ensure bridge is initialized
    if (!this.initialized) {
      if (!this.initPromise) {
        this.initPromise = this._initialize();
      }
      await this.initPromise;
    }

    const id = this.nextId++;
    const payload = { jsonrpc: '2.0', id, method, params };

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC request timeout after ${timeout}ms for method: ${method}`));
      }, timeout);

      // Store pending request
      this.pending.set(id, {
        resolve: (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        }
      });

      // Make HTTP request using the working endpoint (determined during initialization)
      const endpoint = this.workingEndpoint || '/mcp';
      this._httpRequest('POST', endpoint, payload)
        .then((result) => {
          const pending = this.pending.get(id);
          if (pending) {
            this.pending.delete(id);
            pending.resolve(result);
          }
        })
        .catch((error) => {
          const pending = this.pending.get(id);
          if (pending) {
            this.pending.delete(id);
            pending.reject(error);
          }
        });
    });
  }
}

module.exports = MCPHTTPBridge;

