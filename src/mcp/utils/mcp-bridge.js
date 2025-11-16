const { spawn } = require('child_process');
const { EventEmitter } = require('events');

/**
 * MCP Bridge Client
 * 
 * Minimal stdio JSON-RPC 2.0 bridge with LSP-style Content-Length framing.
 * Communicates with external MCP servers via stdio (stdin/stdout).
 * 
 * Features:
 * - JSON-RPC 2.0 protocol implementation
 * - LSP-style Content-Length framing
 * - stdio communication (spawns child processes)
 * - Request/response correlation (ID-based)
 * - Event emitter for notifications
 * - Initialization handshake
 * - Error handling and reconnection support
 * 
 * Communication Protocol:
 * - Content-Length header followed by JSON-RPC payload
 * - Supports requests (with ID) and notifications (without ID)
 * - Handles responses and errors
 * 
 * @class MCPBridge
 * @extends EventEmitter
 */
class MCPBridge extends EventEmitter {
  constructor(options = {}) {
    super();
    this.command = options.command;
    this.args = Array.isArray(options.args) ? options.args : [];
    this.proc = null;
    this.env = options.env && typeof options.env === 'object' ? options.env : null;
    this.cwd = options.cwd || null; // Support working directory for local projects
    this.nextId = 1;
    this.pending = new Map(); // id -> { resolve, reject }
    this.initialized = false;
    this.initPromise = null;
    this.quiet = options.quiet || false;

    // Parser state
    this.buffer = Buffer.alloc(0);
    this.expectingHeaders = true;
    this.expectedLength = 0;
  }

  start() {
    if (!this.command) throw new Error('MCPBridge requires a command');
    if (this.proc) return;
    const spawnEnv = this.env ? { ...process.env, ...this.env } : process.env;
    const spawnOptions = {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: spawnEnv
    };
    if (this.cwd) {
      spawnOptions.cwd = this.cwd;
    }
    this.proc = spawn(this.command, this.args, spawnOptions);

    this.proc.stdout.on('data', (chunk) => this._onData(chunk));
    this.proc.stderr.on('data', (chunk) => {
      // Surface stderr as warning but do not crash
      const msg = chunk.toString();
      
      // Filter out common warning messages in quiet mode
      const isWarningMessage = msg.includes('exposes content of the browser instance') ||
                              msg.includes('Avoid sharing sensitive or personal information') ||
                              msg.includes('chrome-devtools-mcp exposes content');
      
      if (!this.quiet || !isWarningMessage) {
        console.log(`🔌 Bridge stderr: ${msg}`);
      }
      this.emit('stderr', msg);
    });
    this.proc.on('exit', (code, signal) => {
      const err = new Error(`MCP bridge exited (code=${code}, signal=${signal || 'null'})`);
      // Reject all pending requests
      for (const [, pending] of this.pending) {
        pending.reject(err);
      }
      this.pending.clear();
      this.proc = null;
    });

  }

  _initialize() {
    return new Promise((resolve, reject) => {
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

      const message = JSON.stringify(initRequest) + '\n';
      
      if (!this.quiet) {
        console.log('🔌 Bridge: Sending initialization message:', JSON.stringify(message));
      }

      // Set up a one-time listener for the initialization response
      let timeoutId;
      const initHandler = (msg) => {
        if (msg.id === 0) {
          clearTimeout(timeoutId);
          this.removeListener('response', initHandler);
          this.initialized = true;
          if (!this.quiet) {
            console.log('🔌 Bridge: Initialization completed');
          }
          resolve(msg);
        }
      };

      // Store the handler temporarily
      this.once('response', initHandler);

      // Set up timeout for initialization (increased to 30 seconds for slow MCP servers)
      timeoutId = setTimeout(() => {
        this.removeListener('response', initHandler);
        reject(new Error('Bridge initialization timeout'));
      }, 30000);

      try {
        if (!this.quiet) {
          console.log('🔌 Bridge: Writing to stdin...');
        }
        this.proc.stdin.write(message);
        if (!this.quiet) {
          console.log('🔌 Bridge: Sent initialization request');
          
          // Check if stdin is writable
          console.log('🔌 Bridge: stdin writable:', this.proc.stdin.writable);
          console.log('🔌 Bridge: stdin destroyed:', this.proc.stdin.destroyed);
        }
        
      } catch (err) {
        clearTimeout(timeoutId);
        this.removeListener('response', initHandler);
        reject(new Error(`Failed to initialize MCP bridge: ${err.message}`));
      }
    });
  }

