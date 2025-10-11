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
        name: 'test_get',
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

  test('MCP server binds to all interfaces by default for Kubernetes compatibility', () => {
    const DynamicAPIMCPServer = require('../src/mcp/mcp-server');
    
    // Test default constructor binds to 0.0.0.0
    const mcpServerDefault = new DynamicAPIMCPServer();
    expect(mcpServerDefault.host).toBe('0.0.0.0');
    
    // Test explicit binding to all interfaces
    const mcpServerAllInterfaces = new DynamicAPIMCPServer('0.0.0.0', 8888);
    expect(mcpServerAllInterfaces.host).toBe('0.0.0.0');
    
    // Test that localhost still works when explicitly specified
    const mcpServerLocalhost = new DynamicAPIMCPServer('localhost', 8888);
    expect(mcpServerLocalhost.host).toBe('localhost');
    
    // Test that custom host still works
    const mcpServerCustom = new DynamicAPIMCPServer('192.168.1.100', 8888);
    expect(mcpServerCustom.host).toBe('192.168.1.100');
  });

  test('MCP server uses default MCP directory when no custom path is provided', () => {
    const DynamicAPIMCPServer = require('../src/mcp/mcp-server');
    const mcpServer = new DynamicAPIMCPServer();
    
    // Should use default './mcp' path
    expect(mcpServer.config.mcp.basePath).toBe('./mcp');
    expect(mcpServer.config.mcp.prompts.directory).toBe('mcp/prompts');
    expect(mcpServer.config.mcp.resources.directory).toBe('mcp/resources');
  });

  test('MCP server respects custom MCP base path configuration', () => {
    const DynamicAPIMCPServer = require('../src/mcp/mcp-server');
    const customOptions = {
      mcp: {
        basePath: './custom-mcp'
      }
    };
    
    const mcpServer = new DynamicAPIMCPServer('0.0.0.0', 8888, customOptions);
    
    // Should use custom base path
    expect(mcpServer.config.mcp.basePath).toBe('./custom-mcp');
    expect(mcpServer.config.mcp.prompts.directory).toBe('custom-mcp/prompts');
    expect(mcpServer.config.mcp.resources.directory).toBe('custom-mcp/resources');
  });

  test('MCP server respects custom prompts and resources directory configuration', () => {
    const DynamicAPIMCPServer = require('../src/mcp/mcp-server');
    const customOptions = {
      mcp: {
        basePath: './custom-mcp'
      },
      prompts: {
        directory: './custom-prompts'
      },
      resources: {
        directory: './custom-resources'
      }
    };
    
    const mcpServer = new DynamicAPIMCPServer('0.0.0.0', 8888, customOptions);
    
    // Should use custom base path and custom subdirectories
    expect(mcpServer.config.mcp.basePath).toBe('./custom-mcp');
    expect(mcpServer.config.mcp.prompts.directory).toBe('./custom-prompts');
    expect(mcpServer.config.mcp.resources.directory).toBe('./custom-resources');
  });

  test('MCP server cache manager uses configured base path', () => {
    const DynamicAPIMCPServer = require('../src/mcp/mcp-server');
    const customOptions = {
      mcp: {
        basePath: './custom-mcp'
      }
    };
    
    const mcpServer = new DynamicAPIMCPServer('0.0.0.0', 8888, customOptions);
    
    // Cache manager should use the resolved base path (package directory when custom doesn't exist)
    expect(mcpServer.cacheManager.basePath).toContain('mcp');
  });

  test('MCP server falls back to default paths when custom paths are not provided', () => {
    const DynamicAPIMCPServer = require('../src/mcp/mcp-server');
    const customOptions = {
      mcp: {
        basePath: './custom-mcp'
      }
      // No custom prompts or resources directories
    };
    
    const mcpServer = new DynamicAPIMCPServer('0.0.0.0', 8888, customOptions);
    
    // Should use custom base path with default subdirectories
    expect(mcpServer.config.mcp.basePath).toBe('./custom-mcp');
    expect(mcpServer.config.mcp.prompts.directory).toBe('custom-mcp/prompts');
    expect(mcpServer.config.mcp.resources.directory).toBe('custom-mcp/resources');
  });
});
