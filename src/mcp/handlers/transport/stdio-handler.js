/**
 * STDIO Handler
 * 
 * Handles STDIO-based MCP protocol requests using Content-Length framing
 * (LSP-style). This transport allows the MCP server to communicate via
 * standard input/output streams, making it suitable for command-line tools
 * and process-based integrations.
 * 
 * Features:
 * - Content-Length framing (LSP-style)
 * - JSON-RPC 2.0 protocol
 * - Reads from stdin, writes to stdout
 * - Delegates actual processing to MCPRequestProcessor
 * - Consistent behavior with HTTP and WebSocket handlers
 * 
 * Transport Protocol:
 * - Content-Length header followed by JSON-RPC 2.0 payload
 * - Format: "Content-Length: <length>\r\n\r\n<json-payload>"
 * - Supports requests (with ID) and notifications (without ID)
 * 
 * @class STDIOHandler
 */

class STDIOHandler {
  constructor(server, { processMCPRequest }) {
    this.server = server;
    this.processMCPRequest = processMCPRequest;
    this.buffer = Buffer.alloc(0);
    this.expectedLength = null;
    this.initialized = false;
    
    // Load package.json version
    const path = require('path');
    const fs = require('fs');
    this.version = '1.0.0'; // Default fallback
    try {
      let packagePath = path.resolve(__dirname, '../../../package.json');
      if (!fs.existsSync(packagePath)) {
        packagePath = path.join(process.cwd(), 'package.json');
      }
      if (fs.existsSync(packagePath)) {
        this.version = JSON.parse(fs.readFileSync(packagePath, 'utf8')).version;
      }
    } catch (error) {
      // Use fallback version if package.json cannot be loaded
    }
  }

  /**
   * Start STDIO transport
   * Sets up stdin/stdout handlers and processes incoming messages
   */
  start() {
    // Enable stdout writes for JSON-RPC messages (if stdout was protected)
    // This allows the STDIO handler to write JSON-RPC responses to stdout
    if (typeof global !== 'undefined' && global.__enableStdoutForJSONRPC) {
      global.__enableStdoutForJSONRPC();
    }
    
    // Keep stdin in binary mode for Content-Length framing
    // Don't set encoding - we need raw binary data
    if (process.stdin.setRawMode) {
      // Don't use setRawMode as it changes terminal behavior
      // Just ensure we get binary chunks
    }
    
    // Handle stdin data (chunk will be Buffer)
    process.stdin.on('data', (chunk) => {
      this.handleData(chunk);
    });
    
    // Handle stdin end
    process.stdin.on('end', () => {
      if (!this.server.quiet) {
        // Remove emojis in STDIO mode to prevent encoding issues
        process.stderr.write('STDIO: stdin ended\n');
      }
      process.exit(0);
    });
    
    // Handle stdin errors
    process.stdin.on('error', (error) => {
      if (!this.server.quiet) {
        // Remove emojis in STDIO mode to prevent encoding issues
        process.stderr.write(`STDIO: stdin error: ${error.message}\n`);
      }
    });
    
    // Keep stdout in binary mode for Content-Length framing
    // Don't set encoding - we write raw binary data

    // Use stderr for informational messages in STDIO mode to keep stdout clean for JSON-RPC
    // Remove emojis to prevent encoding issues
    if (!this.server.quiet) {
      process.stderr.write('STDIO transport started\n');
      process.stderr.write('Reading from stdin\n');
      process.stderr.write('Writing to stdout\n');
    }
  }

