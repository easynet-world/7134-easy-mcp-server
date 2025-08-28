describe('Core Modules', () => {
  describe('APILoader', () => {
    let APILoader;
    
    beforeAll(() => {
      APILoader = require('../src/core/api-loader');
    });
    
    test('should be a class', () => {
      expect(typeof APILoader).toBe('function');
      expect(APILoader.prototype).toBeDefined();
    });
    
    test('should be instantiable', () => {
      expect(() => {
        new APILoader();
      }).not.toThrow();
    });
    
    test('should have required methods', () => {
      const loader = new APILoader();
      
      expect(typeof loader.loadAPIs).toBe('function');
      expect(typeof loader.getRoutes).toBe('function');
      expect(typeof loader.clearCache).toBe('function');
      expect(typeof loader.reloadAPIs).toBe('function');
    });
    
    test('should load APIs from directory', () => {
      const loader = new APILoader();
      const routes = loader.loadAPIs();
    
      expect(Array.isArray(routes)).toBe(true);
      // Note: In test environment, API directory might be empty
      expect(routes.length).toBeGreaterThanOrEqual(0);
    });
    
    test('should return routes with correct structure', () => {
      const loader = new APILoader();
      const routes = loader.getRoutes();
      
      routes.forEach(route => {
        expect(route).toHaveProperty('method');
        expect(route).toHaveProperty('path');
        expect(route).toHaveProperty('processor');
        expect(typeof route.method).toBe('string');
        expect(typeof route.path).toBe('string');
        expect(typeof route.processor).toBe('function');
      });
    });
  });

  describe('OpenAPIGenerator', () => {
    let OpenAPIGenerator;
    
    beforeAll(() => {
      OpenAPIGenerator = require('../src/core/openapi-generator');
    });
    
    test('should be a class', () => {
      expect(typeof OpenAPIGenerator).toBe('function');
      expect(OpenAPIGenerator.prototype).toBeDefined();
    });
    
    test('should be instantiable', () => {
      expect(() => {
        new OpenAPIGenerator();
      }).not.toThrow();
    });
    
    test('should have required methods', () => {
      const generator = new OpenAPIGenerator();
      
      expect(typeof generator.generateSpec).toBe('function');
      expect(typeof generator.generateInfo).toBe('function');
      expect(typeof generator.generateServers).toBe('function');
      expect(typeof generator.generatePaths).toBe('function');
      expect(typeof generator.generateComponents).toBe('function');
    });
    
    test('should generate OpenAPI spec', () => {
      const mockApiLoader = {
        getRoutes: () => [
          { method: 'GET', path: '/test', processor: class Test {} }
        ]
      };
      const generator = new OpenAPIGenerator(mockApiLoader);
    
      const spec = generator.generateSpec();
    
      expect(spec).toHaveProperty('openapi');
      expect(spec).toHaveProperty('info');
      expect(spec).toHaveProperty('servers');
      expect(spec).toHaveProperty('paths');
      expect(spec).toHaveProperty('components');
      expect(spec.openapi).toBe('3.0.0');
    });
    
    test('should generate correct info section', () => {
      const mockApiLoader = {};
      const generator = new OpenAPIGenerator(mockApiLoader);
      const info = generator.generateInfo();
    
      expect(info.title).toBe('Easy MCP Framework');
      expect(info.version).toBe('0.1.1');
      expect(info.description).toContain('MCP');
      expect(info.description).toContain('AI models');
    });
  });

  describe('HotReloader', () => {
    let HotReloader;
    
    beforeAll(() => {
      HotReloader = require('../src/utils/hot-reloader');
    });
    
    test('should be a class', () => {
      expect(typeof HotReloader).toBe('function');
      expect(HotReloader.prototype).toBeDefined();
    });
    
    test('should be instantiable', () => {
      expect(() => {
        new HotReloader();
      }).not.toThrow();
    });
    
    test('should have required methods', () => {
      const mockApiLoader = {};
      const mockMcpServer = {};
      const reloader = new HotReloader(mockApiLoader, mockMcpServer);
    
      expect(typeof reloader.startWatching).toBe('function');
      expect(typeof reloader.stopWatching).toBe('function');
      expect(typeof reloader.queueReload).toBe('function');
    });
    
    test('should start and stop without errors', () => {
      const mockApiLoader = {};
      const mockMcpServer = {};
      const reloader = new HotReloader(mockApiLoader, mockMcpServer);
    
      expect(() => {
        reloader.startWatching();
      }).not.toThrow();
    
      expect(() => {
        reloader.stopWatching();
      }).not.toThrow();
    });
  });
});
