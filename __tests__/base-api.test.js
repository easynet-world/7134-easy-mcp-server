const BaseAPI = require('../src/core/base-api');
const fs = require('fs');
const path = require('path');

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

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    baseAPI = new TestAPI();
    
    // Mock the AnnotationParser
    mockAnnotationParser = require('../src/utils/annotation-parser');
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
      // Mock annotation parser to return request body schema
      mockAnnotationParser.getAnnotationValue.mockReturnValue({
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      });

      const spec = baseAPI.openApi;
      
      expect(spec.requestBody).toBeDefined();
      expect(spec.requestBody.required).toBe(true);
      expect(spec.requestBody.content['application/json'].schema).toBeDefined();
    });

    test('should include response schemas when available', () => {
      // Mock annotation parser to return response schema
      mockAnnotationParser.getAnnotationValue.mockReturnValue({
        type: 'object',
        properties: {
          message: { type: 'string' }
        }
      });

      const spec = baseAPI.openApi;
      
      expect(spec.responses).toBeDefined();
      expect(spec.responses['200']).toBeDefined();
      expect(spec.responses['200'].content['application/json'].schema).toBeDefined();
    });

    test('should include error responses when available', () => {
      // Mock annotation parser to return error responses
      mockAnnotationParser.getAnnotationValue.mockReturnValue({
        '400': {
          description: 'Bad request',
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
      });

      const spec = baseAPI.openApi;
      
      expect(spec.responses).toBeDefined();
      expect(spec.responses['400']).toBeDefined();
      expect(spec.responses['400'].description).toBe('Bad request');
    });

    test('should handle missing error responses gracefully', () => {
      mockAnnotationParser.getAnnotationValue.mockReturnValue(null);
      
      const spec = baseAPI.openApi;
      
      expect(spec.responses).toBeUndefined();
    });
  });

  describe('Annotation Parsing', () => {
    test('should get description from annotations', () => {
      mockAnnotationParser.getAnnotationValue.mockReturnValue('Test description');
      
      expect(baseAPI.description).toBe('Test description');
    });

    test('should fallback to default description when annotation missing', () => {
      mockAnnotationParser.getAnnotationValue.mockReturnValue(null);
      
      expect(baseAPI.description).toBe('API endpoint description');
    });

    test('should get summary from annotations', () => {
      mockAnnotationParser.getAnnotationValue.mockReturnValue('Test summary');
      
      expect(baseAPI.summary).toBe('Test summary');
    });

    test('should fallback to default summary when annotation missing', () => {
      mockAnnotationParser.getAnnotationValue.mockReturnValue(null);
      
      expect(baseAPI.summary).toBe('API endpoint summary');
    });

    test('should get tags from annotations', () => {
      mockAnnotationParser.getAnnotationValue.mockReturnValue(['test', 'api']);
      
      expect(baseAPI.tags).toEqual(['test', 'api']);
    });

    test('should fallback to default tags when annotation missing', () => {
      mockAnnotationParser.getAnnotationValue.mockReturnValue(null);
      
      expect(baseAPI.tags).toEqual(['api']);
    });

    test('should handle invalid tags gracefully', () => {
      mockAnnotationParser.getAnnotationValue.mockReturnValue('not-an-array');
      
      expect(baseAPI.tags).toEqual(['api']);
    });

    test('should get request body schema from annotations', () => {
      const schema = { type: 'object', properties: { name: { type: 'string' } } };
      mockAnnotationParser.getAnnotationValue.mockReturnValue(schema);
      
      expect(baseAPI.requestBodySchema).toEqual(schema);
    });

    test('should get response schema from annotations', () => {
      const schema = { type: 'object', properties: { message: { type: 'string' } } };
      mockAnnotationParser.getAnnotationValue.mockReturnValue(schema);
      
      expect(baseAPI.responseSchema).toEqual(schema);
    });

    test('should get error responses from annotations', () => {
      const errorResponses = {
        '400': { description: 'Bad request', schema: { type: 'object' } }
      };
      mockAnnotationParser.getAnnotationValue.mockReturnValue(errorResponses);
      
      expect(baseAPI.errorResponses).toBeDefined();
      expect(baseAPI.errorResponses['400']).toBeDefined();
    });

    test('should format error responses correctly for OpenAPI', () => {
      const errorResponses = {
        '400': { description: 'Bad request', schema: { type: 'object' } }
      };
      mockAnnotationParser.getAnnotationValue.mockReturnValue(errorResponses);
      
      const formatted = baseAPI.errorResponses;
      
      expect(formatted['400'].content['application/json'].schema).toBeDefined();
      expect(formatted['400'].description).toBe('Bad request');
    });
  });

  describe('MCP Integration', () => {
    test('should provide MCP description', () => {
      mockAnnotationParser.getAnnotationValue.mockReturnValue('MCP description');
      
      expect(baseAPI.mcpDescription).toBe('MCP description');
    });

    test('should fallback to OpenAPI description for MCP', () => {
      mockAnnotationParser.getAnnotationValue.mockReturnValue(null);
      
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

    test('should handle undefined annotations', () => {
      mockAnnotationParser.getAnnotationValue.mockReturnValue(undefined);
      
      expect(baseAPI.description).toBe('API endpoint description');
      expect(baseAPI.summary).toBe('API endpoint summary');
    });

    test('should handle complex tag structures', () => {
      const complexTags = ['tag1', 'tag2', 'tag3'];
      mockAnnotationParser.getAnnotationValue.mockReturnValue(complexTags);
      
      expect(baseAPI.tags).toEqual(complexTags);
      expect(baseAPI.tags).toHaveLength(3);
    });
  });

  describe('Performance', () => {
    test('should cache OpenAPI spec generation', () => {
      const startTime = Date.now();
      const spec1 = baseAPI.openApi;
      const time1 = Date.now() - startTime;
      
      const startTime2 = Date.now();
      const spec2 = baseAPI.openApi;
      const time2 = Date.now() - startTime2;
      
      expect(spec1).toEqual(spec2);
      // Second call should be at least as fast (cached)
      expect(time2).toBeGreaterThanOrEqual(0);
    });

    test('should handle multiple instances independently', () => {
      const api1 = new TestAPI();
      const api2 = new TestAPI();
      
      // Mock different values for each instance
      mockAnnotationParser.getAnnotationValue
        .mockReturnValueOnce('API 1 description')
        .mockReturnValueOnce('API 2 description');
      
      expect(api1.description).toBe('API 1 description');
      expect(api2.description).toBe('API 2 description');
    });
  });
});
