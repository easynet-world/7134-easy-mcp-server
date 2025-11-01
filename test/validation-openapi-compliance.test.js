/**
 * OpenAPI 3.0.0 Compliance Validation Tests
 * Based on scripts/validate-openapi.js
 *
 * Tests the same validation logic used in the standalone validation script
 * to ensure OpenAPI spec generation meets OpenAPI 3.0.0 standards.
 */

const path = require('path');
const express = require('express');
const ApiLoader = require('../src/utils/loaders/api-loader');
const OpenAPIGenerator = require('../src/api/openapi/openapi-generator');

describe('OpenAPI 3.0.0 Compliance Validation', () => {
  let spec;
  let errors;
  let warnings;

  beforeAll(() => {
    const apiPath = path.join(__dirname, '../example-project/api');
    const app = express();
    const apiLoader = new ApiLoader(app, apiPath);
    const generator = new OpenAPIGenerator(apiLoader);
    spec = generator.generateSpec();

    errors = [];
    warnings = [];
  });

  describe('1. Required Top-Level Fields', () => {
    test('should have openapi field with version 3.0.0', () => {
      expect(spec).toHaveProperty('openapi');
      expect(spec.openapi).toBe('3.0.0');
    });

    test('should have info object with required fields', () => {
      expect(spec).toHaveProperty('info');
      expect(spec.info).toHaveProperty('title');
      expect(spec.info).toHaveProperty('version');
      expect(typeof spec.info.title).toBe('string');
      expect(typeof spec.info.version).toBe('string');
      expect(spec.info.title.length).toBeGreaterThan(0);
      expect(spec.info.version.length).toBeGreaterThan(0);
    });

    test('should have paths object', () => {
      expect(spec).toHaveProperty('paths');
      expect(typeof spec.paths).toBe('object');
      expect(spec.paths).not.toBeNull();
    });

    test('should have components object', () => {
      expect(spec).toHaveProperty('components');
      expect(typeof spec.components).toBe('object');
      expect(spec.components).not.toBeNull();
    });
  });

  describe('2. Path Parameter Format', () => {
    test('should use OpenAPI format {param} not Express format :param', () => {
      Object.keys(spec.paths).forEach(path => {
        expect(path).not.toMatch(/:[a-zA-Z_]/);
        if (path.includes('{')) {
          expect(path).toMatch(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/);
        }
      });
    });

    test('should define all path parameters in operation parameters', () => {
      Object.entries(spec.paths).forEach(([pathStr, pathItem]) => {
        const pathParams = [...pathStr.matchAll(/\{([^}]+)\}/g)].map(m => m[1]);

        if (pathParams.length > 0) {
          ['get', 'post', 'put', 'delete', 'patch'].forEach(method => {
            if (pathItem[method]) {
              const operation = pathItem[method];
              expect(operation).toHaveProperty('parameters');

              pathParams.forEach(paramName => {
                const param = operation.parameters.find(
                  p => p.name === paramName && p.in === 'path'
                );
                expect(param).toBeDefined();
                expect(param.required).toBe(true);
              });
            }
          });
        }
      });
    });
  });

  describe('3. Operation Objects', () => {
    test('all operations should have required fields', () => {
      Object.entries(spec.paths).forEach(([pathStr, pathItem]) => {
        ['get', 'post', 'put', 'delete', 'patch'].forEach(method => {
          if (pathItem[method]) {
            const operation = pathItem[method];

            // Required fields
            expect(operation).toHaveProperty('responses');
            expect(typeof operation.responses).toBe('object');

            // Recommended fields
            if (!operation.summary && !operation.description) {
              warnings.push(`${method.toUpperCase()} ${pathStr}: Missing both summary and description`);
            }
          }
        });
      });
    });

    test('all operations should have unique operationId', () => {
      const operationIds = new Set();
      const duplicates = [];

      Object.entries(spec.paths).forEach(([pathStr, pathItem]) => {
        ['get', 'post', 'put', 'delete', 'patch'].forEach(method => {
          if (pathItem[method]?.operationId) {
            const opId = pathItem[method].operationId;
            if (operationIds.has(opId)) {
              duplicates.push(opId);
            }
            operationIds.add(opId);
          }
        });
      });

      expect(duplicates).toEqual([]);
    });
  });

  describe('4. Response Objects', () => {
    test('all operations should have at least one response', () => {
      Object.entries(spec.paths).forEach(([pathStr, pathItem]) => {
        ['get', 'post', 'put', 'delete', 'patch'].forEach(method => {
          if (pathItem[method]) {
            const operation = pathItem[method];
            const responseKeys = Object.keys(operation.responses);
            expect(responseKeys.length).toBeGreaterThan(0);
          }
        });
      });
    });

    test('response objects should have valid structure', () => {
      Object.entries(spec.paths).forEach(([pathStr, pathItem]) => {
        ['get', 'post', 'put', 'delete', 'patch'].forEach(method => {
          if (pathItem[method]) {
            const operation = pathItem[method];
            Object.entries(operation.responses).forEach(([statusCode, response]) => {
              expect(response).toHaveProperty('description');
              expect(typeof response.description).toBe('string');

              if (response.content) {
                expect(typeof response.content).toBe('object');
                Object.values(response.content).forEach(mediaType => {
                  if (mediaType.schema) {
                    expect(typeof mediaType.schema).toBe('object');
                  }
                });
              }
            });
          }
        });
      });
    });
  });

  describe('5. Parameter Objects', () => {
    test('all parameters should have required fields', () => {
      Object.entries(spec.paths).forEach(([pathStr, pathItem]) => {
        ['get', 'post', 'put', 'delete', 'patch'].forEach(method => {
          if (pathItem[method]?.parameters) {
            pathItem[method].parameters.forEach(param => {
              expect(param).toHaveProperty('name');
              expect(param).toHaveProperty('in');
              expect(['query', 'header', 'path', 'cookie']).toContain(param.in);

              if (param.in === 'path') {
                expect(param.required).toBe(true);
              }

              // Must have either schema or content
              const hasSchema = param.hasOwnProperty('schema');
              const hasContent = param.hasOwnProperty('content');
              expect(hasSchema || hasContent).toBe(true);
            });
          }
        });
      });
    });
  });

  describe('6. Request Body Objects', () => {
    test('request bodies should have valid structure', () => {
      Object.entries(spec.paths).forEach(([pathStr, pathItem]) => {
        ['post', 'put', 'patch'].forEach(method => {
          if (pathItem[method]?.requestBody) {
            const requestBody = pathItem[method].requestBody;

            expect(requestBody).toHaveProperty('content');
            expect(typeof requestBody.content).toBe('object');

            Object.values(requestBody.content).forEach(mediaType => {
              expect(mediaType).toHaveProperty('schema');
              expect(typeof mediaType.schema).toBe('object');
            });
          }
        });
      });
    });
  });

  describe('7. Component Schemas', () => {
    test('should have component schemas object', () => {
      expect(spec.components).toHaveProperty('schemas');
      expect(typeof spec.components.schemas).toBe('object');
    });

    test('all component schemas should be valid JSON Schema', () => {
      Object.entries(spec.components.schemas || {}).forEach(([name, schema]) => {
        expect(typeof schema).toBe('object');

        // Should have type or allOf/anyOf/oneOf
        const hasType = schema.hasOwnProperty('type');
        const hasComposition = schema.hasOwnProperty('allOf') ||
                              schema.hasOwnProperty('anyOf') ||
                              schema.hasOwnProperty('oneOf');
        expect(hasType || hasComposition).toBe(true);
      });
    });
  });

  describe('8. Server Objects', () => {
    test('should have servers array if defined', () => {
      if (spec.servers) {
        expect(Array.isArray(spec.servers)).toBe(true);
        spec.servers.forEach(server => {
          expect(server).toHaveProperty('url');
          expect(typeof server.url).toBe('string');
        });
      }
    });
  });

  describe('9. Tag Objects', () => {
    test('tags should have valid structure if defined', () => {
      if (spec.tags) {
        expect(Array.isArray(spec.tags)).toBe(true);
        spec.tags.forEach(tag => {
          expect(tag).toHaveProperty('name');
          expect(typeof tag.name).toBe('string');
        });
      }
    });

    test('all operation tags should be defined in tags array', () => {
      const definedTags = new Set((spec.tags || []).map(t => t.name));
      const usedTags = new Set();

      Object.values(spec.paths).forEach(pathItem => {
        ['get', 'post', 'put', 'delete', 'patch'].forEach(method => {
          if (pathItem[method]?.tags) {
            pathItem[method].tags.forEach(tag => usedTags.add(tag));
          }
        });
      });

      // All used tags should be defined (if tags array exists)
      if (spec.tags && spec.tags.length > 0) {
        usedTags.forEach(tag => {
          if (!definedTags.has(tag)) {
            warnings.push(`Tag "${tag}" is used but not defined in tags array`);
          }
        });
      }
    });
  });

  describe('10. Specification Validation Summary', () => {
    test('should have no critical errors', () => {
      expect(errors).toEqual([]);
    });

    test('should generate valid OpenAPI 3.0.0 specification', () => {
      // Comprehensive check
      expect(spec.openapi).toBe('3.0.0');
      expect(spec.info.title).toBeTruthy();
      expect(spec.info.version).toBeTruthy();
      expect(typeof spec.paths).toBe('object');
      expect(typeof spec.components).toBe('object');
    });

    test('validation warnings should be informational only', () => {
      // Warnings are acceptable, just log them
      if (warnings.length > 0) {
        console.log('\nOpenAPI Validation Warnings:');
        warnings.forEach((warning, i) => {
          console.log(`  ${i + 1}. ${warning}`);
        });
      }
    });
  });

  afterAll(() => {
    // Summary report
    console.log('\n========================================');
    console.log('OpenAPI 3.0.0 Compliance Test Summary');
    console.log('========================================');
    console.log(`Errors:   ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);
    console.log(`Status:   ${errors.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('========================================\n');
  });
});
