/**
 * API Examples Tests
 * Tests the example API implementations efficiently
 */

const { setupTestEnvironment } = require('../src/utils/test-utils');

describe('API Examples', () => {
  setupTestEnvironment();

  // Define all example APIs to test
  const exampleAPIs = [
    { name: 'GetExample', path: '../api/example/get', method: 'GET' },
    { name: 'PostExample', path: '../api/example/post', method: 'POST' },
    { name: 'PutExample', path: '../api/example/put', method: 'PUT' },
    { name: 'PatchExample', path: '../api/example/patch', method: 'PATCH' },
    { name: 'DeleteExample', path: '../api/example/delete', method: 'DELETE' }
  ];

  describe('API Structure Validation', () => {
    test.each(exampleAPIs)('$name should be a valid API class', ({ name: _name, path }) => {
      const ExampleClass = require(path);
      
      expect(typeof ExampleClass).toBe('function');
      expect(ExampleClass.prototype).toBeDefined();
    });

    test.each(exampleAPIs)('$name should be instantiable', ({ name: _name, path }) => {
      const ExampleClass = require(path);
      
      expect(() => {
        new ExampleClass();
      }).not.toThrow();
    });

    test.each(exampleAPIs)('$name should have required methods', ({ name: _name, path }) => {
      const ExampleClass = require(path);
      const instance = new ExampleClass();
      
      expect(typeof instance.process).toBe('function');
      expect(instance.process).toBeDefined();
    });
  });

  describe('API Functionality', () => {
    test.each(exampleAPIs)('$name should have process method with correct signature', ({ name: _name, path }) => {
      const ExampleClass = require(path);
      const instance = new ExampleClass();
      const processMethod = instance.process;
      
      expect(typeof processMethod).toBe('function');
      expect(processMethod.length).toBe(2); // req, res parameters
    });

    test.each(exampleAPIs)('$name should have description property', ({ name: _name, path }) => {
      const ExampleClass = require(path);
      const instance = new ExampleClass();
      
      expect(instance.description).toBeDefined();
      expect(typeof instance.description).toBe('string');
      expect(instance.description.length).toBeGreaterThan(0);
    });
  });

  describe('API Consistency', () => {
    test('all examples should follow consistent structure', () => {
      const examples = exampleAPIs.map(({ path }) => require(path));
      
      examples.forEach(ExampleClass => {
        const instance = new ExampleClass();
        
        // Check required properties
        expect(instance).toHaveProperty('process');
        expect(instance).toHaveProperty('description');
        
        // Check method signatures
        expect(typeof instance.process).toBe('function');
        expect(typeof instance.description).toBe('string');
      });
    });

    test('all examples should be independent classes', () => {
      const examples = exampleAPIs.map(({ path }) => require(path));
      const uniqueClasses = new Set(examples);
      
      expect(uniqueClasses.size).toBe(examples.length);
    });
  });
});
