const DynamicAPIMCPServer = require('../src/mcp');

describe('MCP Schema Extraction', () => {
  let mcpServer;

  beforeEach(() => {
    mcpServer = new DynamicAPIMCPServer();
  });

  afterEach(() => {
    mcpServer.stop();
  });

  test('MCP server extracts requestBody schema from processor annotations', async () => {
    // Create a mock processor with OpenAPI annotations
    class MockProcessorWithAnnotations {
      get openApi() {
        return {
          description: 'Test endpoint with request body',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email'],
                  properties: {
                    name: { type: 'string', minLength: 2, maxLength: 50 },
                    email: { type: 'string', format: 'email' },
                    age: { type: 'integer', minimum: 0, maximum: 120 }
                  }
                }
              }
            }
          }
        };
      }

      process(req, res) {
        res.json({ success: true });
      }
    }

    const route = {
      method: 'POST',
      path: '/test',
      processorInstance: new MockProcessorWithAnnotations()
    };

    mcpServer.setRoutes([route]);

    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    };

    const response = await mcpServer.processMCPRequest(request);
    const tools = response.result.tools;

    expect(tools).toHaveLength(1);
    expect(tools[0].inputSchema.properties.body).toEqual({
      type: 'object',
      description: 'Request body',
      required: ['name', 'email'],
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 50 },
        email: { type: 'string', format: 'email' },
        age: { type: 'integer', minimum: 0, maximum: 120 }
      }
    });
    expect(tools[0].inputSchema.required).toContain('body');
  });

  test('MCP server extracts responseSchema from processor annotations', async () => {
    // Create a mock processor with response schema annotations
    class MockProcessorWithResponseSchema {
      get openApi() {
        return {
          description: 'Test endpoint with response schema',
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          name: { type: 'string' },
                          email: { type: 'string', format: 'email' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        };
      }

      process(req, res) {
        res.json({ success: true });
      }
    }

    const route = {
      method: 'GET',
      path: '/test',
      processorInstance: new MockProcessorWithResponseSchema()
    };

    mcpServer.setRoutes([route]);

    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    };

    const response = await mcpServer.processMCPRequest(request);
    const tools = response.result.tools;

    expect(tools).toHaveLength(1);
    expect(tools[0].responseSchema).toEqual({
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' }
          }
        }
      }
    });
  });

  test('MCP server combines requestBody and responseSchema correctly', async () => {
    // Create a mock processor with both request and response schemas
    class MockProcessorWithFullSchema {
      get openApi() {
        return {
          description: 'Test endpoint with full schema',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'content'],
                  properties: {
                    title: { type: 'string', minLength: 1, maxLength: 100 },
                    content: { type: 'string', minLength: 1 },
                    tags: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          title: { type: 'string' },
                          content: { type: 'string' },
                          tags: { type: 'array', items: { type: 'string' } },
                          createdAt: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        };
      }

      process(req, res) {
        res.json({ success: true });
      }
    }

    const route = {
      method: 'POST',
      path: '/articles',
      processorInstance: new MockProcessorWithFullSchema()
    };

    mcpServer.setRoutes([route]);

    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    };

    const response = await mcpServer.processMCPRequest(request);
    const tools = response.result.tools;

    expect(tools).toHaveLength(1);
    const tool = tools[0];

    // Check request body schema
    expect(tool.inputSchema.properties.body).toEqual({
      type: 'object',
      description: 'Request body',
      required: ['title', 'content'],
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 100 },
        content: { type: 'string', minLength: 1 },
        tags: { type: 'array', items: { type: 'string' } }
      }
    });
    expect(tool.inputSchema.required).toContain('body');

    // Check response schema
    expect(tool.responseSchema).toEqual({
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    });

    // Check additional metadata
    expect(tool.method).toBe('POST');
    expect(tool.path).toBe('/articles');
    expect(tool.tags).toEqual(['api']);
  });

  test('MCP server handles routes without annotations gracefully', async () => {
    // Create a mock processor without annotations
    class MockProcessorWithoutAnnotations {
      process(req, res) {
        res.json({ success: true });
      }
    }

    const route = {
      method: 'GET',
      path: '/simple',
      processorInstance: new MockProcessorWithoutAnnotations()
    };

    mcpServer.setRoutes([route]);

    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    };

    const response = await mcpServer.processMCPRequest(request);
    const tools = response.result.tools;

    expect(tools).toHaveLength(1);
    const tool = tools[0];

    // Should have default input schema (allowing optional path key)
    expect(tool.inputSchema).toEqual(expect.objectContaining({
      type: 'object',
      properties: expect.objectContaining({
        body: expect.objectContaining({ type: 'object' }),
        query: expect.objectContaining({ type: 'object' }),
        headers: expect.objectContaining({ type: 'object' })
      })
    }));

    // Should not have response schema
    expect(tool.responseSchema).toBeNull();

    // Should have basic metadata
    expect(tool.method).toBe('GET');
    expect(tool.path).toBe('/simple');
    expect(tool.tags).toEqual(['api']);
  });

  test('MCP server WebSocket handleListTools includes schema information', async () => {
    // Create a mock processor with annotations
    class MockProcessorWithSchema {
      get openApi() {
        return {
          description: 'Test endpoint with schema',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      echo: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        };
      }

      process(req, res) {
        res.json({ echo: req.body.message });
      }
    }

    const route = {
      method: 'POST',
      path: '/echo',
      processorInstance: new MockProcessorWithSchema()
    };

    mcpServer.setRoutes([route]);

    // Mock WebSocket
    const mockWs = {
      send: jest.fn(),
      readyState: 1 // OPEN
    };

    const request = {
      type: 'list_tools',
      id: 1
    };

    await mcpServer.handleListTools(mockWs, request);

    expect(mockWs.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"list_tools_response"')
    );

    const response = JSON.parse(mockWs.send.mock.calls[0][0]);
    expect(response.tools).toHaveLength(1);
    
    const tool = response.tools[0];
    expect(tool.inputSchema.properties.body).toEqual({
      type: 'object',
      description: 'Request body',
      properties: {
        message: { type: 'string' }
      }
    });
    expect(tool.responseSchema).toEqual({
      type: 'object',
      properties: {
        echo: { type: 'string' }
      }
    });
  });
});
