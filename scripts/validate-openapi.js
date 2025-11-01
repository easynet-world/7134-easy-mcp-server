#!/usr/bin/env node
/**
 * OpenAPI Specification Validator
 * Validates that generated OpenAPI specs conform to OpenAPI 3.0 standards
 */

const path = require('path');
const fs = require('fs');

// Determine the API path
const apiPath = process.argv[2] || path.join(__dirname, '../example-project/api');

console.log('🔍 Validating OpenAPI Specification...');
console.log('API Path:', apiPath);
console.log('');

try {
  // Load the required modules
  const express = require('express');
  const ApiLoader = require('../src/utils/loaders/api-loader');
  const OpenAPIGenerator = require('../src/api/openapi/openapi-generator');

  // Create a mock Express app
  const app = express();

  // Create API loader and load routes
  const apiLoader = new ApiLoader(app, apiPath);
  // The APILoader loads routes in the constructor, no need to call loadRoutes()

  // Generate OpenAPI spec
  const generator = new OpenAPIGenerator(apiLoader);
  const spec = generator.generateSpec();

  let errors = [];
  let warnings = [];

  // ========================================
  // 1. Validate Required Top-Level Fields
  // ========================================
  console.log('1️⃣  Validating required top-level fields...');

  const requiredFields = ['openapi', 'info', 'paths'];
  requiredFields.forEach(field => {
    if (!spec[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // ========================================
  // 2. Validate OpenAPI Version
  // ========================================
  console.log('2️⃣  Validating OpenAPI version...');

  if (!spec.openapi) {
    errors.push('Missing openapi version field');
  } else if (!spec.openapi.startsWith('3.0')) {
    errors.push(`Invalid OpenAPI version: ${spec.openapi} (expected 3.0.x)`);
  } else {
    console.log('   ✓ OpenAPI version:', spec.openapi);
  }

  // ========================================
  // 3. Validate Info Object
  // ========================================
  console.log('3️⃣  Validating info object...');

  if (!spec.info) {
    errors.push('Missing info object');
  } else {
    if (!spec.info.title) {
      errors.push('Missing info.title');
    } else {
      console.log('   ✓ Title:', spec.info.title);
    }

    if (!spec.info.version) {
      errors.push('Missing info.version');
    } else {
      console.log('   ✓ Version:', spec.info.version);
    }

    // Optional but recommended fields
    if (!spec.info.description) {
      warnings.push('Missing info.description (recommended)');
    }
  }

  // ========================================
  // 4. Validate Servers
  // ========================================
  console.log('4️⃣  Validating servers...');

  if (!spec.servers || !Array.isArray(spec.servers)) {
    warnings.push('Missing servers array (recommended)');
  } else if (spec.servers.length === 0) {
    warnings.push('Empty servers array (recommended to have at least one)');
  } else {
    spec.servers.forEach((server, index) => {
      if (!server.url) {
        errors.push(`Server ${index}: missing url field`);
      } else {
        console.log(`   ✓ Server ${index}:`, server.url);
      }
    });
  }

  // ========================================
  // 5. Validate Paths
  // ========================================
  console.log('5️⃣  Validating paths...');

  if (!spec.paths) {
    errors.push('Missing paths object');
  } else if (typeof spec.paths !== 'object') {
    errors.push('Paths must be an object');
  } else {
    const pathCount = Object.keys(spec.paths).length;
    console.log(`   ✓ Found ${pathCount} path(s)`);

    Object.entries(spec.paths).forEach(([pathKey, pathItem]) => {
      // Validate path format
      if (!pathKey.startsWith('/')) {
        errors.push(`Path "${pathKey}" must start with /`);
      }

      // Extract path parameters from path
      const pathParams = [];
      const paramRegex = /\{([^}]+)\}/g;
      let match;
      while ((match = paramRegex.exec(pathKey)) !== null) {
        pathParams.push(match[1]);
      }

      // Validate each HTTP method
      const validMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];
      Object.entries(pathItem).forEach(([method, operation]) => {
        if (!validMethods.includes(method)) {
          return; // Skip non-method properties
        }

        const operationId = `${method.toUpperCase()} ${pathKey}`;

        // Validate operation has required fields
        if (!operation.responses) {
          errors.push(`${operationId}: Missing responses object`);
        } else {
          // Validate responses structure
          Object.entries(operation.responses).forEach(([statusCode, response]) => {
            if (!response.description) {
              errors.push(`${operationId}: Response ${statusCode} missing description`);
            }

            // If response has content, validate structure
            if (response.content) {
              if (typeof response.content !== 'object') {
                errors.push(`${operationId}: Response ${statusCode} content must be an object`);
              } else if (Object.keys(response.content).length === 0) {
                errors.push(`${operationId}: Response ${statusCode} content is empty`);
              }
            }
          });
        }

        // Validate operationId is unique and present
        if (!operation.operationId) {
          warnings.push(`${operationId}: Missing operationId (recommended)`);
        }

        // Validate path parameters are defined
        if (pathParams.length > 0) {
          if (!operation.parameters) {
            errors.push(`${operationId}: Path has parameters ${pathParams.join(', ')} but operation.parameters is missing`);
          } else {
            pathParams.forEach(paramName => {
              const param = operation.parameters.find(p => p.name === paramName && p.in === 'path');
              if (!param) {
                errors.push(`${operationId}: Path parameter "${paramName}" not defined in parameters array`);
              } else if (!param.required) {
                errors.push(`${operationId}: Path parameter "${paramName}" must have required: true`);
              } else if (!param.schema) {
                errors.push(`${operationId}: Path parameter "${paramName}" missing schema`);
              }
            });
          }
        }

        // Validate parameters structure
        if (operation.parameters) {
          if (!Array.isArray(operation.parameters)) {
            errors.push(`${operationId}: parameters must be an array`);
          } else {
            operation.parameters.forEach((param, index) => {
              if (!param.name) {
                errors.push(`${operationId}: Parameter ${index} missing name`);
              }
              if (!param.in) {
                errors.push(`${operationId}: Parameter ${index} missing 'in' field`);
              } else if (!['query', 'header', 'path', 'cookie'].includes(param.in)) {
                errors.push(`${operationId}: Parameter ${index} has invalid 'in' value: ${param.in}`);
              }
              if (!param.schema) {
                errors.push(`${operationId}: Parameter ${index} missing schema`);
              }
            });
          }
        }

        // Validate requestBody structure
        if (operation.requestBody) {
          if (!operation.requestBody.content) {
            errors.push(`${operationId}: requestBody missing content`);
          } else if (typeof operation.requestBody.content !== 'object') {
            errors.push(`${operationId}: requestBody.content must be an object`);
          }
        }
      });
    });
  }

  // ========================================
  // 6. Validate Components
  // ========================================
  console.log('6️⃣  Validating components...');

  if (!spec.components) {
    warnings.push('Missing components object (recommended for reusable schemas)');
  } else {
    if (spec.components.schemas) {
      const schemaCount = Object.keys(spec.components.schemas).length;
      console.log(`   ✓ Found ${schemaCount} schema(s)`);

      // Validate each schema
      Object.entries(spec.components.schemas).forEach(([schemaName, schema]) => {
        if (!schema.type && !schema.$ref && !schema.allOf && !schema.anyOf && !schema.oneOf) {
          warnings.push(`Schema "${schemaName}": Missing type or composition keyword`);
        }
      });
    }

    if (spec.components.securitySchemes) {
      const securityCount = Object.keys(spec.components.securitySchemes).length;
      console.log(`   ✓ Found ${securityCount} security scheme(s)`);
    }
  }

  // ========================================
  // 7. Validate Tags
  // ========================================
  console.log('7️⃣  Validating tags...');

  if (!spec.tags) {
    warnings.push('Missing tags array (recommended)');
  } else if (!Array.isArray(spec.tags)) {
    errors.push('Tags must be an array');
  } else {
    console.log(`   ✓ Found ${spec.tags.length} tag(s)`);

    spec.tags.forEach((tag, index) => {
      if (!tag.name) {
        errors.push(`Tag ${index}: missing name`);
      }
    });
  }

  // ========================================
  // Results Summary
  // ========================================
  console.log('');
  console.log('========================================');
  console.log('VALIDATION RESULTS');
  console.log('========================================');

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Perfect! OpenAPI specification is fully compliant with OpenAPI 3.0 standards.');
  } else {
    if (errors.length > 0) {
      console.log('');
      console.log(`❌ ERRORS (${errors.length}):`);
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    if (warnings.length > 0) {
      console.log('');
      console.log(`⚠️  WARNINGS (${warnings.length}):`);
      warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }
  }

  console.log('');
  console.log('========================================');
  console.log('SPECIFICATION SUMMARY');
  console.log('========================================');
  console.log('OpenAPI Version:', spec.openapi);
  console.log('API Title:', spec.info.title);
  console.log('API Version:', spec.info.version);
  console.log('Paths:', Object.keys(spec.paths || {}).length);
  console.log('Tags:', (spec.tags || []).length);
  console.log('Schemas:', Object.keys(spec.components?.schemas || {}).length);
  console.log('');

  // Save the spec to a file for inspection
  const outputFile = path.join(__dirname, '../openapi-spec.json');
  fs.writeFileSync(outputFile, JSON.stringify(spec, null, 2));
  console.log('📄 Full specification saved to:', outputFile);
  console.log('');

  // Exit with appropriate code
  if (errors.length > 0) {
    console.log('❌ Validation failed with errors');
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log('⚠️  Validation passed with warnings');
    process.exit(0);
  } else {
    console.log('✅ Validation passed successfully');
    process.exit(0);
  }

} catch (error) {
  console.error('');
  console.error('❌ Validation failed with exception:');
  console.error(error.message);
  console.error('');
  console.error(error.stack);
  process.exit(1);
}
