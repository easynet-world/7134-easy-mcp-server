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
});
