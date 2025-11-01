/**
 * MCP (Model Context Protocol) Runtime Compliance Tests
 * Based on scripts/validate-mcp.js
 *
 * Tests MCP implementation with actual runtime requests and responses
 * Based on MCP Specification 2024-11-05
 */

const DynamicAPIMCPServer = require('../src/mcp');

describe('MCP 2024-11-05 Runtime Compliance Tests', () => {
  let mcpServer;
  let errors;
  let warnings;

  beforeAll(() => {
    mcpServer = new DynamicAPIMCPServer();
    errors = [];
    warnings = [];

    // Set up mock routes for testing
    mcpServer.setRoutes([
      {
        method: 'GET',
        path: '/api/test',
        processorInstance: {
          description: 'Test endpoint',
          process: (req, res) => {
            res.json({ success: true, message: 'Test response' });
          }
        }
      },
      {
        method: 'POST',
        path: '/api/users',
        processorInstance: {
          description: 'Create user',
          process: (req, res) => {
            res.json({ success: true, data: { id: 1, name: req.body.name } });
          }
        }
      }
    ]);
  });

  /**
   * Validate JSON-RPC 2.0 response structure
   */
  function validateJSONRPC(response, testName) {
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
      if (typeof response.error.code !== 'number') {
        issues.push('Error must have "code" field with number type');
      }
      if (typeof response.error.message !== 'string') {
        issues.push('Error must have "message" field with string type');
      }
    }

    if (issues.length > 0) {
      errors.push(`${testName}: ${issues.join(', ')}`);
      return false;
    }
    return true;
  }

  describe('1. JSON-RPC 2.0 Compliance', () => {
    test('ping response should follow JSON-RPC 2.0 structure', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'ping'
      };

      const response = await mcpServer.processMCPRequest(request);

      expect(validateJSONRPC(response, 'Ping response')).toBe(true);
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response).toHaveProperty('result');
    });

    test('ping should return correct pong response', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 2,
        method: 'ping'
      };

      const response = await mcpServer.processMCPRequest(request);

      expect(response.result).toHaveProperty('type');
      expect(response.result.type).toBe('pong');
    });
  });

  describe('2. Tools Methods', () => {
    test('tools/list should follow JSON-RPC 2.0 structure', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/list'
      };

      const response = await mcpServer.processMCPRequest(request);

      expect(validateJSONRPC(response, 'tools/list response')).toBe(true);
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(10);
    });

    test('tools/list should return tools array', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/list'
      };

      const response = await mcpServer.processMCPRequest(request);

      expect(response.result).toHaveProperty('tools');
      expect(Array.isArray(response.result.tools)).toBe(true);
    });

    test('tools should have required fields', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 12,
        method: 'tools/list'
      };

      const response = await mcpServer.processMCPRequest(request);
      const tools = response.result.tools;

      if (tools.length > 0) {
        const tool = tools[0];

        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');

        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.inputSchema).toBe('object');
      }
    });

    test('tool inputSchema should be valid JSON Schema', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 13,
        method: 'tools/list'
      };

      const response = await mcpServer.processMCPRequest(request);
      const tools = response.result.tools;

      if (tools.length > 0) {
        const tool = tools[0];
        const schema = tool.inputSchema;

        expect(schema).toHaveProperty('type');
        expect(schema).toHaveProperty('properties');

        if (!schema.type || !schema.properties) {
          warnings.push('inputSchema should have type and properties fields');
        }
      }
    });

    test('tools/call with invalid params should return error', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 14,
        method: 'tools/call',
        params: {}
      };

      const response = await mcpServer.processMCPRequest(request);

      expect(validateJSONRPC(response, 'tools/call invalid params')).toBe(true);
      expect(response).toHaveProperty('error');
      expect(typeof response.error.code).toBe('number');
      expect([-32602, -32603]).toContain(response.error.code);
    });
  });

  describe('3. Prompts Methods', () => {
    test('prompts/list should follow JSON-RPC 2.0 structure', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 20,
        method: 'prompts/list'
      };

      const response = await mcpServer.processMCPRequest(request);

      expect(validateJSONRPC(response, 'prompts/list response')).toBe(true);
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(20);
    });

    test('prompts/list should return prompts array', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 21,
        method: 'prompts/list'
      };

      const response = await mcpServer.processMCPRequest(request);

      expect(response.result).toHaveProperty('prompts');
      expect(Array.isArray(response.result.prompts)).toBe(true);
    });

    test('prompts should have required fields', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 22,
        method: 'prompts/list'
      };

      const response = await mcpServer.processMCPRequest(request);
      const prompts = response.result.prompts;

      if (prompts.length > 0) {
        const prompt = prompts[0];

        expect(prompt).toHaveProperty('name');
        expect(prompt).toHaveProperty('description');

        expect(typeof prompt.name).toBe('string');
        expect(typeof prompt.description).toBe('string');
      }
    });
  });

  describe('4. Resources Methods', () => {
    test('resources/list should follow JSON-RPC 2.0 structure', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 30,
        method: 'resources/list'
      };

      const response = await mcpServer.processMCPRequest(request);

      expect(validateJSONRPC(response, 'resources/list response')).toBe(true);
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(30);
    });

    test('resources/list should return resources array', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 31,
        method: 'resources/list'
      };

      const response = await mcpServer.processMCPRequest(request);

      expect(response.result).toHaveProperty('resources');
      expect(Array.isArray(response.result.resources)).toBe(true);
    });

    test('resources should have required fields', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 32,
        method: 'resources/list'
      };

      const response = await mcpServer.processMCPRequest(request);
      const resources = response.result.resources;

      if (resources.length > 0) {
        const resource = resources[0];

        expect(resource).toHaveProperty('uri');
        expect(resource).toHaveProperty('name');

        expect(typeof resource.uri).toBe('string');
        expect(typeof resource.name).toBe('string');
      }
    });

    test('resource URI should have valid format', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 33,
        method: 'resources/list'
      };

      const response = await mcpServer.processMCPRequest(request);
      const resources = response.result.resources;

      if (resources.length > 0) {
        const resource = resources[0];
        const validSchemes = ['resource://', 'http://', 'https://'];
        const hasValidScheme = validSchemes.some(scheme => resource.uri.startsWith(scheme));

        if (!hasValidScheme) {
          warnings.push('Resource URI should use standard scheme (resource://, http://, https://)');
        }
      }
    });
  });

  describe('5. Error Handling', () => {
    test('invalid method should return error with code -32601', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 40,
        method: 'invalid/method'
      };

      const response = await mcpServer.processMCPRequest(request);

      expect(validateJSONRPC(response, 'Invalid method error')).toBe(true);
      expect(response).toHaveProperty('error');
      expect(response.error.code).toBe(-32601);
      expect(response.error.message).toMatch(/method not found/i);
    });

    test('error responses should have proper structure', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 41,
        method: 'invalid/method'
      };

      const response = await mcpServer.processMCPRequest(request);

      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');
      expect(typeof response.error.code).toBe('number');
      expect(typeof response.error.message).toBe('string');
    });

    test('all error codes should be valid JSON-RPC 2.0 codes', async () => {
      const invalidRequests = [
        { jsonrpc: '2.0', id: 50, method: 'invalid/method' },
        { jsonrpc: '2.0', id: 51, method: 'tools/call', params: {} }
      ];

      for (const request of invalidRequests) {
        const response = await mcpServer.processMCPRequest(request);
        if (response.error) {
          // Valid JSON-RPC 2.0 error codes
          const validCodes = [-32700, -32600, -32601, -32602, -32603];
          const isValidCode = validCodes.includes(response.error.code) ||
                            (response.error.code >= -32099 && response.error.code <= -32000);

          expect(isValidCode).toBe(true);
        }
      }
    });
  });

  describe('6. Protocol Version Consistency', () => {
    test('all responses should use JSON-RPC 2.0', async () => {
      const methods = [
        'ping',
        'tools/list',
        'prompts/list',
        'resources/list'
      ];

      let id = 60;
      for (const method of methods) {
        const request = {
          jsonrpc: '2.0',
          id: id++,
          method
        };

        const response = await mcpServer.processMCPRequest(request);
        expect(response.jsonrpc).toBe('2.0');
      }
    });

    test('all responses should preserve request id', async () => {
      const testIds = [100, 200, 'test-id', 'abc123'];

      for (const testId of testIds) {
        const request = {
          jsonrpc: '2.0',
          id: testId,
          method: 'ping'
        };

        const response = await mcpServer.processMCPRequest(request);
        expect(response.id).toBe(testId);
      }
    });
  });

  describe('7. Response Content Validation', () => {
    test('successful responses should not have error field', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 70,
        method: 'ping'
      };

      const response = await mcpServer.processMCPRequest(request);

      expect(response).toHaveProperty('result');
      expect(response).not.toHaveProperty('error');
    });

    test('error responses should not have result field', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 71,
        method: 'invalid/method'
      };

      const response = await mcpServer.processMCPRequest(request);

      expect(response).toHaveProperty('error');
      expect(response).not.toHaveProperty('result');
    });
  });

  describe('8. Method Implementation Completeness', () => {
    test('all required MCP methods should be implemented', async () => {
      const requiredMethods = [
        'tools/list',
        'tools/call',
        'prompts/list',
        'prompts/get',
        'resources/list',
        'resources/read'
      ];

      let id = 80;
      for (const method of requiredMethods) {
        const request = {
          jsonrpc: '2.0',
          id: id++,
          method,
          params: method.includes('call') ? { name: 'test', arguments: {} } :
                  method.includes('get') ? { name: 'test' } :
                  method.includes('read') ? { uri: 'resource://test' } : {}
        };

        const response = await mcpServer.processMCPRequest(request);

        // Should not return method not found error
        if (response.error) {
          expect(response.error.code).not.toBe(-32601);
        }
      }
    });
  });

  describe('9. Runtime Validation Summary', () => {
    test('should have no critical errors', () => {
      expect(errors).toEqual([]);
    });

    test('should implement all core MCP 2024-11-05 features', async () => {
      // Test core functionality
      const pingResponse = await mcpServer.processMCPRequest({
        jsonrpc: '2.0',
        id: 90,
        method: 'ping'
      });

      const toolsResponse = await mcpServer.processMCPRequest({
        jsonrpc: '2.0',
        id: 91,
        method: 'tools/list'
      });

      const promptsResponse = await mcpServer.processMCPRequest({
        jsonrpc: '2.0',
        id: 92,
        method: 'prompts/list'
      });

      const resourcesResponse = await mcpServer.processMCPRequest({
        jsonrpc: '2.0',
        id: 93,
        method: 'resources/list'
      });

      expect(pingResponse.jsonrpc).toBe('2.0');
      expect(toolsResponse.result).toHaveProperty('tools');
      expect(promptsResponse.result).toHaveProperty('prompts');
      expect(resourcesResponse.result).toHaveProperty('resources');
    });

    test('validation warnings should be informational only', () => {
      if (warnings.length > 0) {
        console.log('\nMCP Runtime Validation Warnings:');
        warnings.forEach((warning, i) => {
          console.log(`  ${i + 1}. ${warning}`);
        });
      }
    });
  });

  afterAll(() => {
    // Summary report
    console.log('\n========================================');
    console.log('MCP Runtime Compliance Test Summary');
    console.log('========================================');
    console.log(`Specification: MCP 2024-11-05`);
    console.log(`Transport:     In-Memory (Direct)`);
    console.log(`Errors:        ${errors.length}`);
    console.log(`Warnings:      ${warnings.length}`);
    console.log(`Status:        ${errors.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('========================================\n');
  });
});
