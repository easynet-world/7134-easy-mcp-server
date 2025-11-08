/**
 * MCP STDIO Transport Tests
 * 
 * Tests STDIO transport functionality with Content-Length framing
 */

const DynamicAPIMCPServer = require('../src/mcp');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

describe('MCP STDIO Transport', () => {
  let mcpServer;

  beforeEach(() => {
    mcpServer = new DynamicAPIMCPServer('127.0.0.1', 0, {
      stdioMode: true,
      quiet: true
    });
    
    // Set up mock routes
    mcpServer.setRoutes([
      {
        method: 'GET',
        path: '/api/test',
        processorInstance: {
          description: 'Test endpoint',
          process: (req, res) => {
            res.json({ success: true, message: 'Test response' });
          }
        }
      }
    ]);
  });

  afterEach(() => {
    if (mcpServer) {
      mcpServer.stop();
    }
  });

  test('MCP server should support STDIO mode', () => {
    expect(mcpServer.stdioMode).toBe(true);
    expect(mcpServer.stdioHandler).toBeDefined();
  });

  test('STDIO handler should be initialized when stdioMode is enabled', () => {
    const server = new DynamicAPIMCPServer('127.0.0.1', 0, {
      stdioMode: true,
      quiet: true
    });
    
    server.createServer();
    expect(server.stdioHandler).toBeDefined();
    expect(server.httpHandler).toBeNull();
    expect(server.wsHandler).toBeNull();
    expect(server.server).toBeNull();
  });

  test('STDIO handler should not be initialized when stdioMode is disabled', () => {
    const server = new DynamicAPIMCPServer('127.0.0.1', 0, {
      stdioMode: false,
      quiet: true
    });
    
    server.createServer();
    expect(server.stdioHandler).toBeNull();
    expect(server.httpHandler).toBeDefined();
    expect(server.wsHandler).toBeDefined();
    expect(server.server).toBeDefined();
  });

  test('STDIO mode can be enabled via environment variable', () => {
    const originalEnv = process.env.EASY_MCP_SERVER_STDIO_MODE;
    process.env.EASY_MCP_SERVER_STDIO_MODE = 'true';
    
    const server = new DynamicAPIMCPServer('127.0.0.1', 0, {
      quiet: true
    });
    
    expect(server.stdioMode).toBe(true);
    
    // Restore environment
    if (originalEnv) {
      process.env.EASY_MCP_SERVER_STDIO_MODE = originalEnv;
    } else {
      delete process.env.EASY_MCP_SERVER_STDIO_MODE;
    }
  });

  test('STDIO handler should format Content-Length framed messages', () => {
    const server = new DynamicAPIMCPServer('127.0.0.1', 0, {
      stdioMode: true,
      quiet: true
    });
    
    server.createServer();
    const stdioHandler = server.stdioHandler;
    
    const response = {
      jsonrpc: '2.0',
      id: 1,
      result: { test: 'data' }
    };
    
    const json = JSON.stringify(response);
    const contentLength = Buffer.byteLength(json, 'utf8');
    const expectedHeader = `Content-Length: ${contentLength}\r\n\r\n`;
    
    // Mock stdout.write to capture output
    let capturedOutput = '';
    const originalWrite = process.stdout.write;
    process.stdout.write = (chunk) => {
      capturedOutput += chunk.toString();
      return true;
    };
    
    try {
      stdioHandler.sendResponse(response);
      
      expect(capturedOutput).toContain('Content-Length:');
      expect(capturedOutput).toContain('\r\n\r\n');
      expect(capturedOutput).toContain(json);
    } finally {
      process.stdout.write = originalWrite;
    }
  });

  test('STDIO handler should parse Content-Length framed messages', async () => {
    const server = new DynamicAPIMCPServer('127.0.0.1', 0, {
      stdioMode: true,
      quiet: true
    });
    
    server.createServer();
    const stdioHandler = server.stdioHandler;
    
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'ping'
    };
    
    const json = JSON.stringify(request);
    const contentLength = Buffer.byteLength(json, 'utf8');
    const message = `Content-Length: ${contentLength}\r\n\r\n${json}`;
    
    // Mock processMCPRequest to capture calls
    let capturedRequest = null;
    stdioHandler.processMCPRequest = async (req) => {
      capturedRequest = req;
      return {
        jsonrpc: '2.0',
        id: req.id,
        result: { pong: true }
      };
    };
    
    // Simulate receiving data
    stdioHandler.handleData(Buffer.from(message, 'utf8'));
    
    // Wait a bit for async processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(capturedRequest).toBeDefined();
    expect(capturedRequest.method).toBe('ping');
    expect(capturedRequest.id).toBe(1);
  });

  test('STDIO handler should handle initialize request', async () => {
    const server = new DynamicAPIMCPServer('127.0.0.1', 0, {
      stdioMode: true,
      quiet: true
    });
    
    server.createServer();
    const stdioHandler = server.stdioHandler;
    
    const request = {
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    };
    
    const json = JSON.stringify(request);
    const contentLength = Buffer.byteLength(json, 'utf8');
    const message = `Content-Length: ${contentLength}\r\n\r\n${json}`;
    
    let capturedOutput = '';
    const originalWrite = process.stdout.write;
    process.stdout.write = (chunk) => {
      capturedOutput += chunk.toString();
      return true;
    };
    
    try {
      stdioHandler.handleData(Buffer.from(message, 'utf8'));
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(capturedOutput).toContain('protocolVersion');
      expect(capturedOutput).toContain('2024-11-05');
      expect(capturedOutput).toContain('easy-mcp-server');
      expect(stdioHandler.initialized).toBe(true);
    } finally {
      process.stdout.write = originalWrite;
    }
  });

  test('STDIO handler should handle split messages across chunks', async () => {
    const server = new DynamicAPIMCPServer('127.0.0.1', 0, {
      stdioMode: true,
      quiet: true
    });
    
    server.createServer();
    const stdioHandler = server.stdioHandler;
    
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'ping'
    };
    
    const json = JSON.stringify(request);
    const contentLength = Buffer.byteLength(json, 'utf8');
    const message = `Content-Length: ${contentLength}\r\n\r\n${json}`;
    
    // Split message into chunks
    const chunk1 = message.slice(0, 20);
    const chunk2 = message.slice(20);
    
    let capturedRequest = null;
    stdioHandler.processMCPRequest = async (req) => {
      capturedRequest = req;
      return {
        jsonrpc: '2.0',
        id: req.id,
        result: { pong: true }
      };
    };
    
    // Send chunks separately
    stdioHandler.handleData(Buffer.from(chunk1, 'utf8'));
    stdioHandler.handleData(Buffer.from(chunk2, 'utf8'));
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(capturedRequest).toBeDefined();
    expect(capturedRequest.method).toBe('ping');
  });

  test('STDIO handler should send notifications', () => {
    const server = new DynamicAPIMCPServer('127.0.0.1', 0, {
      stdioMode: true,
      quiet: true
    });
    
    server.createServer();
    const stdioHandler = server.stdioHandler;
    
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/test',
      params: { data: 'test' }
    };
    
    let capturedOutput = '';
    const originalWrite = process.stdout.write;
    process.stdout.write = (chunk) => {
      capturedOutput += chunk.toString();
      return true;
    };
    
    try {
      stdioHandler.sendNotification(notification);
      
      expect(capturedOutput).toContain('Content-Length:');
      expect(capturedOutput).toContain('notifications/test');
    } finally {
      process.stdout.write = originalWrite;
    }
  });

  test('STDIO handler should handle parse errors gracefully', () => {
    const server = new DynamicAPIMCPServer('127.0.0.1', 0, {
      stdioMode: true,
      quiet: true
    });
    
    server.createServer();
    const stdioHandler = server.stdioHandler;
    
    const invalidMessage = 'Content-Length: 10\r\n\r\n{invalid json}';
    
    let capturedError = null;
    const originalWrite = process.stdout.write;
    process.stdout.write = (chunk) => {
      const output = chunk.toString();
      if (output.includes('error')) {
        capturedError = output;
      }
      return true;
    };
    
    try {
      stdioHandler.handleData(Buffer.from(invalidMessage, 'utf8'));
      
      // Wait a bit
      setTimeout(() => {
        expect(capturedError).toBeDefined();
      }, 100);
    } finally {
      process.stdout.write = originalWrite;
    }
  });

  test('broadcastNotification should work with STDIO handler', () => {
    const server = new DynamicAPIMCPServer('127.0.0.1', 0, {
      stdioMode: true,
      quiet: true
    });
    
    server.createServer();
    
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/test',
      params: { data: 'test' }
    };
    
    let capturedOutput = '';
    const originalWrite = process.stdout.write;
    process.stdout.write = (chunk) => {
      capturedOutput += chunk.toString();
      return true;
    };
    
    try {
      server.broadcastNotification(notification);
      
      expect(capturedOutput).toContain('notifications/test');
    } finally {
      process.stdout.write = originalWrite;
    }
  });
});


