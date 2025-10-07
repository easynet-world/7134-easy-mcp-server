const { spawn } = require('child_process');
const { EventEmitter } = require('events');

/**
 * Minimal stdio JSON-RPC 2.0 bridge with LSP-style Content-Length framing.
 * Designed to talk to external MCP servers (e.g., chrome-devtools-mcp).
 */
class MCPBridge extends EventEmitter {
  constructor(options = {}) {
    super();
    this.command = options.command;
    this.args = Array.isArray(options.args) ? options.args : [];
    this.proc = null;
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
    this.proc = spawn(this.command, this.args, {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    });

    this.proc.stdout.on('data', (chunk) => this._onData(chunk));
    this.proc.stderr.on('data', (chunk) => {
      // Surface stderr as warning but do not crash
      const msg = chunk.toString();
      if (!this.quiet) {
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
      const initHandler = (msg) => {
        if (msg.id === 0) {
          this.initialized = true;
          if (!this.quiet) {
            console.log('🔌 Bridge: Initialization completed');
          }
          resolve(msg);
        }
      };

      // Store the handler temporarily
      this.once('response', initHandler);

      // Set up timeout for initialization
      const timeoutId = setTimeout(() => {
        this.removeListener('response', initHandler);
        reject(new Error('Bridge initialization timeout'));
      }, 10000);

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
    if (!this.quiet) {
      console.log('🔌 Bridge stdout raw:', JSON.stringify(chunk.toString()));
    }
    
    // Parse newline-delimited JSON
    const data = this.buffer.toString('utf8');
    const lines = data.split('\n');
    
    // Keep the last line in buffer if it's not complete
    this.buffer = Buffer.from(lines.pop() || '', 'utf8');
    
    // Process each complete line
    for (const line of lines) {
      if (line.trim()) {
        try {
          const msg = JSON.parse(line);
          this._handleMessage(msg);
        } catch (err) {
          if (!this.quiet) {
            console.log('🔌 Bridge: Failed to parse line:', line, err.message);
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


