const path = require('path');
const fs = require('fs');

describe('MCP (Model Context Protocol) Support', () => {
  test('MCP server file exists in src directory', () => {
    const mcpServerPath = path.join(__dirname, '..', 'src', 'mcp', 'mcp-server.js');
    expect(fs.existsSync(mcpServerPath)).toBe(true);
  });

  test('MCP server can be required without errors', () => {
    expect(() => {
      require('../src/mcp/mcp-server');
    }).not.toThrow();
  });

  test('MCP dependencies are installed', () => {
    const packageJson = require('../package.json');
    expect(packageJson.dependencies.ws).toBeDefined();
  });

  test('MCP server class has required methods', () => {
    const DynamicAPIMCPServer = require('../src/mcp/mcp-server');
    const mcpServer = new DynamicAPIMCPServer();
    
    expect(typeof mcpServer.run).toBe('function');
    expect(typeof mcpServer.stop).toBe('function');
    expect(typeof mcpServer.setRoutes).toBe('function');
    expect(typeof mcpServer.processMCPRequest).toBe('function');
  });

  test('MCP server supports multiple transport types', () => {
    const DynamicAPIMCPServer = require('../src/mcp/mcp-server');
    const mcpServer = new DynamicAPIMCPServer();
    
    // Check if transport methods exist
    expect(typeof mcpServer.handleSSEConnection).toBe('function');
    expect(typeof mcpServer.handleHTTPMCPRequest).toBe('function');
    expect(typeof mcpServer.handleStreamableHttpRequest).toBe('function');
  });

  test('MCP server can process tools/list request', () => {
    const DynamicAPIMCPServer = require('../src/mcp/mcp-server');
    const mcpServer = new DynamicAPIMCPServer();
    
    // Mock routes
    mcpServer.setRoutes([
      { method: 'GET', path: '/test' }
    ]);
    
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    };
    
    expect(() => {
      mcpServer.processMCPRequest(request);
    }).not.toThrow();
  });

  test('MCP server can process tools/call request', () => {
    const DynamicAPIMCPServer = require('../src/mcp/mcp-server');
    const mcpServer = new DynamicAPIMCPServer();
    
    // Mock routes
    mcpServer.setRoutes([
      { method: 'GET', path: '/test' }
    ]);
    
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_test',
        arguments: {}
      }
    };
    
    expect(() => {
      mcpServer.processMCPRequest(request);
    }).not.toThrow();
  });

  test('MCP server executeAPIEndpoint supports res.status method', async () => {
    const DynamicAPIMCPServer = require('../src/mcp/mcp-server');
    const mcpServer = new DynamicAPIMCPServer();
    
    // Create a mock API processor that uses res.status
    class MockProcessor {
      process(req, res) {
        res.status(400).json({ error: 'Bad request' });
      }
    }
    
    const route = {
      method: 'GET',
      path: '/test',
      processorInstance: new MockProcessor()
    };
    
    const args = { body: {}, query: {}, headers: {} };
    
    const result = await mcpServer.executeAPIEndpoint(route, args);
    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(400);
    expect(result.data).toEqual({ error: 'Bad request' });
  });

  test('MCP server executeAPIEndpoint supports chaining res.status().json()', async () => {
    const DynamicAPIMCPServer = require('../src/mcp/mcp-server');
    const mcpServer = new DynamicAPIMCPServer();
    
    // Create a mock API processor that chains res.status().json()
    class MockProcessor {
      process(req, res) {
        res.status(404).json({ error: 'Not found' });
      }
    }
    
    const route = {
      method: 'GET',
      path: '/test',
      processorInstance: new MockProcessor()
    };
    
    const args = { body: {}, query: {}, headers: {} };
    
    const result = await mcpServer.executeAPIEndpoint(route, args);
    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(404);
    expect(result.data).toEqual({ error: 'Not found' });
  });

  test('MCP server executeAPIEndpoint handles multiple status codes correctly', async () => {
    const DynamicAPIMCPServer = require('../src/mcp/mcp-server');
    const mcpServer = new DynamicAPIMCPServer();
    
    // Test different status codes
    const testCases = [
      { status: 400, expectedData: { error: 'Bad request' } },
      { status: 404, expectedData: { error: 'Not found' } },
      { status: 500, expectedData: { error: 'Internal server error' } }
    ];
    
    for (const testCase of testCases) {
      class MockProcessor {
        process(req, res) {
          res.status(testCase.status).json(testCase.expectedData);
        }
      }
      
      const route = {
        method: 'GET',
        path: '/test',
        processorInstance: new MockProcessor()
      };
      
      const args = { body: {}, query: {}, headers: {} };
      
      const result = await mcpServer.executeAPIEndpoint(route, args);
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(testCase.status);
      expect(result.data).toEqual(testCase.expectedData);
    }
  });
});
