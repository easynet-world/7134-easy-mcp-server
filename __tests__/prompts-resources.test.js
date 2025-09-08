const DynamicAPIMCPServer = require('../src/mcp/mcp-server');

describe('MCP Prompts and Resources Support', () => {
  let mcpServer;

  beforeEach(() => {
    mcpServer = new DynamicAPIMCPServer();
  });

  afterEach(() => {
    if (mcpServer) {
      mcpServer.stop();
    }
  });

  describe('Prompts Support', () => {
    test('should initialize with empty prompts map', () => {
      expect(mcpServer.prompts).toBeInstanceOf(Map);
      expect(mcpServer.prompts.size).toBe(0);
    });

    test('should add prompts correctly', () => {
      const testPrompt = {
        name: 'test_prompt',
        description: 'A test prompt',
        template: 'Hello {{name}}!',
        arguments: [
          {
            name: 'name',
            description: 'Name to greet',
            required: true
          }
        ]
      };

      mcpServer.addPrompt(testPrompt);
      
      expect(mcpServer.prompts.size).toBe(1);
      expect(mcpServer.prompts.get('test_prompt')).toEqual(testPrompt);
    });

    test('should process prompts/list request', async () => {
      const testPrompt = {
        name: 'test_prompt',
        description: 'A test prompt',
        template: 'Hello {{name}}!',
        arguments: [
          {
            name: 'name',
            description: 'Name to greet',
            required: true
          }
        ]
      };

      mcpServer.addPrompt(testPrompt);

      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'prompts/list'
      };

      const response = await mcpServer.processListPrompts(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result.prompts).toBeDefined();
      expect(response.result.prompts.length).toBeGreaterThan(0);
      expect(response.result.cached).toBeDefined();
      expect(response.result.cacheStats).toBeDefined();
      
      // Find the test prompt
      const foundPrompt = response.result.prompts.find(p => p.name === 'test_prompt');
      expect(foundPrompt).toBeDefined();
      expect(foundPrompt.description).toBe('A test prompt');
      expect(foundPrompt.arguments).toHaveLength(1);
      expect(foundPrompt.arguments[0].name).toBe('name');
    });

    test('should process prompts/get request with template substitution', async () => {
      const testPrompt = {
        name: 'test_prompt',
        description: 'A test prompt',
        template: 'Hello {{name}}! Your age is {{age}}.',
        arguments: [
          {
            name: 'name',
            description: 'Name to greet',
            required: true
          },
          {
            name: 'age',
            description: 'Age of the person',
            required: false
          }
        ]
      };

      mcpServer.addPrompt(testPrompt);

      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'prompts/get',
        params: {
          name: 'test_prompt',
          arguments: {
            name: 'John',
            age: '25'
          }
        }
      };

      const response = await mcpServer.processGetPrompt(request);
      
      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: {
          description: 'A test prompt',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: 'Hello John! Your age is 25.'
              }
            }
          ]
        }
      });
    });

    test('should return error for non-existent prompt', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'prompts/get',
        params: {
          name: 'non_existent_prompt'
        }
      };

      const response = await mcpServer.processGetPrompt(request);
      
      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32602,
          message: 'Prompt not found: non_existent_prompt'
        }
      });
    });
  });

  describe('Resources Support', () => {
    test('should initialize with empty resources map', () => {
      expect(mcpServer.resources).toBeInstanceOf(Map);
      expect(mcpServer.resources.size).toBe(0);
    });

    test('should add resources correctly', () => {
      const testResource = {
        uri: 'test://example',
        name: 'Test Resource',
        description: 'A test resource',
        mimeType: 'text/plain',
        content: 'Hello, World!'
      };

      mcpServer.addResource(testResource);
      
      expect(mcpServer.resources.size).toBe(1);
      expect(mcpServer.resources.get('test://example')).toEqual(testResource);
    });

    test('should process resources/list request', async () => {
      const testResource = {
        uri: 'test://example',
        name: 'Test Resource',
        description: 'A test resource',
        mimeType: 'text/plain',
        content: 'Hello, World!'
      };

      mcpServer.addResource(testResource);

      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'resources/list'
      };

      const response = await mcpServer.processListResources(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result.resources).toBeDefined();
      expect(response.result.resources.length).toBeGreaterThan(0);
      expect(response.result.cached).toBeDefined();
      expect(response.result.cacheStats).toBeDefined();
      
      // Find the test resource
      const foundResource = response.result.resources.find(r => r.uri === 'test://example');
      expect(foundResource).toBeDefined();
      expect(foundResource.name).toBe('Test Resource');
      expect(foundResource.description).toBe('A test resource');
      expect(foundResource.mimeType).toBe('text/plain');
    });

    test('should process resources/read request', async () => {
      const testResource = {
        uri: 'test://example',
        name: 'Test Resource',
        description: 'A test resource',
        mimeType: 'text/plain',
        content: 'Hello, World!'
      };

      mcpServer.addResource(testResource);

      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'resources/read',
        params: {
          uri: 'test://example'
        }
      };

      const response = await mcpServer.processReadResource(request);
      
      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: {
          contents: [
            {
              uri: 'test://example',
              mimeType: 'text/plain',
              text: 'Hello, World!'
            }
          ]
        }
      });
    });

    test('should return error for non-existent resource', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'resources/read',
        params: {
          uri: 'test://non-existent'
        }
      };

      const response = await mcpServer.processReadResource(request);
      
      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32602,
          message: 'Resource not found: test://non-existent'
        }
      });
    });
  });

  describe('Auto-discovery from API Routes', () => {
    test('should discover prompts from API routes', () => {
      const mockRoute = {
        method: 'GET',
        path: '/test',
        processorInstance: {
          prompts: [
            {
              name: 'test_api_prompt',
              description: 'Test API prompt',
              template: 'Test template {{param}}',
              arguments: [
                {
                  name: 'param',
                  description: 'Test parameter',
                  required: true
                }
              ]
            }
          ]
        }
      };

      mcpServer.discoverPromptsAndResources([mockRoute]);
      
      expect(mcpServer.prompts.size).toBe(1);
      expect(mcpServer.prompts.get('test_api_prompt')).toBeDefined();
    });

    test('should discover resources from API routes', () => {
      const mockRoute = {
        method: 'GET',
        path: '/test',
        processorInstance: {
          resources: [
            {
              uri: 'test://api-resource',
              name: 'Test API Resource',
              description: 'Test API resource',
              mimeType: 'application/json',
              content: '{"test": "data"}'
            }
          ]
        }
      };

      mcpServer.discoverPromptsAndResources([mockRoute]);
      
      expect(mcpServer.resources.size).toBe(1);
      expect(mcpServer.resources.get('test://api-resource')).toBeDefined();
    });

    test('should handle routes without prompts or resources', () => {
      const mockRoute = {
        method: 'GET',
        path: '/test',
        processorInstance: {
          // No prompts or resources
        }
      };

      mcpServer.discoverPromptsAndResources([mockRoute]);
      
      expect(mcpServer.prompts.size).toBe(0);
      expect(mcpServer.resources.size).toBe(0);
    });
  });

  describe('MCP Request Processing', () => {
    test('should process prompts/list via processMCPRequest', async () => {
      const testPrompt = {
        name: 'test_prompt',
        description: 'A test prompt',
        template: 'Hello {{name}}!',
        arguments: []
      };

      mcpServer.addPrompt(testPrompt);

      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'prompts/list'
      };

      const response = await mcpServer.processMCPRequest(request);
      
      expect(response.result.prompts).toBeDefined();
      expect(response.result.prompts.length).toBeGreaterThan(0);
    });

    test('should process resources/list via processMCPRequest', async () => {
      const testResource = {
        uri: 'test://example',
        name: 'Test Resource',
        description: 'A test resource',
        mimeType: 'text/plain',
        content: 'Hello, World!'
      };

      mcpServer.addResource(testResource);

      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'resources/list'
      };

      const response = await mcpServer.processMCPRequest(request);
      
      expect(response.result.resources).toBeDefined();
      expect(response.result.resources.length).toBeGreaterThan(0);
    });
  });
});