  /**
   * Handle incoming data chunks
   * Parses Content-Length framed messages
   */
  handleData(chunk) {
    this.buffer = Buffer.concat([this.buffer, Buffer.from(chunk)]);
    
    while (true) {
      // If we're expecting headers, try to parse them
      if (this.expectedLength === null) {
        const headerEnd = this.buffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) {
          // Headers not complete yet, wait for more data
          return;
        }
        
        const headerText = this.buffer.slice(0, headerEnd).toString('utf8');
        const headers = this.parseHeaders(headerText);
        
        // Extract Content-Length
        const contentLength = parseInt(headers['content-length'], 10);
        if (isNaN(contentLength) || contentLength < 0) {
          this.sendError(null, -32700, 'Invalid Content-Length header');
          this.buffer = Buffer.alloc(0);
          return;
        }
        
        this.expectedLength = contentLength;
        this.buffer = this.buffer.slice(headerEnd + 4); // Remove headers and \r\n\r\n
      }
      
      // Check if we have enough data for the message
      if (this.buffer.length < this.expectedLength) {
        // Not enough data yet, wait for more
        return;
      }
      
      // Extract the message
      const messageBuffer = this.buffer.slice(0, this.expectedLength);
      this.buffer = this.buffer.slice(this.expectedLength);
      this.expectedLength = null;
      
      // Parse and process the message
      try {
        const message = JSON.parse(messageBuffer.toString('utf8'));
        this.handleMessage(message);
      } catch (error) {
        this.sendError(null, -32700, `Parse error: ${error.message}`);
      }
    }
  }

  /**
   * Parse HTTP-style headers
   */
  parseHeaders(headerText) {
    const headers = {};
    const lines = headerText.split('\r\n');
    
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = line.slice(0, colonIndex).trim().toLowerCase();
      const value = line.slice(colonIndex + 1).trim();
      headers[key] = value;
    }
    
    return headers;
  }

  /**
   * Handle a parsed JSON-RPC message
   */
  async handleMessage(message) {
    try {
      // Handle initialize request
      if (message.method === 'initialize' && !this.initialized) {
        const response = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              prompts: {},
              resources: {}
            },
            serverInfo: {
              name: 'easy-mcp-server',
              version: this.version || '1.0.0'
            }
          }
        };
        // Store server info for potential later retrieval
        this.serverInfo = response.result.serverInfo;
        this.sendResponse(response);
        this.initialized = true;
        
        // Send initialized notification after a small delay to ensure response is sent first
        setImmediate(() => {
          this.sendNotification({
            jsonrpc: '2.0',
            method: 'notifications/initialized'
          });
        });
        return;
      }
      
      // Handle re-initialization (some clients may send initialize multiple times)
      if (message.method === 'initialize' && this.initialized) {
        // Return the same server info if already initialized
        const response = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              prompts: {},
              resources: {}
            },
            serverInfo: this.serverInfo || {
              name: 'easy-mcp-server',
              version: this.version || '1.0.0'
            }
          }
        };
        this.sendResponse(response);
        return;
      }
      
      // Process other MCP requests
      const response = await this.processMCPRequest(message);
      if (message.id !== undefined && message.id !== null) {
        // Only send response if it's a request (has ID)
        this.sendResponse(response);
      }
    } catch (error) {
      this.sendError(message.id, -32603, `Internal error: ${error.message}`);
    }
  }

  /**
   * Send a JSON-RPC response
   */
  sendResponse(response) {
    const json = JSON.stringify(response);
    const contentLength = Buffer.byteLength(json, 'utf8');
    const header = Buffer.from(`Content-Length: ${contentLength}\r\n\r\n`, 'utf8');
    const body = Buffer.from(json, 'utf8');
    
    try {
      process.stdout.write(header);
      process.stdout.write(body);
    } catch (error) {
      if (!this.server.quiet) {
        console.error('❌ STDIO: Failed to write to stdout:', error);
      }
    }
  }

  /**
   * Send a JSON-RPC notification
   */
  sendNotification(notification) {
    const json = JSON.stringify(notification);
    const contentLength = Buffer.byteLength(json, 'utf8');
    const header = Buffer.from(`Content-Length: ${contentLength}\r\n\r\n`, 'utf8');
    const body = Buffer.from(json, 'utf8');
    
    try {
      process.stdout.write(header);
      process.stdout.write(body);
    } catch (error) {
      if (!this.server.quiet) {
        console.error('❌ STDIO: Failed to write notification to stdout:', error);
      }
    }
  }

  /**
   * Send an error response
   */
  sendError(id, code, message) {
    const response = {
      jsonrpc: '2.0',
      id: id,
      error: {
        code: code,
        message: message
      }
    };
    this.sendResponse(response);
  }
}

module.exports = STDIOHandler;

