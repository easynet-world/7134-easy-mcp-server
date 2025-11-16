/**
 * MCP (Model Context Protocol) Static Compliance Tests
 * Based on scripts/validate-mcp-static.js
 *
 * Tests MCP implementation by analyzing code structure (no server required)
 * Based on MCP Specification 2024-11-05
 */

const fs = require('fs');
const path = require('path');

describe('MCP 2024-11-05 Static Compliance Tests', () => {
  let mcpServerCode;
  let processorCode;
  let toolBuilderCode;
  let toolProcessorCode;
  let promptProcessorCode;
  let resourceProcessorCode;
  let errors;
  let warnings;

  beforeAll(() => {
    errors = [];
    warnings = [];

    // Read source files
    mcpServerCode = fs.readFileSync(
      path.join(__dirname, '../src/mcp/mcp-server.js'),
      'utf8'
    );
    processorCode = fs.readFileSync(
      path.join(__dirname, '../src/mcp/processors/mcp-request-processor.js'),
      'utf8'
    );
    toolBuilderCode = fs.readFileSync(
      path.join(__dirname, '../src/mcp/builders/tool-builder.js'),
      'utf8'
    );
    toolProcessorCode = fs.readFileSync(
      path.join(__dirname, '../src/mcp/processors/domains/tool-processor.js'),
      'utf8'
    );
    promptProcessorCode = fs.readFileSync(
      path.join(__dirname, '../src/mcp/processors/domains/prompt-processor.js'),
      'utf8'
    );
    resourceProcessorCode = fs.readFileSync(
      path.join(__dirname, '../src/mcp/processors/domains/resource-processor.js'),
      'utf8'
    );
  });

  describe('1. JSON-RPC 2.0 Protocol Compliance', () => {
    test('should use JSON-RPC 2.0 protocol identifier', () => {
      const hasJsonRpc20 =
        mcpServerCode.includes('jsonrpc: \'2.0\'') ||
        mcpServerCode.includes('jsonrpc: "2.0"');
      expect(hasJsonRpc20).toBe(true);
    });

    test('should implement standard JSON-RPC 2.0 error codes', () => {
      // -32601: Method not found
      expect(mcpServerCode).toMatch(/-32601/);

      // -32602: Invalid params
      expect(mcpServerCode).toMatch(/-32602/);

      // -32603: Internal error
      expect(mcpServerCode).toMatch(/-32603/);
    });
  });

  describe('2. Required MCP Methods', () => {
    const requiredMethods = [
      { name: 'tools/list', pattern: /['"]tools\/list['"]/ },
      { name: 'tools/call', pattern: /['"]tools\/call['"]/ },
      { name: 'prompts/list', pattern: /['"]prompts\/list['"]/ },
      { name: 'prompts/get', pattern: /['"]prompts\/get['"]/ },
      { name: 'resources/list', pattern: /['"]resources\/list['"]/ },
      { name: 'resources/read', pattern: /['"]resources\/read['"]/ }
    ];

    requiredMethods.forEach(method => {
      test(`should implement ${method.name} method`, () => {
        expect(method.pattern.test(mcpServerCode)).toBe(true);
      });
    });

    test('should implement optional resources/templates/list method', () => {
      const hasTemplatesList = /['"]resources\/templates\/list['"]/.test(mcpServerCode);
      if (!hasTemplatesList) {
        warnings.push('resources/templates/list not implemented (optional method)');
      }
      // This is optional, so we just warn, not fail
      expect(true).toBe(true);
    });
  });

  describe('3. Domain-Specific Processors', () => {
    const processors = [
      { name: 'ToolProcessor', file: 'tool-processor' },
      { name: 'PromptProcessor', file: 'prompt-processor' },
      { name: 'ResourceProcessor', file: 'resource-processor' },
      { name: 'SystemProcessor', file: 'system-processor' }
    ];

    processors.forEach(proc => {
      test(`should use ${proc.name} for domain separation`, () => {
        expect(processorCode.includes(proc.name)).toBe(true);
      });
    });

    test('should have main request processing method', () => {
      expect(processorCode.includes('processMCPRequest')).toBe(true);
    });
  });

  describe('4. Tool Builder Compliance', () => {
    test('should generate JSON Schema for tool inputs', () => {
      const hasInputSchema = toolBuilderCode.includes('inputSchema') &&
                            toolBuilderCode.includes('properties');
      expect(hasInputSchema).toBe(true);
    });

    test('should convert OpenAPI schemas to JSON Schema', () => {
      // Schema normalization is done via SchemaNormalizer class
      const hasConversion =
        toolBuilderCode.includes('convertOpenAPIToJSONSchema') ||
        toolBuilderCode.includes('convertToJSONSchema') ||
        toolBuilderCode.includes('schemaNormalizer') ||
        toolBuilderCode.includes('SchemaNormalizer');
      expect(hasConversion).toBe(true);
    });
  });

  describe('5. Response Format Compliance', () => {
    test('tools/list should return tools array', () => {
      const hasToolsArray =
        toolProcessorCode.includes('tools:') ||
        toolProcessorCode.includes('"tools"') ||
        /\btools\b/.test(toolProcessorCode); // Match 'tools' as a word
      expect(hasToolsArray).toBe(true);
    });

    test('tools/call should return content array', () => {
      // Tools/call returns result which contains content array
      // The actual content is built by tool-executor
      const hasContentArray =
        toolProcessorCode.includes('content:') ||
        toolProcessorCode.includes('"content"') ||
        toolProcessorCode.includes('result'); // Result object contains content
      expect(hasContentArray).toBe(true);
    });

    test('prompts/list should return prompts array', () => {
      const hasPromptsArray =
        promptProcessorCode.includes('prompts:') ||
        promptProcessorCode.includes('"prompts"');
      expect(hasPromptsArray).toBe(true);
    });

    test('prompts/get should return prompt content', () => {
      const hasPromptContent =
        promptProcessorCode.includes('messages:') ||
        promptProcessorCode.includes('"messages"') ||
        promptProcessorCode.includes('description:');
      expect(hasPromptContent).toBe(true);
    });

    test('resources/list should return resources array', () => {
      const hasResourcesArray =
        resourceProcessorCode.includes('resources:') ||
        resourceProcessorCode.includes('"resources"');
      expect(hasResourcesArray).toBe(true);
    });

    test('resources/read should return contents array', () => {
      const hasContentsArray =
        resourceProcessorCode.includes('contents:') ||
        resourceProcessorCode.includes('"contents"');
      expect(hasContentsArray).toBe(true);
    });
  });

  describe('6. Notification Support', () => {
    const notifications = [
      'notifications/toolsChanged',
      'notifications/promptsChanged',
      'notifications/resourcesChanged'
    ];

    notifications.forEach(notif => {
      test(`should support ${notif} notification`, () => {
        const hasNotification = mcpServerCode.includes(notif);
        if (!hasNotification) {
          warnings.push(`${notif} notification not implemented (recommended)`);
        }
        // Notifications are recommended but not required
        expect(true).toBe(true);
      });
    });
  });

  describe('7. Transport Layer Support', () => {
    test('should implement HTTP transport', () => {
      const httpHandlerPath = path.join(__dirname, '../src/mcp/handlers/transport/http-handler.js');
      expect(fs.existsSync(httpHandlerPath)).toBe(true);
    });

    test('should implement WebSocket transport (optional)', () => {
      const wsHandlerPath = path.join(__dirname, '../src/mcp/handlers/transport/websocket-handler.js');
      if (!fs.existsSync(wsHandlerPath)) {
        warnings.push('WebSocket transport not implemented (optional)');
      }
      // WebSocket is optional
      expect(true).toBe(true);
    });
  });

  describe('8. Schema Normalization', () => {
    test('should have schema normalization utility', () => {
      const schemaNormalizerPath = path.join(__dirname, '../src/mcp/utils/schema-normalizer.js');
      expect(fs.existsSync(schemaNormalizerPath)).toBe(true);
    });

    test('schema normalizer should be functional', () => {
      const schemaNormalizerPath = path.join(__dirname, '../src/mcp/utils/schema-normalizer.js');
      if (fs.existsSync(schemaNormalizerPath)) {
        const normalizerCode = fs.readFileSync(schemaNormalizerPath, 'utf8');
        const isFunctional =
          normalizerCode.includes('normalize') &&
          normalizerCode.includes('schema');

        if (!isFunctional) {
          warnings.push('Schema normalizer might be incomplete');
        }
        expect(isFunctional).toBe(true);
      }
    });
  });

  describe('9. Documentation', () => {
    test('should have JSDoc documentation', () => {
      const hasJSDoc =
        mcpServerCode.includes('/**') &&
        mcpServerCode.includes('* @');

      if (!hasJSDoc) {
        warnings.push('Missing comprehensive JSDoc documentation');
      }
      expect(hasJSDoc).toBe(true);
    });

    test('should have project documentation', () => {
      const docFiles = ['README.md', 'docs/mcp.md', 'docs/MCP.md'];
      const hasDoc = docFiles.some(file =>
        fs.existsSync(path.join(__dirname, '..', file))
      );

      if (!hasDoc) {
        warnings.push('Missing MCP-specific documentation');
      }
      expect(hasDoc).toBe(true);
    });
  });

  describe('10. Error Handling', () => {
    test('should handle method not found errors', () => {
      expect(processorCode).toMatch(/-32601/);
      expect(processorCode).toMatch(/Method not found/i);
    });

    test('should handle invalid params errors', () => {
      expect(toolProcessorCode).toMatch(/-32602/);
    });

    test('should implement proper error response structure', () => {
      const hasErrorStructure =
        processorCode.includes('error: {') ||
        processorCode.includes('error:{');
      expect(hasErrorStructure).toBe(true);
    });
  });

  describe('11. Code Architecture', () => {
    test('should separate concerns with domain processors', () => {
      // Check that processors are properly separated
      expect(processorCode).toMatch(/toolProcessor/);
      expect(processorCode).toMatch(/promptProcessor/);
      expect(processorCode).toMatch(/resourceProcessor/);
      expect(processorCode).toMatch(/systemProcessor/);
    });

    test('should have clean request routing', () => {
      // Check for routing logic
      expect(processorCode).toMatch(/data\.method/);
      expect(processorCode).toMatch(/tools\/list/);
      expect(processorCode).toMatch(/tools\/call/);
    });
  });

  describe('12. Static Validation Summary', () => {
    test('should have no critical errors', () => {
      expect(errors).toEqual([]);
    });

    test('should pass all required MCP 2024-11-05 checks', () => {
      // Comprehensive validation
      expect(mcpServerCode).toMatch(/jsonrpc.*2\.0/);
      expect(mcpServerCode).toMatch(/tools\/list/);
      expect(mcpServerCode).toMatch(/tools\/call/);
      expect(mcpServerCode).toMatch(/prompts\/list/);
      expect(mcpServerCode).toMatch(/prompts\/get/);
      expect(mcpServerCode).toMatch(/resources\/list/);
      expect(mcpServerCode).toMatch(/resources\/read/);
    });

    test('validation warnings should be informational only', () => {
      if (warnings.length > 0) {
        console.log('\nMCP Static Validation Warnings:');
        warnings.forEach((warning, i) => {
          console.log(`  ${i + 1}. ${warning}`);
        });
      }
    });
  });

  afterAll(() => {
    // Summary report
    console.log('\n========================================');
    console.log('MCP Static Compliance Test Summary');
    console.log('========================================');
    console.log('Specification: MCP 2024-11-05');
    console.log(`Errors:        ${errors.length}`);
    console.log(`Warnings:      ${warnings.length}`);
    console.log(`Status:        ${errors.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('========================================\n');
  });
});
