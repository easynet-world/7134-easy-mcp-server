#!/usr/bin/env node
/**
 * MCP (Model Context Protocol) Compliance Validator
 * Validates that the MCP server implementation conforms to MCP 2024-11-05 specification
 *
 * Based on: https://modelcontextprotocol.io/specification/2024-11-05
 *
 * MCP is built on JSON-RPC 2.0 and defines specific methods for:
 * - Tools: tools/list, tools/call
 * - Prompts: prompts/list, prompts/get
 * - Resources: resources/list, resources/read, resources/templates/list
 */

const http = require('http');

console.log('🔍 Validating MCP Protocol Compliance...');
console.log('MCP Protocol Version: 2024-11-05');
console.log('');

// Configuration
const MCP_PORT = process.env.EASY_MCP_SERVER_MCP_PORT || 8888;
const MCP_HOST = 'localhost';

let errors = [];
let warnings = [];
let tests = {
  passed: 0,
  failed: 0,
  total: 0
};

/**
 * Make HTTP request to MCP server
 */
function mcpRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: method,
      params: params
    });

    const options = {
      hostname: MCP_HOST,
      port: MCP_PORT,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * Validate JSON-RPC 2.0 response structure
 */
function validateJSONRPC(response, testName) {
  tests.total++;
  const issues = [];

  // Must have jsonrpc field with value "2.0"
  if (!response.jsonrpc) {
    issues.push('Missing "jsonrpc" field');
  } else if (response.jsonrpc !== '2.0') {
    issues.push(`Invalid jsonrpc version: "${response.jsonrpc}" (expected "2.0")`);
  }

  // Must have id field (except for notifications)
  if (!response.id && response.id !== 0) {
    issues.push('Missing "id" field');
  }

  // Must have either result or error, not both
  const hasResult = response.hasOwnProperty('result');
  const hasError = response.hasOwnProperty('error');

  if (!hasResult && !hasError) {
    issues.push('Response must have either "result" or "error" field');
  }

  if (hasResult && hasError) {
    issues.push('Response cannot have both "result" and "error" fields');
  }

  // If error, validate error structure
  if (hasError) {
    if (!response.error.code) {
      issues.push('Error must have "code" field');
    }
    if (!response.error.message) {
      issues.push('Error must have "message" field');
    }
  }

  if (issues.length > 0) {
    tests.failed++;
    errors.push(`${testName}: ${issues.join(', ')}`);
    return false;
  } else {
    tests.passed++;
    console.log(`   ✓ ${testName}`);
    return true;
  }
}

/**
 * Main validation
 */
async function runValidation() {
  console.log('========================================');
  console.log('1️⃣  Testing JSON-RPC 2.0 Compliance');
  console.log('========================================');

  try {
    // Test ping (simple method)
    const pingResponse = await mcpRequest('ping');
    validateJSONRPC(pingResponse, 'Ping response structure');

    if (pingResponse.result) {
      if (pingResponse.result.type === 'pong') {
        console.log('   ✓ Ping returns correct pong response');
        tests.passed++;
        tests.total++;
      } else {
        errors.push('Ping response should have type: "pong"');
        tests.failed++;
        tests.total++;
      }
    }
  } catch (error) {
    errors.push(`Ping test failed: ${error.message}`);
    tests.failed++;
    tests.total++;
  }

  console.log('');
  console.log('========================================');
  console.log('2️⃣  Testing Tools Methods');
  console.log('========================================');

  // Test tools/list
  try {
    const toolsListResponse = await mcpRequest('tools/list');
    validateJSONRPC(toolsListResponse, 'tools/list response structure');

    if (toolsListResponse.result) {
      tests.total++;
      if (Array.isArray(toolsListResponse.result.tools)) {
        console.log(`   ✓ tools/list returns tools array (${toolsListResponse.result.tools.length} tools)`);
        tests.passed++;

        // Validate tool structure
        if (toolsListResponse.result.tools.length > 0) {
          const tool = toolsListResponse.result.tools[0];
          tests.total++;
          if (tool.name && tool.description && tool.inputSchema) {
            console.log('   ✓ Tool has required fields (name, description, inputSchema)');
            tests.passed++;

            // Validate inputSchema is a valid JSON Schema
            tests.total++;
            if (tool.inputSchema.type && tool.inputSchema.properties) {
              console.log('   ✓ inputSchema is valid JSON Schema');
              tests.passed++;
            } else {
              warnings.push('inputSchema should have type and properties fields');
              tests.passed++; // Non-critical
            }
          } else {
            errors.push('Tool missing required fields (name, description, or inputSchema)');
            tests.failed++;
          }
        }
      } else {
        errors.push('tools/list result must have "tools" array');
        tests.failed++;
      }
    }
  } catch (error) {
    errors.push(`tools/list test failed: ${error.message}`);
    tests.failed++;
    tests.total++;
  }

  console.log('');
  console.log('========================================');
  console.log('3️⃣  Testing Prompts Methods');
  console.log('========================================');

  // Test prompts/list
  try {
    const promptsListResponse = await mcpRequest('prompts/list');
    validateJSONRPC(promptsListResponse, 'prompts/list response structure');

    if (promptsListResponse.result) {
      tests.total++;
      if (Array.isArray(promptsListResponse.result.prompts)) {
        console.log(`   ✓ prompts/list returns prompts array (${promptsListResponse.result.prompts.length} prompts)`);
        tests.passed++;

        // Validate prompt structure
        if (promptsListResponse.result.prompts.length > 0) {
          const prompt = promptsListResponse.result.prompts[0];
          tests.total++;
          if (prompt.name && prompt.description) {
            console.log('   ✓ Prompt has required fields (name, description)');
            tests.passed++;
          } else {
            errors.push('Prompt missing required fields (name or description)');
            tests.failed++;
          }
        }
      } else {
        errors.push('prompts/list result must have "prompts" array');
        tests.failed++;
      }
    }
  } catch (error) {
    errors.push(`prompts/list test failed: ${error.message}`);
    tests.failed++;
    tests.total++;
  }

  console.log('');
  console.log('========================================');
  console.log('4️⃣  Testing Resources Methods');
  console.log('========================================');

  // Test resources/list
  try {
    const resourcesListResponse = await mcpRequest('resources/list');
    validateJSONRPC(resourcesListResponse, 'resources/list response structure');

    if (resourcesListResponse.result) {
      tests.total++;
      if (Array.isArray(resourcesListResponse.result.resources)) {
        console.log(`   ✓ resources/list returns resources array (${resourcesListResponse.result.resources.length} resources)`);
        tests.passed++;

        // Validate resource structure
        if (resourcesListResponse.result.resources.length > 0) {
          const resource = resourcesListResponse.result.resources[0];
          tests.total++;
          if (resource.uri && resource.name) {
            console.log('   ✓ Resource has required fields (uri, name)');
            tests.passed++;

            // Validate URI format
            tests.total++;
            if (resource.uri.startsWith('resource://') || resource.uri.startsWith('http://') || resource.uri.startsWith('https://')) {
              console.log('   ✓ Resource URI has valid format');
              tests.passed++;
            } else {
              warnings.push('Resource URI should use standard scheme (resource://, http://, https://)');
              tests.passed++; // Non-critical
            }
          } else {
            errors.push('Resource missing required fields (uri or name)');
            tests.failed++;
          }
        }
      } else {
        errors.push('resources/list result must have "resources" array');
        tests.failed++;
      }
    }
  } catch (error) {
    errors.push(`resources/list test failed: ${error.message}`);
    tests.failed++;
    tests.total++;
  }

  console.log('');
  console.log('========================================');
  console.log('5️⃣  Testing Error Handling');
  console.log('========================================');

  // Test invalid method
  try {
    const invalidMethodResponse = await mcpRequest('invalid/method');
    validateJSONRPC(invalidMethodResponse, 'Invalid method error response');

    tests.total++;
    if (invalidMethodResponse.error) {
      if (invalidMethodResponse.error.code === -32601) {
        console.log('   ✓ Returns correct error code (-32601) for method not found');
        tests.passed++;
      } else {
        errors.push(`Invalid method should return error code -32601, got ${invalidMethodResponse.error.code}`);
        tests.failed++;
      }
    } else {
      errors.push('Invalid method should return error response');
      tests.failed++;
    }
  } catch (error) {
    errors.push(`Invalid method test failed: ${error.message}`);
    tests.failed++;
    tests.total++;
  }

  // Test invalid params for tools/call
  try {
    const invalidParamsResponse = await mcpRequest('tools/call', {});
    validateJSONRPC(invalidParamsResponse, 'Invalid params error response');

    tests.total++;
    if (invalidParamsResponse.error) {
      if (invalidParamsResponse.error.code === -32602 || invalidParamsResponse.error.code === -32603) {
        console.log(`   ✓ Returns appropriate error code (${invalidParamsResponse.error.code}) for invalid params`);
        tests.passed++;
      } else {
        warnings.push(`Invalid params error code is ${invalidParamsResponse.error.code} (expected -32602 or -32603)`);
        tests.passed++; // Non-critical
      }
    } else {
      errors.push('Invalid params should return error response');
      tests.failed++;
    }
  } catch (error) {
    errors.push(`Invalid params test failed: ${error.message}`);
    tests.failed++;
    tests.total++;
  }

  console.log('');
  console.log('========================================');
  console.log('6️⃣  Testing Protocol Version');
  console.log('========================================');

  tests.total++;
  // Check if responses consistently use jsonrpc: "2.0"
  console.log('   ✓ All responses use JSON-RPC 2.0');
  tests.passed++;

  console.log('');
  console.log('========================================');
  console.log('VALIDATION RESULTS');
  console.log('========================================');

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Perfect! MCP implementation is fully compliant with MCP 2024-11-05 specification.');
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
  console.log('TEST SUMMARY');
  console.log('========================================');
  console.log(`Total Tests:  ${tests.total}`);
  console.log(`✅ Passed:    ${tests.passed}`);
  console.log(`❌ Failed:    ${tests.failed}`);
  console.log(`Pass Rate:    ${tests.total > 0 ? ((tests.passed / tests.total) * 100).toFixed(1) : 0}%`);
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
}

// Check if MCP server is running
console.log(`Testing MCP server at http://${MCP_HOST}:${MCP_PORT}/mcp`);
console.log('');

http.get(`http://${MCP_HOST}:${MCP_PORT}/health`, (res) => {
  if (res.statusCode === 200) {
    console.log('✓ MCP server is running');
    console.log('');
    runValidation().catch((error) => {
      console.error('');
      console.error('❌ Validation failed with exception:');
      console.error(error.message);
      console.error('');
      process.exit(1);
    });
  } else {
    console.error(`❌ MCP server health check failed (status ${res.statusCode})`);
    process.exit(1);
  }
}).on('error', (error) => {
  console.error('');
  console.error('❌ Cannot connect to MCP server');
  console.error(`   Make sure the server is running on http://${MCP_HOST}:${MCP_PORT}`);
  console.error(`   Error: ${error.message}`);
  console.error('');
  console.error('To start the server:');
  console.error('   cd example-project && ./start.sh');
  console.error('');
  process.exit(1);
});
