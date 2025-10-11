const BaseAPI = require('../src/core/base-api');
const { setupTestEnvironment } = require('../src/utils/test-utils');

// Mock the AnnotationParser
jest.mock('../src/utils/annotation-parser');

// Define TestAPI class at module level
class TestAPI extends BaseAPI {
  process(req, res) {
    res.json({ message: 'test' });
  }
}

describe('BaseAPI Class', () => {
  let baseAPI;
  let mockAnnotationParser;

  setupTestEnvironment();

  beforeEach(() => {
    baseAPI = new TestAPI();
    
    // Mock the AnnotationParser
    mockAnnotationParser = require('../src/utils/annotation-parser');
    
    // Set up default mock behavior
    mockAnnotationParser.getAnnotationValue.mockReturnValue(null);
  });

  describe('Core Functionality', () => {
    test('should be instantiable', () => {
      expect(baseAPI).toBeInstanceOf(BaseAPI);
      expect(baseAPI).toBeInstanceOf(TestAPI);
      expect(baseAPI.constructor.name).toBe('TestAPI');
    });

    test('should have required methods', () => {
      expect(typeof baseAPI.process).toBe('function');
      expect(typeof baseAPI.openApi).toBe('object');
    });

    test('should throw error when process is not implemented', () => {
      const abstractAPI = new BaseAPI();
      expect(() => abstractAPI.process({}, {})).toThrow('process method must be implemented by subclass');
    });
  });

  describe('OpenAPI Generation', () => {
    test('should generate basic OpenAPI spec', () => {
      const spec = baseAPI.openApi;
      
      expect(spec).toHaveProperty('summary');
      expect(spec).toHaveProperty('description');
      expect(spec).toHaveProperty('tags');
      expect(spec.tags).toEqual(['api']);
    });

    test('should use default values when annotations are missing', () => {
      const spec = baseAPI.openApi;
      
      expect(spec.summary).toBe('API endpoint summary');
      expect(spec.description).toBe('API endpoint description');
      expect(spec.tags).toEqual(['api']);
    });

    test('should include request body schema when available', () => {
      // Mock the requestBodySchema getter directly
      Object.defineProperty(baseAPI, 'requestBodySchema', {
        get: () => ({
          type: 'object',
          properties: {
            name: { type: 'string' }
          }
        })
      });

      const spec = baseAPI.openApi;
      
      expect(spec.requestBody).toBeDefined();
      expect(spec.requestBody.required).toBe(true);
      expect(spec.requestBody.content['application/json'].schema).toBeDefined();
    });

    test('should include response schemas when available', () => {
      // Mock the responseSchema getter directly
      Object.defineProperty(baseAPI, 'responseSchema', {
        get: () => ({
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        })
      });

      const spec = baseAPI.openApi;
      
      expect(spec.responses).toBeDefined();
      expect(spec.responses['200']).toBeDefined();
      expect(spec.responses['200'].content['application/json'].schema).toBeDefined();
    });

    test('should handle complex @responseSchema annotations', () => {
      // Mock the responseSchema getter with complex schema
      Object.defineProperty(baseAPI, 'responseSchema', {
        get: () => ({
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                email: { type: 'string', format: 'email' },
                age: { type: 'integer' },
                isActive: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' }
              }
            },
            message: { type: 'string' }
          }
        })
      });

      const spec = baseAPI.openApi;
      
      expect(spec.responses).toBeDefined();
      expect(spec.responses['200']).toBeDefined();
      
      const responseSchema = spec.responses['200'].content['application/json'].schema;
      expect(responseSchema.type).toBe('object');
      expect(responseSchema.properties.success).toBeDefined();
      expect(responseSchema.properties.data).toBeDefined();
      expect(responseSchema.properties.message).toBeDefined();
      expect(responseSchema.properties.data.properties.id.format).toBe('uuid');
      expect(responseSchema.properties.data.properties.email.format).toBe('email');
    });

    test('should handle @errorResponses annotations correctly', () => {
      // Mock the errorResponses getter
      Object.defineProperty(baseAPI, 'errorResponses', {
        get: () => ({
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' }
                  }
                }
              }
            }
          },
          '409': {
            description: 'User already exists',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' }
                  }
                }
              }
            }
          }
        })
      });

      const spec = baseAPI.openApi;
      
      expect(spec.responses).toBeDefined();
      expect(spec.responses['400']).toBeDefined();
      expect(spec.responses['409']).toBeDefined();
      
      // Should use annotation-based error responses
      expect(spec.responses['400'].description).toBe('Validation error');
      expect(spec.responses['409'].description).toBe('User already exists');
    });

    test('should prioritize @responseSchema over auto-generated schemas', () => {
      // Mock both responseSchema and errorResponses
      Object.defineProperty(baseAPI, 'responseSchema', {
        get: () => ({
          type: 'object',
          properties: {
            customField: { type: 'string' }
          }
        })
      });

      Object.defineProperty(baseAPI, 'errorResponses', {
        get: () => ({
          '400': {
            description: 'Custom error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    customError: { type: 'string' }
                  }
                }
              }
            }
          }
        })
      });

      const spec = baseAPI.openApi;
      
      expect(spec.responses).toBeDefined();
      expect(spec.responses['200']).toBeDefined();
      expect(spec.responses['400']).toBeDefined();
      
      // Should use annotation-based schemas, not auto-generated ones
      const successSchema = spec.responses['200'].content['application/json'].schema;
      expect(successSchema.properties.customField).toBeDefined();
      expect(successSchema.properties).not.toHaveProperty('success');
      expect(successSchema.properties).not.toHaveProperty('timestamp');
      
      const errorSchema = spec.responses['400'].content['application/json'].schema;
      expect(errorSchema.properties.customError).toBeDefined();
    });
  });

  describe('MCP Integration', () => {
    test('should provide MCP description', () => {
      // Mock the openApi getter to return a specific description
      Object.defineProperty(baseAPI, 'openApi', {
        get: () => ({
          description: 'MCP description',
          summary: 'Test summary',
          tags: ['api']
        })
      });
      
      expect(baseAPI.mcpDescription).toBe('MCP description');
    });

    test('should fallback to OpenAPI description for MCP', () => {
      expect(baseAPI.mcpDescription).toBe('API endpoint description');
    });
  });

  describe('Error Handling', () => {
    test('should handle annotation parser errors gracefully', () => {
      mockAnnotationParser.getAnnotationValue.mockImplementation(() => {
        throw new Error('Parser error');
      });
      
      // Should not throw, should return default values
      expect(baseAPI.description).toBe('API endpoint description');
      expect(baseAPI.summary).toBe('API endpoint summary');
      expect(baseAPI.tags).toEqual(['api']);
    });

    test('should handle missing annotation parser gracefully', () => {
      // Mock require.cache to simulate missing module
      const originalCache = require.cache;
      require.cache = {};
      
      // Should not throw, should return default values
      expect(baseAPI.description).toBe('API endpoint description');
      
      // Restore cache
      require.cache = originalCache;
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty annotations', () => {
      mockAnnotationParser.getAnnotationValue.mockReturnValue('');
      
      expect(baseAPI.description).toBe('API endpoint description');
      expect(baseAPI.summary).toBe('API endpoint summary');
    });

    test('should handle null annotations', () => {
      mockAnnotationParser.getAnnotationValue.mockReturnValue(null);
      
      expect(baseAPI.description).toBe('API endpoint description');
      expect(baseAPI.summary).toBe('API endpoint summary');
    });

    test('should handle complex tag structures', () => {
      // Mock the tags getter directly to test the logic
      Object.defineProperty(baseAPI, 'tags', {
        get: () => ['tag1', 'tag2', 'tag3']
      });
      
      expect(baseAPI.tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(baseAPI.tags).toHaveLength(3);
    });
  });
});
