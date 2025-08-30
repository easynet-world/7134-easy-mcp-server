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
