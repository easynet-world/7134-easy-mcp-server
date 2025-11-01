/**
 * Integration tests for @responseSchema annotation processing
 * Tests the complete flow from JSDoc parsing to OpenAPI generation
 */

const fs = require('fs');
// Ensure fs methods are mockable in this suite
fs.existsSync = fs.existsSync && fs.existsSync.mockReturnValue ? fs.existsSync : jest.fn();
fs.readFileSync = fs.readFileSync && fs.readFileSync.mockReturnValue ? fs.readFileSync : jest.fn();
const AnnotationParser = require('../src/utils/annotation-parser');
const OpenAPIGenerator = require('../src/core/openapi-generator');

// Mock fs module
jest.mock('fs');

describe('@responseSchema Integration Tests', () => {
  let mockApiLoader;
  let openapiGenerator;
  let tempFilePath;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock API loader
    mockApiLoader = {
      getRoutes: jest.fn().mockReturnValue([])
    };
    
    openapiGenerator = new OpenAPIGenerator(mockApiLoader);
    
    // Create a unique temporary file path for each test
    tempFilePath = `/tmp/test-api-${Date.now()}-${Math.random()}.js`;
  });

  describe('Complete Flow: JSDoc → Annotation Parser → BaseAPI → OpenAPI', () => {
    test('should process @responseSchema annotation through entire pipeline', () => {
      // 1. Create source code with @responseSchema annotation
      const sourceCode = `
        const BaseAPI = require('easy-mcp-server/base-api');

        /**
         * @description Create a new user with validation
         * @summary Create user endpoint
         * @tags users
         * @requestBody {
         *   "type": "object",
         *   "required": ["name", "email"],
         *   "properties": {
         *     "name": { "type": "string", "minLength": 2, "maxLength": 50 },
         *     "email": { "type": "string", "format": "email" }
         *   }
         * }
         * @responseSchema {
         *   "type": "object",
         *   "properties": {
         *     "success": { "type": "boolean" },
         *     "data": {
         *       "type": "object",
         *       "properties": {
         *       "id": { "type": "string", "format": "uuid" },
         *       "name": { "type": "string" },
         *       "email": { "type": "string", "format": "email" },
         *       "age": { "type": "integer" },
         *       "isActive": { "type": "boolean" },
         *       "createdAt": { "type": "string", "format": "date-time" }
         *       }
         *     },
         *     "message": { "type": "string" }
         *   }
         * }
         * @errorResponses {
         *   "400": { "description": "Validation error", "schema": { "type": "object", "properties": { "error": { "type": "string" } } } },
         *   "409": { "description": "User already exists", "schema": { "type": "object", "properties": { "error": { "type": "string" } } } }
         * }
         */
        class TestUserAPI extends BaseAPI {
          process(req, res) {
            // Implementation
          }
        }

        module.exports = TestUserAPI;
      `;

      // 2. Mock fs to return our test source code
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(sourceCode);

      // 3. Parse annotations using AnnotationParser
      const annotations = AnnotationParser.parseClassAnnotations('TestUserAPI', tempFilePath);
      
      expect(annotations).toBeDefined();
      expect(annotations).toHaveProperty('responseSchema');
      expect(annotations).toHaveProperty('requestBody');
      expect(annotations).toHaveProperty('errorResponses');

      // 4. Verify @responseSchema was parsed correctly
      const responseSchema = annotations.responseSchema;
      expect(responseSchema.type).toBe('object');
      expect(responseSchema.properties.success).toBeDefined();
      expect(responseSchema.properties.data).toBeDefined();
      expect(responseSchema.properties.message).toBeDefined();
      expect(responseSchema.properties.data.properties.id.format).toBe('uuid');
      expect(responseSchema.properties.data.properties.email.format).toBe('email');

      // 5. Verify @errorResponses was parsed correctly
      const errorResponses = annotations.errorResponses;
      expect(errorResponses['400']).toBeDefined();
      expect(errorResponses['409']).toBeDefined();
      expect(errorResponses['400'].description).toBe('Validation error');
      expect(errorResponses['409'].description).toBe('User already exists');

      // 6. Create a mock route with the processor instance
      const mockRoute = {
        method: 'POST',
        path: '/users',
        processorInstance: {
          openApi: {
            summary: 'Create user endpoint',
            description: 'Create a new user with validation',
            tags: ['users'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: annotations.requestBody
                }
              }
            },
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: annotations.responseSchema
                  }
                }
              },
              ...annotations.errorResponses
            }
          }
        }
      };

      // 7. Generate OpenAPI paths
      const paths = openapiGenerator.generatePaths([mockRoute]);
      
      expect(paths).toHaveProperty('/users');
      expect(paths['/users']).toHaveProperty('post');
      
      const postEndpoint = paths['/users'].post;
      
      // 8. Verify the OpenAPI spec contains the annotation-based schemas
      expect(postEndpoint.summary).toBe('Create user endpoint');
      expect(postEndpoint.description).toBe('Create a new user with validation');
      expect(postEndpoint.tags).toEqual(['users']);
      
      // Verify request body
      expect(postEndpoint.requestBody).toBeDefined();
      expect(postEndpoint.requestBody.required).toBe(true);
      expect(postEndpoint.requestBody.content['application/json'].schema).toEqual(annotations.requestBody);
      
      // Verify response schema (should prioritize annotation over auto-generated)
      expect(postEndpoint.responses).toBeDefined();
      expect(postEndpoint.responses['200']).toBeDefined();
      expect(postEndpoint.responses['200'].content['application/json'].schema).toEqual(annotations.responseSchema);
      
      // Verify error responses
      expect(postEndpoint.responses['400']).toBeDefined();
      expect(postEndpoint.responses['409']).toBeDefined();
      expect(postEndpoint.responses['400'].description).toBe('Validation error');
      expect(postEndpoint.responses['409'].description).toBe('User already exists');
    });

    test('should not override @responseSchema with auto-generated schemas', () => {
      // Create source code with only @responseSchema (no @errorResponses)
      const sourceCode = `
        const BaseAPI = require('easy-mcp-server/base-api');

        /**
         * @responseSchema {
         *   "type": "object",
         *   "properties": {
         *     "customField": { "type": "string" },
         *     "customNumber": { "type": "integer" }
         *   }
         * }
         */
        class TestCustomAPI extends BaseAPI {
          process(req, res) {
            // Implementation
          }
        }

        module.exports = TestCustomAPI;
      `;

      // Mock fs
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(sourceCode);

      // Parse annotations
      const annotations = AnnotationParser.parseClassAnnotations('TestCustomAPI', tempFilePath);
      
      expect(annotations).toBeDefined();
      expect(annotations).toHaveProperty('responseSchema');
      expect(annotations.responseSchema.properties.customField).toBeDefined();
      expect(annotations.responseSchema.properties.customNumber).toBeDefined();

      // Create mock route
      const mockRoute = {
        method: 'GET',
        path: '/custom',
        processorInstance: {
          openApi: {
            responses: {
              '200': {
                description: 'Custom response',
                content: {
                  'application/json': {
                    schema: annotations.responseSchema
                  }
                }
              }
            }
          }
        }
      };

      // Generate OpenAPI paths
      const paths = openapiGenerator.generatePaths([mockRoute]);
      
      expect(paths).toHaveProperty('/custom');
      expect(paths['/custom']).toHaveProperty('get');
      
      const getEndpoint = paths['/custom'].get;
      
      // Verify the custom schema is preserved and not overridden
      expect(getEndpoint.responses['200'].content['application/json'].schema).toEqual(annotations.responseSchema);
      
      // Should NOT have auto-generated schema properties
      const responseSchema = getEndpoint.responses['200'].content['application/json'].schema;
      expect(responseSchema.properties).not.toHaveProperty('success');
      expect(responseSchema.properties).not.toHaveProperty('timestamp');
      expect(responseSchema.properties).toHaveProperty('customField');
      expect(responseSchema.properties).toHaveProperty('customNumber');
    });

    test('should fall back to auto-generation when no annotations present', () => {
      // Create source code with no @responseSchema
      const sourceCode = `
        const BaseAPI = require('easy-mcp-server/base-api');

        /**
         * @description Simple endpoint without response schema
         */
        class TestSimpleAPI extends BaseAPI {
          process(req, res) {
            // Implementation
          }
        }

        module.exports = TestSimpleAPI;
      `;

      // Mock fs
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(sourceCode);

      // Parse annotations
      const annotations = AnnotationParser.parseClassAnnotations('TestSimpleAPI', tempFilePath);
      
      expect(annotations).toBeDefined();
      expect(annotations).not.toHaveProperty('responseSchema');

      // Create mock route with no openApi.responses
      const mockRoute = {
        method: 'GET',
        path: '/simple',
        processorInstance: {
          // No openApi property
        }
      };

      // Generate OpenAPI paths
      const paths = openapiGenerator.generatePaths([mockRoute]);
      
      expect(paths).toHaveProperty('/simple');
      expect(paths['/simple']).toHaveProperty('get');
      
      const getEndpoint = paths['/simple'].get;
      
      // Should use auto-generated schema since no annotations provided
      expect(getEndpoint.responses).toBeDefined();
      expect(getEndpoint.responses['200']).toBeDefined();
      expect(getEndpoint.responses['200'].content['application/json'].schema).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed @responseSchema gracefully', () => {
      const sourceCode = `
        const BaseAPI = require('easy-mcp-server/base-api');

        /**
         * @responseSchema {
         *   "type": "object",
         *   "properties": {
         *     "field": { "type": "string" }
         *   }
         * }
         */
        class TestMalformedAPI extends BaseAPI {
          process(req, res) {
            // Implementation
          }
        }

        module.exports = TestMalformedAPI;
      `;

      // Mock fs
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(sourceCode);

      // Parse annotations
      const annotations = AnnotationParser.parseClassAnnotations('TestMalformedAPI', tempFilePath);
      
      // Should handle gracefully
      expect(annotations).toBeDefined();
      expect(annotations.responseSchema).toBeDefined();

      // Create mock route
      const mockRoute = {
        method: 'POST',
        path: '/malformed',
        processorInstance: {
          openApi: {
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: annotations.responseSchema
                  }
                }
              }
            }
          }
        }
      };

      // Generate OpenAPI paths
      const paths = openapiGenerator.generatePaths([mockRoute]);
      
      expect(paths).toHaveProperty('/malformed');
      expect(paths['/malformed']).toHaveProperty('post');
      
      const postEndpoint = paths['/malformed'].post;
      
      // Should use annotation-based schema
      expect(postEndpoint.responses).toBeDefined();
      expect(postEndpoint.responses['200']).toBeDefined();
      expect(postEndpoint.responses['200'].content['application/json'].schema).toEqual(annotations.responseSchema);
    });

    test('should handle mixed valid and invalid annotations', () => {
      const sourceCode = `
        const BaseAPI = require('easy-mcp-server/base-api');

        /**
         * @description Valid description
         * @summary Valid summary
         * @tags valid,tags
         * @requestBody {
         *   "type": "object",
         *   "properties": {
         *     "name": { "type": "string" }
         *   }
         * }
         * @responseSchema {
         *   "type": "object",
         *   "properties": {
         *     "field": { "type": "string" }
         *   }
         * }
         */
        class TestMixedAPI extends BaseAPI {
          process(req, res) {
            // Implementation
          }
        }

        module.exports = TestMixedAPI;
      `;

      // Mock fs
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(sourceCode);

      // Parse annotations
      const annotations = AnnotationParser.parseClassAnnotations('TestMixedAPI', tempFilePath);
      
      // Valid annotations should work (full description and summary are now extracted)
      expect(annotations.description).toBe('Valid description');
      expect(annotations.summary).toBe('Valid summary');
      expect(annotations.tags).toEqual(['valid', 'tags']);
      expect(annotations.requestBody).toBeDefined();
      
      // Valid annotation should be parsed correctly
      expect(annotations.responseSchema).toBeDefined();
      expect(annotations.responseSchema.type).toBe('object');
      expect(annotations.responseSchema.properties.field).toBeDefined();

      // Create mock route
      const mockRoute = {
        method: 'PUT',
        path: '/mixed',
        processorInstance: {
          openApi: {
            description: 'Valid description', // Use full description for test
            summary: 'Valid summary', // Use full summary for test
            tags: annotations.tags,
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: annotations.requestBody
                }
              }
            },
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: annotations.responseSchema
                  }
                }
              }
            }
          }
        }
      };

      // Generate OpenAPI paths
      const paths = openapiGenerator.generatePaths([mockRoute]);
      
      expect(paths).toHaveProperty('/mixed');
      expect(paths['/mixed']).toHaveProperty('put');
      
      const putEndpoint = paths['/mixed'].put;
      
      // Valid properties should be preserved
      expect(putEndpoint.description).toBe('Valid description');
      expect(putEndpoint.summary).toBe('Valid summary');
      expect(putEndpoint.tags).toEqual(['valid', 'tags']);
      expect(putEndpoint.requestBody).toBeDefined();
      
      // Should use annotation-based responses
      expect(putEndpoint.responses).toBeDefined();
      expect(putEndpoint.responses['200']).toBeDefined();
      expect(putEndpoint.responses['200'].content['application/json'].schema).toEqual(annotations.responseSchema);
    });
  });
});
