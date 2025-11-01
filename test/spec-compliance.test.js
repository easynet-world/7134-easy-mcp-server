/**
 * Comprehensive Spec Compliance Tests
 * Validates both MCP (Model Context Protocol) and OpenAPI 3.0 specification compliance
 */

const OpenAPIGenerator = require('../src/api/openapi/openapi-generator');
const ToolBuilder = require('../src/mcp/builders/tool-builder');
const SchemaNormalizer = require('../src/mcp/utils/schema-normalizer');

describe('Spec Compliance Tests', () => {
  let openapiGenerator;
  let toolBuilder;
  let mockApiLoader;

  beforeEach(() => {
    mockApiLoader = {
      getRoutes: jest.fn().mockReturnValue([])
    };
    openapiGenerator = new OpenAPIGenerator(mockApiLoader);
    toolBuilder = new ToolBuilder(new SchemaNormalizer());
  });

  describe('OpenAPI 3.0 Specification Compliance', () => {
    test('should generate valid OpenAPI 3.0.0 spec structure', () => {
      const spec = openapiGenerator.generateSpec();
      
      // Required top-level fields
      expect(spec).toHaveProperty('openapi', '3.0.0');
      expect(spec).toHaveProperty('info');
      expect(spec).toHaveProperty('paths');
      expect(spec).toHaveProperty('components');
      
      // Info object requirements
      expect(spec.info).toHaveProperty('title');
      expect(spec.info).toHaveProperty('version');
      expect(typeof spec.info.title).toBe('string');
      expect(typeof spec.info.version).toBe('string');
      
      // Paths must be an object
      expect(typeof spec.paths).toBe('object');
      expect(Array.isArray(spec.paths)).toBe(false);
      
      // Components must be an object
      expect(typeof spec.components).toBe('object');
      expect(spec.components).toHaveProperty('schemas');
    });

    test('should use OpenAPI path format ({param}) instead of Express format (:param)', () => {
      const mockRoutes = [
        {
          method: 'GET',
          path: '/api/users/:id',
          processorInstance: {}
        },
        {
          method: 'GET',
          path: '/products/:productId/reviews/:reviewId',
          processorInstance: {}
        }
      ];
      
      mockApiLoader.getRoutes.mockReturnValue(mockRoutes);
      const spec = openapiGenerator.generateSpec();
      
      // Should use OpenAPI format
      expect(spec.paths).toHaveProperty('/api/users/{id}');
      expect(spec.paths).toHaveProperty('/products/{productId}/reviews/{reviewId}');
      
      // Should NOT use Express format
      expect(spec.paths).not.toHaveProperty('/api/users/:id');
      expect(spec.paths).not.toHaveProperty('/products/:productId/reviews/:reviewId');
    });

    test('should define all path parameters in parameters array', () => {
      const mockRoutes = [
        {
          method: 'GET',
          path: '/api/users/:id/posts/:postId',
          processorInstance: {}
        }
      ];
      
      mockApiLoader.getRoutes.mockReturnValue(mockRoutes);
      const spec = openapiGenerator.generateSpec();
      
      const operation = spec.paths['/api/users/{id}/posts/{postId}'].get;
      expect(operation.parameters).toBeDefined();
      expect(Array.isArray(operation.parameters)).toBe(true);
      
      // Should have both path parameters
      const idParam = operation.parameters.find(p => p.name === 'id' && p.in === 'path');
      const postIdParam = operation.parameters.find(p => p.name === 'postId' && p.in === 'path');
      
      expect(idParam).toBeDefined();
      expect(idParam.required).toBe(true);
      expect(idParam.schema).toBeDefined();
      expect(idParam.schema.type).toBeDefined();
      
      expect(postIdParam).toBeDefined();
      expect(postIdParam.required).toBe(true);
    });

    test('should have unique operationIds across all operations', () => {
      const mockRoutes = [
        {
          method: 'GET',
          path: '/api/test1',
          processorInstance: { openApi: { operationId: 'testOp' } }
        },
        {
          method: 'POST',
          path: '/api/test2',
          processorInstance: { openApi: { operationId: 'testOp' } }
        },
        {
          method: 'GET',
          path: '/api/test3',
          processorInstance: {}
        }
      ];
      
      mockApiLoader.getRoutes.mockReturnValue(mockRoutes);
      const spec = openapiGenerator.generateSpec();
      
      const operationIds = new Set();
      
      Object.values(spec.paths).forEach(pathItem => {
        Object.values(pathItem).forEach(operation => {
          if (operation && operation.operationId) {
            expect(operationIds.has(operation.operationId)).toBe(false);
            operationIds.add(operation.operationId);
          }
        });
      });
    });

    test('should have valid response structures', () => {
      const mockRoutes = [
        {
          method: 'GET',
          path: '/api/test',
          processorInstance: {}
        }
      ];
      
      mockApiLoader.getRoutes.mockReturnValue(mockRoutes);
      const spec = openapiGenerator.generateSpec();
      
      const operation = spec.paths['/api/test'].get;
      expect(operation.responses).toBeDefined();
      expect(typeof operation.responses).toBe('object');
      
      // Should have at least one response
      expect(Object.keys(operation.responses).length).toBeGreaterThan(0);
      
      // All responses should have description
      Object.entries(operation.responses).forEach(([statusCode, response]) => {
        expect(response).toHaveProperty('description');
        expect(typeof response.description).toBe('string');
        
        // If response has content, it should be properly structured
        if (response.content) {
          expect(typeof response.content).toBe('object');
          Object.entries(response.content).forEach(([mediaType, content]) => {
            expect(content).toHaveProperty('schema');
          });
        }
      });
    });

    test('should have valid parameter structures', () => {
      const mockRoutes = [
        {
          method: 'GET',
          path: '/api/test',
          processorInstance: {
            openApi: {
              parameters: [
                {
                  name: 'limit',
                  in: 'query',
                  description: 'Number of items',
                  schema: { type: 'integer' }
                },
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' }
                }
              ]
            }
          }
        }
      ];
      
      mockApiLoader.getRoutes.mockReturnValue(mockRoutes);
      const spec = openapiGenerator.generateSpec();
      
      const operation = spec.paths['/api/test'].get;
      expect(operation.parameters).toBeDefined();
      expect(Array.isArray(operation.parameters)).toBe(true);
      
      operation.parameters.forEach(param => {
        // Required fields
        expect(param).toHaveProperty('name');
        expect(param).toHaveProperty('in');
        expect(param).toHaveProperty('schema');
        
        expect(typeof param.name).toBe('string');
        expect(['path', 'query', 'header', 'cookie']).toContain(param.in);
        expect(typeof param.schema).toBe('object');
        expect(param.schema).toHaveProperty('type');
        
        // Path parameters must be required
        if (param.in === 'path') {
          expect(param.required).toBe(true);
        }
      });
    });

    test('should have valid requestBody structure when present', () => {
      const mockRoutes = [
        {
          method: 'POST',
          path: '/api/users',
          processorInstance: {
            openApi: {
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      ];
      
      mockApiLoader.getRoutes.mockReturnValue(mockRoutes);
      const spec = openapiGenerator.generateSpec();
      
      const operation = spec.paths['/api/users'].post;
      expect(operation.requestBody).toBeDefined();
      expect(typeof operation.requestBody.required).toBe('boolean');
      expect(operation.requestBody.content).toBeDefined();
      expect(operation.requestBody.content['application/json']).toBeDefined();
      expect(operation.requestBody.content['application/json'].schema).toBeDefined();
    });

    test('should have valid component schemas', () => {
      const spec = openapiGenerator.generateSpec();
      
      expect(spec.components.schemas).toBeDefined();
      expect(typeof spec.components.schemas).toBe('object');
      
      // Check Error schema
      expect(spec.components.schemas.Error).toBeDefined();
      const errorSchema = spec.components.schemas.Error;
      expect(errorSchema.type).toBe('object');
      expect(errorSchema.properties).toBeDefined();
      expect(Array.isArray(errorSchema.required)).toBe(true);
      
      // Check Success schema
      expect(spec.components.schemas.Success).toBeDefined();
      const successSchema = spec.components.schemas.Success;
      expect(successSchema.type).toBe('object');
    });

    test('should reference component schemas correctly', () => {
      const mockRoutes = [
        {
          method: 'GET',
          path: '/api/test',
          processorInstance: {}
        }
      ];
      
      mockApiLoader.getRoutes.mockReturnValue(mockRoutes);
      const spec = openapiGenerator.generateSpec();
      
      const operation = spec.paths['/api/test'].get;
      
      // Check that error responses reference Error schema
      if (operation.responses['400']) {
        const ref = operation.responses['400'].content['application/json'].schema.$ref;
        expect(ref).toBe('#/components/schemas/Error');
      }
      
      if (operation.responses['500']) {
        const ref = operation.responses['500'].content['application/json'].schema.$ref;
        expect(ref).toBe('#/components/schemas/Error');
      }
    });

    test('should have valid server URLs', () => {
      const spec = openapiGenerator.generateSpec();
      
      expect(spec.servers).toBeDefined();
      expect(Array.isArray(spec.servers)).toBe(true);
      expect(spec.servers.length).toBeGreaterThan(0);
      
      spec.servers.forEach(server => {
        expect(server).toHaveProperty('url');
        expect(typeof server.url).toBe('string');
        // URL should be a valid format
        expect(server.url).toMatch(/^https?:\/\//);
      });
    });
  });

  describe('MCP Specification Compliance', () => {
    test('should build tools with required MCP fields', () => {
      const mockRoute = {
        method: 'GET',
        path: '/api/test',
        processorInstance: {
          openApi: {
            summary: 'Test endpoint',
            description: 'Test endpoint description',
            parameters: [
              {
                name: 'id',
                in: 'query',
                schema: { type: 'string' }
              }
            ]
          }
        }
      };
      
      const tool = toolBuilder.buildToolFromRoute(mockRoute);
      
      // Required MCP fields
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('inputSchema');
      
      expect(typeof tool.name).toBe('string');
      expect(tool.name.length).toBeGreaterThan(0);
      expect(typeof tool.description).toBe('string');
      expect(tool.description.length).toBeGreaterThan(0);
      expect(typeof tool.inputSchema).toBe('object');
    });

    test('should have valid inputSchema structure (JSON Schema Draft 2020-12)', () => {
      const mockRoute = {
        method: 'POST',
        path: '/api/users',
        processorInstance: {
          openApi: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      age: { type: 'integer' }
                    },
                    required: ['name']
                  }
                }
              }
            }
          }
        }
      };
      
      const tool = toolBuilder.buildToolFromRoute(mockRoute);
      
      const inputSchema = tool.inputSchema;
      
      // Required JSON Schema fields
      expect(inputSchema).toHaveProperty('type', 'object');
      expect(inputSchema).toHaveProperty('properties');
      expect(typeof inputSchema.properties).toBe('object');
      
      // Required array should be an array if present
      if (inputSchema.required) {
        expect(Array.isArray(inputSchema.required)).toBe(true);
      }
    });

    test('should handle array types correctly in inputSchema', () => {
      const mockRoute = {
        method: 'POST',
        path: '/api/products',
        processorInstance: {
          openApi: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      tags: {
                        type: 'array',
                        items: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };
      
      const tool = toolBuilder.buildToolFromRoute(mockRoute);
      
      const tagsProp = tool.inputSchema.properties.tags;
      expect(tagsProp).toBeDefined();
      expect(tagsProp.type).toBe('array');
      
      // Arrays must have items field (required for JSON Schema)
      expect(tagsProp.items).toBeDefined();
      expect(typeof tagsProp.items).toBe('object');
    });

    test('should include optional summary field', () => {
      const mockRoute = {
        method: 'GET',
        path: '/api/test',
        processorInstance: {
          openApi: {
            summary: 'Test summary',
            description: 'Test description'
          }
        }
      };
      
      const tool = toolBuilder.buildToolFromRoute(mockRoute);
      
      // Summary is optional but recommended per MCP spec
      expect(tool.summary).toBeDefined();
      expect(typeof tool.summary).toBe('string');
    });

    test('should handle optional responseSchema correctly', () => {
      const mockRoute = {
        method: 'GET',
        path: '/api/users/:id',
        processorInstance: {
          openApi: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };
      
      const tool = toolBuilder.buildToolFromRoute(mockRoute);
      
      // responseSchema is optional per MCP spec
      if (tool.responseSchema) {
        expect(typeof tool.responseSchema).toBe('object');
        // If present, should be valid JSON Schema
        expect(tool.responseSchema).toHaveProperty('type');
      }
    });

    test('should normalize nested schemas in inputSchema', () => {
      const mockRoute = {
        method: 'POST',
        path: '/api/orders',
        processorInstance: {
          openApi: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      user: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          address: {
                            type: 'object',
                            properties: {
                              street: { type: 'string' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };
      
      const tool = toolBuilder.buildToolFromRoute(mockRoute);
      
      // Nested properties should be flattened to top level
      // The flattenBodyProperties method flattens nested objects
      expect(tool.inputSchema.properties['user.name']).toBeDefined();
      
      // Note: The actual flattening behavior may vary - check that at least first-level
      // nested properties are flattened
      const propertyKeys = Object.keys(tool.inputSchema.properties);
      expect(propertyKeys.length).toBeGreaterThan(0);
      
      // Should have user.name
      expect(propertyKeys).toContain('user.name');
      
      // Should have some form of address-related property (could be user.address or user.address.street)
      const hasAddressProperty = propertyKeys.some(key => key.includes('address'));
      expect(hasAddressProperty).toBe(true);
    });

    test('should handle path parameters in tool inputSchema', () => {
      const mockRoute = {
        method: 'GET',
        path: '/api/users/:id/posts/:postId',
        processorInstance: {
          openApi: {}
        }
      };
      
      const tool = toolBuilder.buildToolFromRoute(mockRoute);
      
      // Path parameters should be in inputSchema properties
      expect(tool.inputSchema.properties.id).toBeDefined();
      expect(tool.inputSchema.properties.postId).toBeDefined();
      
      // Path parameters should be required
      expect(tool.inputSchema.required).toContain('id');
      expect(tool.inputSchema.required).toContain('postId');
    });
  });

  describe('MCP and OpenAPI Consistency', () => {
    test('should have consistent parameter names between MCP and OpenAPI', () => {
      const mockRoute = {
        method: 'GET',
        path: '/api/users/:id',
        processorInstance: {
          openApi: {
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' }
              },
              {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer' }
              }
            ]
          }
        }
      };
      
      mockApiLoader.getRoutes.mockReturnValue([mockRoute]);
      
      // Generate OpenAPI spec
      const openApiSpec = openapiGenerator.generateSpec();
      const openApiOperation = openApiSpec.paths['/api/users/{id}'].get;
      
      // Generate MCP tool
      const mcpTool = toolBuilder.buildToolFromRoute(mockRoute);
      
      // Check that path parameter exists in both
      const openApiIdParam = openApiOperation.parameters.find(p => p.name === 'id' && p.in === 'path');
      expect(openApiIdParam).toBeDefined();
      
      expect(mcpTool.inputSchema.properties.id).toBeDefined();
      
      // Check that query parameter exists in both
      const openApiLimitParam = openApiOperation.parameters.find(p => p.name === 'limit' && p.in === 'query');
      expect(openApiLimitParam).toBeDefined();
      
      expect(mcpTool.inputSchema.properties.limit).toBeDefined();
    });

    test('should have consistent response schemas when available', () => {
      const responseSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      };
      
      const mockRoute = {
        method: 'GET',
        path: '/api/users/:id',
        processorInstance: {
          openApi: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: responseSchema
                  }
                }
              }
            }
          }
        }
      };
      
      mockApiLoader.getRoutes.mockReturnValue([mockRoute]);
      
      // Generate OpenAPI spec
      const openApiSpec = openapiGenerator.generateSpec();
      const openApiResponse = openApiSpec.paths['/api/users/{id}'].get.responses['200'];
      const openApiResponseSchema = openApiResponse.content['application/json'].schema;
      
      // Generate MCP tool
      const mcpTool = toolBuilder.buildToolFromRoute(mockRoute);
      
      // Both should reference the same structure
      if (mcpTool.responseSchema) {
        expect(mcpTool.responseSchema.type).toBe(openApiResponseSchema.type);
        expect(mcpTool.responseSchema.properties).toBeDefined();
      }
    });

    test('should have consistent operation descriptions', () => {
      const description = 'Get user by ID';
      const summary = 'Get user';
      
      const mockRoute = {
        method: 'GET',
        path: '/api/users/:id',
        processorInstance: {
          openApi: {
            summary: summary,
            description: description
          }
        }
      };
      
      mockApiLoader.getRoutes.mockReturnValue([mockRoute]);
      
      // Generate OpenAPI spec
      const openApiSpec = openapiGenerator.generateSpec();
      const openApiOperation = openApiSpec.paths['/api/users/{id}'].get;
      
      // Generate MCP tool
      const mcpTool = toolBuilder.buildToolFromRoute(mockRoute);
      
      // Descriptions should be consistent
      expect(openApiOperation.description).toBe(description);
      expect(mcpTool.description).toContain(description);
      
      // Summary should be consistent
      expect(openApiOperation.summary).toBe(summary);
      expect(mcpTool.summary).toBe(summary);
    });
  });
});

