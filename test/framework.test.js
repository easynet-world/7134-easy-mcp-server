/**
 * Framework Functionality Tests
 * Tests actual framework behavior rather than file existence
 */

const { setupTestEnvironment } = require('../src/utils/test-utils');

describe('Framework Functionality', () => {
  setupTestEnvironment();

  describe('Package Configuration', () => {
    test('should have valid package.json structure', () => {
      const packageJson = require('../package.json');
      
      expect(packageJson.name).toBe('easy-mcp-server');
      expect(packageJson.version).toBeDefined();
      expect(packageJson.description).toContain('MCP');
      expect(packageJson.main).toBeDefined();
    });

    test('should have required scripts', () => {
      const packageJson = require('../package.json');
      
      expect(packageJson.scripts.start).toBeDefined();
      expect(packageJson.scripts.dev).toBeDefined();
      expect(packageJson.scripts.test).toBeDefined();
    });

    test('should have core dependencies', () => {
      const packageJson = require('../package.json');
      
      expect(packageJson.dependencies.express).toBeDefined();
      expect(packageJson.dependencies.cors).toBeDefined();
      expect(packageJson.dependencies.dotenv).toBeDefined();
    });
  });

  describe('Framework Initialization', () => {
    test('should initialize without errors', () => {
      expect(() => {
        require('../src/core/api-loader');
        require('../src/core/openapi-generator');
        require('../src/utils/hot-reloader');
      }).not.toThrow();
    });

    test('should export expected modules', () => {
      const APILoader = require('../src/core/api-loader');
      const OpenAPIGenerator = require('../src/core/openapi-generator');
      
      expect(typeof APILoader).toBe('function');
      expect(typeof OpenAPIGenerator).toBe('function');
    });
  });
});
