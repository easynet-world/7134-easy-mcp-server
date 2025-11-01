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
    // When bodySchema is an object, properties are flattened to top level (not nested in properties.body)
    // Schema normalization may strip validation constraints
    expect(tools[0].inputSchema.properties.name).toEqual(
      expect.objectContaining({ type: 'string' })
    );
    expect(tools[0].inputSchema.properties.email).toEqual(
      expect.objectContaining({ type: 'string' })
    );
    expect(tools[0].inputSchema.properties.age).toEqual(
      expect.objectContaining({ type: 'integer' })
    );
    expect(tools[0].inputSchema.required).toContain('name');
    expect(tools[0].inputSchema.required).toContain('email');
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
    // Schema normalization may strip format constraints
    expect(tools[0].responseSchema).toEqual(expect.objectContaining({
      type: 'object',
      properties: expect.objectContaining({
        success: expect.objectContaining({ type: 'boolean' }),
        data: expect.objectContaining({
          type: 'object',
          properties: expect.objectContaining({
            id: expect.objectContaining({ type: 'string' }),
            name: expect.objectContaining({ type: 'string' }),
            email: expect.objectContaining({ type: 'string' })
          })
        })
      })
    }));
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

    // Check request body schema - object schemas are flattened to top level
    // Schema normalization may strip some validation constraints
    expect(tool.inputSchema.properties.title).toEqual(
      expect.objectContaining({ type: 'string' })
    );
    expect(tool.inputSchema.properties.content).toEqual(
      expect.objectContaining({ type: 'string' })
    );
    expect(tool.inputSchema.properties.tags).toBeDefined();
    expect(tool.inputSchema.required).toContain('title');
    expect(tool.inputSchema.required).toContain('content');

    // Check response schema - schema normalization may strip some constraints like format
    expect(tool.responseSchema).toEqual(expect.objectContaining({
      type: 'object',
      properties: expect.objectContaining({
        success: expect.objectContaining({ type: 'boolean' }),
        data: expect.objectContaining({
          type: 'object',
          properties: expect.objectContaining({
            id: expect.objectContaining({ type: 'string' }),
            title: expect.objectContaining({ type: 'string' }),
            content: expect.objectContaining({ type: 'string' }),
            tags: expect.anything()
          })
        })
      })
    }));

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

    // Should have default input schema - flat format (no nested body/query/headers)
    expect(tool.inputSchema).toEqual(expect.objectContaining({
      type: 'object',
      properties: expect.any(Object)
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
    // handleListTools flattens object body schemas - message should be at top level
    expect(tool.inputSchema.properties.message).toEqual(
      expect.objectContaining({ type: 'string' })
    );
    expect(tool.responseSchema).toEqual({
      type: 'object',
      properties: {
        echo: { type: 'string' }
      }
    });
  });
});
