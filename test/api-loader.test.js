const APILoader = require('../src/core/api-loader');
const fs = require('fs');
const { 
  createMockApp, 
  createMockProcessorClass,
  setupTestEnvironment
} = require('../src/utils/test-utils');

describe('APILoader', () => {
  let apiLoader;
  let mockApp;
  let existsSpy;
  let readdirSpy;
  let statSpy;

  setupTestEnvironment();

  beforeEach(() => {
    // Create mock Express app
    mockApp = createMockApp();
    
    apiLoader = new APILoader(mockApp);
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up fs spies so we can control behaviour without affecting other tests
    existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    readdirSpy = jest.spyOn(fs, 'readdirSync').mockImplementation(() => []);
    statSpy = jest.spyOn(fs, 'statSync').mockImplementation(() => ({
      isDirectory: () => false
    }));
  });

  afterEach(() => {
    existsSpy.mockRestore();
    readdirSpy.mockRestore();
    statSpy.mockRestore();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with correct properties', () => {
      expect(apiLoader.app).toBe(mockApp);
      expect(apiLoader.routes).toEqual([]);
      expect(apiLoader.processors).toBeInstanceOf(Map);
      expect(apiLoader.errors).toEqual([]);
    });

    test('should handle different app instances', () => {
      const differentApp = { get: jest.fn() };
      const differentLoader = new APILoader(differentApp);
      
      expect(differentLoader.app).toBe(differentApp);
      expect(differentLoader.app).not.toBe(mockApp);
    });
  });

  describe('loadAPIs', () => {
    test('should return empty array when api directory does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      const result = apiLoader.loadAPIs();
      
      expect(result).toEqual([]);
      expect(apiLoader.routes).toEqual([]);
      expect(apiLoader.errors).toEqual([]);
    });

    test('should handle errors during loading gracefully', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockImplementation(() => {
        throw new Error('Directory read error');
      });
      
      const result = apiLoader.loadAPIs();
      
      expect(result).toEqual([]);
      expect(apiLoader.errors).toHaveLength(2); // One for middleware scan, one for API scan
      expect(apiLoader.errors[0]).toContain('Failed to scan');
      expect(apiLoader.errors[1]).toContain('Failed to scan');
    });
  });

  describe('Utility Methods', () => {
    test('should get routes correctly', () => {
      // Manually add a route for testing
      const mockProcessor = createMockProcessorClass();
      apiLoader.routes = [
        { method: 'GET', path: '/test', processorInstance: new mockProcessor() }
      ];
      
      const routes = apiLoader.getRoutes();
      
      expect(routes).toHaveLength(1);
      expect(routes[0]).toHaveProperty('method');
      expect(routes[0]).toHaveProperty('path');
    });

    test('should validate routes correctly', () => {
      // Manually add a valid route for testing
      const mockProcessor = createMockProcessorClass();
      apiLoader.routes = [
        { method: 'GET', path: '/test', processorInstance: new mockProcessor() }
      ];
      
      const issues = apiLoader.validateRoutes();
      
      expect(issues).toEqual([]); // Should be valid
    });

    test('should validate routes with issues', () => {
      // Manually add invalid routes for testing
      const mockProcessor = createMockProcessorClass();
      apiLoader.routes = [
        { method: 'GET', path: '/test' }, // Missing processorInstance
        { method: 'GET', path: null, processorInstance: new mockProcessor() }, // Missing path
        { method: null, path: '/test', processorInstance: new mockProcessor() } // Missing method
      ];
      
      const issues = apiLoader.validateRoutes();
      
      expect(issues).toHaveLength(3); // Should have 3 issues
      expect(issues[0]).toContain('Invalid processor instance');
      expect(issues[1]).toContain('Missing method or path');
      expect(issues[2]).toContain('Missing method or path');
    });

    test('should get errors correctly', () => {
      // Manually add errors for testing
      apiLoader.errors = ['Test error 1', 'Test error 2'];
      
      const errors = apiLoader.getErrors();
      
      expect(errors).toHaveLength(2);
      expect(errors[0]).toBe('Test error 1');
      expect(errors[1]).toBe('Test error 2');
    });

    test('should clear cache for specific file', () => {
      const filePath = '/test/api/get.js';
      
      // Mock require.resolve
      const originalResolve = require.resolve;
      require.resolve = jest.fn().mockReturnValue(filePath);
      
      // Mock require.cache
      require.cache = { [filePath]: {} };
      
      // The method should not throw an error
      expect(() => apiLoader.clearCache(filePath)).not.toThrow();
      
      require.resolve = originalResolve;
    });

    test('should reload APIs correctly', () => {
      // Mock the loadAPIs method to return test routes and update the instance
      const mockProcessor = createMockProcessorClass();
      const mockRoutes = [
        { method: 'GET', path: '/test', processorInstance: new mockProcessor() }
      ];
      
      const mockLoadAPIs = jest.spyOn(apiLoader, 'loadAPIs').mockImplementation(() => {
        apiLoader.routes = mockRoutes;
        return mockRoutes;
      });
      
      const result = apiLoader.reloadAPIs();
      
      expect(result).toHaveLength(1);
      expect(apiLoader.routes).toHaveLength(1);
      expect(mockLoadAPIs).toHaveBeenCalled();
      
      mockLoadAPIs.mockRestore();
    });
  });

  describe('Error Handling', () => {
    test('should handle cache clearing errors gracefully', () => {
      const filePath = '/test/api/get.js';
      
      // Mock require.resolve to throw error
      const originalResolve = require.resolve;
      require.resolve = jest.fn().mockImplementation(() => {
        throw new Error('Resolve error');
      });
      
      expect(() => apiLoader.clearCache(filePath)).not.toThrow();
      
      require.resolve = originalResolve;
    });
  });
});