  stop() {
    if (this.proc) {
      try { this.proc.kill(); } catch (err) {
        this.emit('stderr', `failed to stop bridge: ${err && err.message ? err.message : String(err)}`);
      }
      this.proc = null;
    }
  }

  async rpcRequest(method, params = {}, timeout = 10000) {
    if (!this.proc) this.start();
    
    // Wait for initialization to complete
    if (!this.initialized) {
      if (!this.initPromise) {
        this.initPromise = this._initialize();
      }
      await this.initPromise;
    }
    
    const id = this.nextId++;
    const payload = { jsonrpc: '2.0', id, method, params };
    const message = JSON.stringify(payload) + '\n';

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC request timeout after ${timeout}ms for method: ${method}`));
      }, timeout);
      
      // Clear timeout when request completes
      const originalResolve = this.pending.get(id).resolve;
      const originalReject = this.pending.get(id).reject;
      
      this.pending.set(id, { 
        resolve: (result) => {
          clearTimeout(timeoutId);
          originalResolve(result);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          originalReject(error);
        }
      });
      
      try {
        this.proc.stdin.write(message);
      } catch (err) {
        clearTimeout(timeoutId);
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  _onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    // Only log raw stdout in debug mode (when quiet is false and it looks like JSON)
    // This reduces noise from informational messages
    if (!this.quiet) {
      const chunkStr = chunk.toString();
      const firstLine = chunkStr.split('\n')[0].trim();
      // Only log if it looks like it might be JSON
      if (firstLine.startsWith('{') || firstLine.startsWith('[')) {
        console.log('🔌 Bridge stdout raw:', JSON.stringify(chunkStr.substring(0, 200)));
      }
    }

    // Support both LSP-style (Content-Length headers) and NDJSON (newline-delimited JSON)
    while (true) {
      // First, try to detect if we have LSP-style headers
      if (this.expectingHeaders) {
        const headerEnd = this.buffer.indexOf('\r\n\r\n');
        
        if (headerEnd !== -1) {
          // Found LSP-style headers
          const headerText = this.buffer.slice(0, headerEnd).toString('utf8');
          const contentLengthMatch = headerText.match(/Content-Length:\s*(\d+)/i);

          if (contentLengthMatch) {
            const contentLength = parseInt(contentLengthMatch[1], 10);
            if (!isNaN(contentLength) && contentLength >= 0) {
              this.expectedLength = contentLength;
              this.expectingHeaders = false;
              this.buffer = this.buffer.slice(headerEnd + 4); // Remove headers and \r\n\r\n
              
              // Check if we have enough data for the message
              if (this.buffer.length < this.expectedLength) {
                // Not enough data yet, wait for more
                return;
              }

              // Extract the message
              const messageBuffer = this.buffer.slice(0, this.expectedLength);
              this.buffer = this.buffer.slice(this.expectedLength);
              this.expectingHeaders = true;
              this.expectedLength = 0;

              // Parse and process the message
              try {
                const msg = JSON.parse(messageBuffer.toString('utf8'));
                this._handleMessage(msg);
                continue; // Continue parsing more messages
              } catch (err) {
                if (!this.quiet) {
                  console.log('🔌 Bridge: Failed to parse LSP message:', messageBuffer.toString('utf8'), err.message);
                }
                // Reset and try NDJSON format
                this.expectingHeaders = true;
                this.expectedLength = 0;
              }
            }
          }
        }
        
        // If no LSP headers found, try NDJSON format (newline-delimited JSON)
        // Check for both \n and \r\n line endings
        let newlineIndex = this.buffer.indexOf('\n');
        let lineEndingLength = 1;
        if (newlineIndex === -1) {
          newlineIndex = this.buffer.indexOf('\r\n');
          if (newlineIndex !== -1) {
            lineEndingLength = 2;
          }
        }
        
        if (newlineIndex !== -1) {
          // Found a newline, try to parse as NDJSON
          const line = this.buffer.slice(0, newlineIndex).toString('utf8').trim();
          this.buffer = this.buffer.slice(newlineIndex + lineEndingLength);
          
          if (line.length > 0) {
            // Check if line looks like JSON before attempting to parse
            // JSON messages should start with { or [
            const trimmedLine = line.trim();
            const looksLikeJSON = trimmedLine.startsWith('{') || trimmedLine.startsWith('[');
            
            if (looksLikeJSON) {
              try {
                const msg = JSON.parse(line);
                this._handleMessage(msg);
                continue; // Continue parsing more messages
              } catch (err) {
                // Only log if it looked like JSON but failed to parse
                if (!this.quiet) {
                  console.log('🔌 Bridge: Failed to parse NDJSON message:', line.substring(0, 100), err.message);
                }
                // Continue to next line
              }
            } else {
              // Line doesn't look like JSON (likely informational output), silently skip
              // This prevents error logs for informational messages from child processes
              continue;
            }
          } else {
            // Empty line, continue
            continue;
          }
        } else {
          // No newline found yet, wait for more data
          return;
        }
      } else {
        // We're in the middle of reading an LSP message
        if (this.buffer.length < this.expectedLength) {
          // Not enough data yet, wait for more
          return;
        }

        // Extract the message
        const messageBuffer = this.buffer.slice(0, this.expectedLength);
        this.buffer = this.buffer.slice(this.expectedLength);
        this.expectingHeaders = true;
        this.expectedLength = 0;

        // Parse and process the message
        try {
          const msg = JSON.parse(messageBuffer.toString('utf8'));
          this._handleMessage(msg);
        } catch (err) {
          if (!this.quiet) {
            console.log('🔌 Bridge: Failed to parse message:', messageBuffer.toString('utf8'), err.message);
          }
        }
      }
    }
  }

  _handleMessage(msg) {
    if (!this.quiet) {
      console.log('🔌 Bridge: Received message:', JSON.stringify(msg, null, 2));
    }

    // Notification (no id)
    if (msg && typeof msg === 'object' && msg.method && msg.id == null) {
      if (!this.quiet) {
        console.log('🔌 Bridge: Emitting notification:', msg.method);
      }
      this.emit('notification', msg);
      return;
    }

    // Response
    if (msg && Object.prototype.hasOwnProperty.call(msg, 'id')) {
      if (!this.quiet) {
        console.log(`🔌 Bridge: Emitting response for id ${msg.id}`);
      }
      // Emit response event for initialization handling
      this.emit('response', msg);

      const pending = this.pending.get(msg.id);
      if (!pending) {
        if (!this.quiet) {
          console.log(`🔌 Bridge: No pending request for id ${msg.id}`);
        }
        return;
      }
      this.pending.delete(msg.id);
      if (msg.error) {
        if (!this.quiet) {
          console.log(`🔌 Bridge: Rejecting request ${msg.id} with error:`, msg.error);
        }
        pending.reject(new Error(msg.error.message || 'MCP error'));
      } else {
        if (!this.quiet) {
          console.log(`🔌 Bridge: Resolving request ${msg.id} with result:`, msg.result);
        }
        pending.resolve(msg.result);
      }
    }
  }

  _indexOfSequence(haystack, needle) {
    // Simple buffer subsequence search
    for (let i = 0; i <= haystack.length - needle.length; i++) {
      let found = true;
      for (let j = 0; j < needle.length; j++) {
        if (haystack[i + j] !== needle[j]) { found = false; break; }
      }
      if (found) return i;
    }
    return -1;
  }
}

module.exports = MCPBridge;


