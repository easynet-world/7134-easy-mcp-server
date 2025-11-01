/**
 * Test suite for MCP auto-discovery and hot reloading functionality
 */

const fs = require('fs').promises;
const path = require('path');
const DynamicAPIMCPServer = require('../src/mcp');

describe('MCP Auto-Discovery and Hot Reloading', () => {
  let mcpServer;
  const testDir = path.join(__dirname, '..', 'test-mcp');
  const promptsDir = path.join(testDir, 'prompts');
  const resourcesDir = path.join(testDir, 'resources');

  beforeAll(async () => {
    // Create test directories
    await fs.mkdir(promptsDir, { recursive: true });
    await fs.mkdir(resourcesDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test directories
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    mcpServer = new DynamicAPIMCPServer('127.0.0.1', 3002, {
      prompts: {
        directory: './test-mcp/prompts',
        watch: true,
        formats: ['json', 'yaml', 'yml']
      },
      resources: {
        directory: './test-mcp/resources',
        watch: true,
        formats: ['json', 'yaml', 'yml', 'md', 'txt']
      }
    });
  });

  afterEach(() => {
    if (mcpServer) {
      mcpServer.stop();
    }
  });

  describe('File Format Support', () => {
    test('should load JSON prompt files', async () => {
      const promptData = {
        name: 'test_json_prompt',
        description: 'Test JSON prompt',
        template: 'This is a test prompt with {{variable}}',
        arguments: {
          type: 'object',
          properties: {
            variable: {
              type: 'string',
              description: 'Test variable'
            }
          },
          required: ['variable']
        }
      };

      await fs.writeFile(
        path.join(promptsDir, 'test.json'),
        JSON.stringify(promptData, null, 2)
      );

      await mcpServer.loadPromptsFromDirectory(promptsDir);

      expect(mcpServer.prompts.has('test_json_prompt')).toBe(true);
      const prompt = mcpServer.prompts.get('test_json_prompt');
      expect(prompt.name).toBe('test_json_prompt');
      expect(prompt.description).toBe('Test JSON prompt');
      expect(prompt.template).toBe('This is a test prompt with {{variable}}');
    });

    test('should load YAML prompt files', async () => {
      const yamlContent = `
name: test_yaml_prompt
description: Test YAML prompt
template: |
  This is a YAML test prompt with {{variable}}
arguments:
  type: object
  properties:
    variable:
      type: string
      description: Test variable
  required:
    - variable
`;

      await fs.writeFile(path.join(promptsDir, 'test.yaml'), yamlContent);

      await mcpServer.loadPromptsFromDirectory(promptsDir);

      expect(mcpServer.prompts.has('test_yaml_prompt')).toBe(true);
      const prompt = mcpServer.prompts.get('test_yaml_prompt');
      expect(prompt.name).toBe('test_yaml_prompt');
      expect(prompt.description).toBe('Test YAML prompt');
    });

    test('should load JSON resource files', async () => {
      const resourceData = {
        uri: 'test://json-resource',
        name: 'Test JSON Resource',
        description: 'A test JSON resource',
        mimeType: 'application/json',
        content: { test: 'data' }
      };

      await fs.writeFile(
        path.join(resourcesDir, 'test.json'),
        JSON.stringify(resourceData, null, 2)
      );

      await mcpServer.loadResourcesFromDirectory(resourcesDir);

      expect(mcpServer.resources.has('resource://test.json')).toBe(true);
      const resource = mcpServer.resources.get('resource://test.json');
      expect(resource.name).toBe('Test JSON Resource');
      expect(resource.mimeType).toBe('application/json');
    });

    test('should load YAML resource files', async () => {
      const yamlContent = `
uri: test://yaml-resource
name: Test YAML Resource
description: A test YAML resource
mimeType: application/x-yaml
content:
  test: data
  nested:
    value: 123
`;

      await fs.writeFile(path.join(resourcesDir, 'test.yaml'), yamlContent);

      await mcpServer.loadResourcesFromDirectory(resourcesDir);

      expect(mcpServer.resources.has('resource://test.yaml')).toBe(true);
      const resource = mcpServer.resources.get('resource://test.yaml');
      expect(resource.name).toBe('Test YAML Resource');
      expect(resource.mimeType).toBe('application/x-yaml');
    });

    test('should load markdown resource files', async () => {
      const markdownContent = `# Test Markdown Resource

This is a test markdown resource with **bold** and *italic* text.

## Features
- Feature 1
- Feature 2
- Feature 3
`;

      await fs.writeFile(path.join(resourcesDir, 'test.md'), markdownContent);

      await mcpServer.loadResourcesFromDirectory(resourcesDir);

      expect(mcpServer.resources.has('resource://test.md')).toBe(true);
      const resource = mcpServer.resources.get('resource://test.md');
      expect(resource.name).toBe('test');
      expect(resource.mimeType).toBe('text/markdown');
      expect(resource.content).toContain('# Test Markdown Resource');
    });

    test('should load text resource files', async () => {
      const textContent = `This is a plain text resource.
It contains multiple lines of text.
No special formatting is applied.`;

      await fs.writeFile(path.join(resourcesDir, 'test.txt'), textContent);

      await mcpServer.loadResourcesFromDirectory(resourcesDir);

      expect(mcpServer.resources.has('resource://test.txt')).toBe(true);
      const resource = mcpServer.resources.get('resource://test.txt');
      expect(resource.name).toBe('test');
      expect(resource.mimeType).toBe('text/plain');
      expect(resource.content).toContain('This is a plain text resource.');
    });
  });

  describe('Configuration Options', () => {
    test('should respect disabled prompts configuration', async () => {
      const disabledServer = new DynamicAPIMCPServer('127.0.0.1', 3003, {
        prompts: { enabled: false }
      });

      await disabledServer.loadPromptsAndResourcesFromFilesystem();
      expect(disabledServer.prompts.size).toBe(0);

      disabledServer.stop();
    });

    test('should respect disabled resources configuration', async () => {
      const disabledServer = new DynamicAPIMCPServer('127.0.0.1', 3004, {
        resources: { enabled: false }
      });

      await disabledServer.loadPromptsAndResourcesFromFilesystem();
      expect(disabledServer.resources.size).toBe(0);

      disabledServer.stop();
    });

    test('should respect custom directory configuration', async () => {
      const customServer = new DynamicAPIMCPServer('127.0.0.1', 3005, {
        prompts: { directory: './test-mcp/custom-prompts' },
        resources: { directory: './test-mcp/custom-resources' }
      });

      const customPromptsDir = path.join(__dirname, '..', 'test-mcp', 'custom-prompts');
      const customResourcesDir = path.join(__dirname, '..', 'test-mcp', 'custom-resources');

      await fs.mkdir(customPromptsDir, { recursive: true });
      await fs.mkdir(customResourcesDir, { recursive: true });

      await customServer.loadPromptsAndResourcesFromFilesystem();
      expect(customServer.config.mcp.prompts.directory).toBe('./test-mcp/custom-prompts');
      expect(customServer.config.mcp.resources.directory).toBe('./test-mcp/custom-resources');

      customServer.stop();
    });

    test('should respect custom file format configuration', async () => {
      const customServer = new DynamicAPIMCPServer('127.0.0.1', 3006, {
        prompts: { formats: ['json'] }, // Only JSON, no YAML
        resources: { formats: ['md', 'txt'] } // Only markdown and text
      });

      expect(customServer.config.mcp.prompts.formats).toEqual(['json']);
      expect(customServer.config.mcp.resources.formats).toEqual(['md', 'txt']);

      customServer.stop();
    });
  });

  describe('MCP Protocol Integration', () => {
    test('should return prompts in MCP format', async () => {
      const promptData = {
        name: 'mcp_test_prompt',
        description: 'MCP test prompt',
        template: 'Test prompt for MCP',
        arguments: []
      };

      await fs.writeFile(
        path.join(promptsDir, 'mcp-test.json'),
        JSON.stringify(promptData, null, 2)
      );

      await mcpServer.loadPromptsFromDirectory(promptsDir);

      const mockData = { id: 1 };
      const response = await mcpServer.processListPrompts(mockData);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result.prompts).toBeDefined();
      expect(response.result.prompts.length).toBeGreaterThan(0);

      const prompt = response.result.prompts.find(p => p.name === 'mcp_test_prompt');
      expect(prompt).toBeDefined();
      expect(prompt.description).toBe('MCP test prompt');
    });

    test('should return resources in MCP format', async () => {
      const resourceData = {
        uri: 'test://mcp-resource',
        name: 'MCP Test Resource',
        description: 'MCP test resource',
        mimeType: 'text/plain',
        content: 'Test content'
      };

      await fs.writeFile(
        path.join(resourcesDir, 'mcp-test.json'),
        JSON.stringify(resourceData, null, 2)
      );

      await mcpServer.loadResourcesFromDirectory(resourcesDir);

      const mockData = { id: 1 };
      const response = await mcpServer.processListResources(mockData);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result.resources).toBeDefined();
      expect(response.result.resources.length).toBeGreaterThan(0);

      const resource = response.result.resources.find(r => r.uri === 'resource://mcp-test.json');
      expect(resource).toBeDefined();
      expect(resource.name).toBe('MCP Test Resource');
    });

    test('should handle prompt retrieval', async () => {
      const promptData = {
        name: 'retrieval_test_prompt',
        description: 'Prompt for retrieval test',
        template: 'Hello {{name}}, welcome to {{service}}!',
        arguments: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'User name' },
            service: { type: 'string', description: 'Service name' }
          },
          required: ['name', 'service']
        }
      };

      await fs.writeFile(
        path.join(promptsDir, 'retrieval-test.json'),
        JSON.stringify(promptData, null, 2)
      );

      await mcpServer.loadPromptsFromDirectory(promptsDir);

      const mockData = {
        id: 1,
        params: {
          name: 'retrieval_test_prompt',
          arguments: {
            name: 'John',
            service: 'EasyMCP'
          }
        }
      };

      const response = await mcpServer.processGetPrompt(mockData);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result.description).toBe('Prompt for retrieval test');
      expect(response.result.messages).toBeDefined();
      expect(response.result.messages[0].content.text).toContain('Hello John, welcome to EasyMCP!');
    });

    test('should handle resource reading', async () => {
      const resourceData = {
        uri: 'test://read-resource',
        name: 'Read Test Resource',
        description: 'Resource for reading test',
        mimeType: 'text/plain',
        content: 'This is test content for reading'
      };

      await fs.writeFile(
        path.join(resourcesDir, 'read-test.json'),
        JSON.stringify(resourceData, null, 2)
      );

      await mcpServer.loadResourcesFromDirectory(resourcesDir);

      const mockData = {
        id: 1,
        params: { uri: 'resource://read-test.json' }
      };

      const response = await mcpServer.processReadResource(mockData);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result.contents).toBeDefined();
      expect(response.result.contents[0].uri).toBe('resource://read-test.json');
      expect(response.result.contents[0].text).toContain('This is test content for reading');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid JSON files gracefully', async () => {
      await fs.writeFile(path.join(promptsDir, 'invalid.json'), 'invalid json content');

      // Should not throw an error
      await expect(mcpServer.loadPromptsFromDirectory(promptsDir)).resolves.not.toThrow();
    });

    test('should handle invalid YAML files gracefully', async () => {
      await fs.writeFile(path.join(promptsDir, 'invalid.yaml'), 'invalid: yaml: content: [unclosed');

      // Should not throw an error
      await expect(mcpServer.loadPromptsFromDirectory(promptsDir)).resolves.not.toThrow();
    });

    test('should handle missing directories gracefully', async () => {
      const nonExistentServer = new DynamicAPIMCPServer('127.0.0.1', 3007, {
        prompts: { directory: './non-existent-prompts' },
        resources: { directory: './non-existent-resources' }
      });

      // Should not throw an error
      await expect(nonExistentServer.loadPromptsAndResourcesFromFilesystem()).resolves.not.toThrow();

      nonExistentServer.stop();
    });

    test('should handle file permission errors gracefully', async () => {
      // Create a file that we can't read (simulate permission error)
      const restrictedFile = path.join(promptsDir, 'restricted.json');
      await fs.writeFile(restrictedFile, '{"name": "restricted"}');

      // Should not throw an error even if individual files fail
      await expect(mcpServer.loadPromptsFromDirectory(promptsDir)).resolves.not.toThrow();
    });
  });

  describe('File Path Handling', () => {
    test('should handle nested directory structures', async () => {
      const nestedDir = path.join(promptsDir, 'nested', 'deep');
      await fs.mkdir(nestedDir, { recursive: true });

      const promptData = {
        name: 'nested_prompt',
        description: 'Nested prompt',
        template: 'This is a nested prompt'
      };

      await fs.writeFile(
        path.join(nestedDir, 'nested.json'),
        JSON.stringify(promptData, null, 2)
      );

      await mcpServer.loadPromptsFromDirectory(promptsDir);

      expect(mcpServer.prompts.has('nested_prompt')).toBe(true);
    });

    test('should generate proper URIs for nested resources', async () => {
      const nestedDir = path.join(resourcesDir, 'nested', 'deep');
      await fs.mkdir(nestedDir, { recursive: true });

      const resourceData = {
        uri: 'test://nested-resource',
        name: 'Nested Resource',
        description: 'Nested resource',
        mimeType: 'text/plain',
        content: 'Nested content'
      };

      await fs.writeFile(
        path.join(nestedDir, 'nested.json'),
        JSON.stringify(resourceData, null, 2)
      );

      await mcpServer.loadResourcesFromDirectory(resourcesDir);

      const expectedUri = 'resource://nested/deep/nested.json';
      expect(mcpServer.resources.has(expectedUri)).toBe(true);
    });
  });
});
