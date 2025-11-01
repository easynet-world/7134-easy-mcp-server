/**
 * Core Modules Integration Tests
 * Tests the integration between core modules without duplicating individual module tests
 */

const { setupTestEnvironment } = require('../src/utils/test-utils');

describe('Core Modules Integration', () => {
  setupTestEnvironment();

  describe('Module Loading', () => {
    test('should load all core modules without errors', () => {
      expect(() => {
        require('../src/utils/loaders/api-loader');
        require('../src/api/openapi/openapi-generator');
        require('../src/api/base/base-api');
        require('../src/utils/loaders/hot-reloader');
        require('../src/utils/parsers/annotation-parser');
      }).not.toThrow();
    });

    test('should have consistent module structure', () => {
      const APILoader = require('../src/utils/loaders/api-loader');
      const OpenAPIGenerator = require('../src/api/openapi/openapi-generator');
      const BaseAPI = require('../src/api/base/base-api');
      
      expect(typeof APILoader).toBe('function');
      expect(typeof OpenAPIGenerator).toBe('function');
      expect(typeof BaseAPI).toBe('function');
    });
  });

  describe('Cross-Module Dependencies', () => {
    test('should handle circular dependencies gracefully', () => {
      // Test that modules can be required multiple times without issues
      expect(() => {
        const loader1 = require('../src/utils/loaders/api-loader');
        const loader2 = require('../src/utils/loaders/api-loader');
        expect(loader1).toBe(loader2); // Should be the same module instance
      }).not.toThrow();
    });
  });
});
