/**
 * Tests for MCP server custom resources and prompts display
 * Ensures user-added resources and prompts are properly shown in MCP interface
 */

const DynamicAPIMCPServer = require('../src/mcp/mcp-server');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('MCP Server Custom Resources and Prompts Display', () => {
  let server;
  let tempDir;
  let promptsDir;
  let resourcesDir;

  beforeEach(async () => {
    // Create temporary directories
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-custom-test-'));
    promptsDir = path.join(tempDir, 'prompts');
    resourcesDir = path.join(tempDir, 'resources');
    
    await fs.mkdir(promptsDir, { recursive: true });
    await fs.mkdir(resourcesDir, { recursive: true });

    // Create server with enhanced configuration
    server = new DynamicAPIMCPServer('127.0.0.1', 0, {
      prompts: {
        enabled: true,
        directory: promptsDir,
        watch: false,
        formats: ['*'],
        enableTemplates: true
      },
      resources: {
        enabled: true,
        directory: resourcesDir,
        watch: false,
        formats: ['*'],
        enableTemplates: true
      }
    });
  });

  afterEach(async () => {
    if (server) {
      server.stop();
    }
    // Clean up temporary directory
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Custom Resources Display', () => {
    test('should display custom resources in MCP interface', async () => {
      // Create custom resource files
      await fs.writeFile(path.join(resourcesDir, 'custom-config.json'), JSON.stringify({
        name: 'Custom API Configuration',
        description: 'User-defined API configuration settings',
        version: '1.0.0',
        endpoints: ['/api/users', '/api/products']
      }, null, 2));

      await fs.writeFile(path.join(resourcesDir, 'user-guide.md'), `# User Guide

This is a custom user guide with template parameters.

## Configuration
- Service: {{service_name}}
- Port: {{port}}
- Environment: {{environment}}

## Features
- Feature 1: {{feature1}}
- Feature 2: {{feature2}}
`);

      await fs.writeFile(path.join(resourcesDir, 'api-schema.yaml'), `name: "Custom API Schema"
description: "User-defined API schema"
version: "2.0.0"
paths:
  /users:
    get:
      summary: "Get users"
      parameters:
        - name: "{{param1}}"
          in: "query"
          required: true
        - name: "{{param2}}"
          in: "query"
          required: false
`);

      // Load resources
      await server.loadResourcesFromDirectory(resourcesDir);

      // Test resources/list
      const listResponse = await server.processListResources({ id: 1 });
      expect(listResponse.jsonrpc).toBe('2.0');
      // Check that our custom resources are present (there may be additional existing resources)
      expect(listResponse.result.resources.length).toBeGreaterThanOrEqual(3);

      const resources = listResponse.result.resources;
      
      // Check custom-config.json
      const configResource = resources.find(r => r.uri === 'resource://custom-config.json');
      expect(configResource).toBeDefined();
      expect(configResource.name).toBe('Custom API Configuration');
      expect(configResource.description).toBe('User-defined API configuration settings');
      expect(configResource.mimeType).toBe('application/json');

      // Check user-guide.md
      const guideResource = resources.find(r => r.uri === 'resource://user-guide.md');
      expect(guideResource).toBeDefined();
      expect(guideResource.name).toBe('user-guide');
      expect(guideResource.mimeType).toBe('text/markdown');

      // Check api-schema.yaml
      const schemaResource = resources.find(r => r.uri === 'resource://api-schema.yaml');
      expect(schemaResource).toBeDefined();
      expect(schemaResource.name).toBe('Custom API Schema');
      expect(schemaResource.mimeType).toBe('application/x-yaml');
    });

    test('should display custom resources with template parameters', async () => {
      // Create resource with template parameters
      await fs.writeFile(path.join(resourcesDir, 'template-config.json'), JSON.stringify({
        name: '{{service_name}} Configuration',
        description: 'Configuration for {{service_name}} service',
        port: '{{port}}',
        environment: '{{environment}}',
        features: ['{{feature1}}', '{{feature2}}']
      }, null, 2));

      await server.loadResourcesFromDirectory(resourcesDir);

      // Test resources/list
      const listResponse = await server.processListResources({ id: 1 });
      const resources = listResponse.result.resources;
      
      const templateResource = resources.find(r => r.uri === 'resource://template-config.json');
      expect(templateResource).toBeDefined();
      expect(templateResource.name).toBe('{{service_name}} Configuration');
      expect(templateResource.description).toBe('Configuration for {{service_name}} service');
    });

    test('should read custom resources with template substitution', async () => {
      // Create resource with template parameters
      await fs.writeFile(path.join(resourcesDir, 'template-config.json'), JSON.stringify({
        name: '{{service_name}} Configuration',
        description: 'Configuration for {{service_name}} service',
        port: '{{port}}',
        environment: '{{environment}}',
        features: ['{{feature1}}', '{{feature2}}']
      }, null, 2));

      await server.loadResourcesFromDirectory(resourcesDir);

      // Test resources/read with template substitution
      const readResponse = await server.processReadResource({
        id: 1,
        params: {
          uri: 'resource://template-config.json',
          arguments: {
            service_name: 'MyAPI',
            port: '8887',
            environment: 'production',
            feature1: 'authentication',
            feature2: 'caching'
          }
        }
      });

      expect(readResponse.jsonrpc).toBe('2.0');
      expect(readResponse.result.contents).toHaveLength(1);
      
      const content = readResponse.result.contents[0];
      expect(content.uri).toBe('resource://template-config.json');
      expect(content.mimeType).toBe('application/json');
      
      // Parse the processed content to verify template substitution
      const processedData = JSON.parse(content.text);
      expect(processedData.name).toBe('MyAPI Configuration');
      expect(processedData.description).toBe('Configuration for MyAPI service');
      expect(processedData.port).toBe('8887');
      expect(processedData.environment).toBe('production');
      expect(processedData.features).toEqual(['authentication', 'caching']);
    });
  });

  describe('Custom Prompts Display', () => {
    test('should display custom prompts in MCP interface', async () => {
      // Create custom prompt files
      await fs.writeFile(path.join(promptsDir, 'custom-prompt.json'), JSON.stringify({
        name: 'custom_api_prompt',
        description: 'Custom prompt for API operations',
        instructions: 'You are a helpful API assistant. Use the following parameters: {{operation}} and {{endpoint}}',
        arguments: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              description: 'The API operation to perform'
            },
            endpoint: {
              type: 'string',
              description: 'The API endpoint to call'
            }
          },
          required: ['operation', 'endpoint']
        }
      }, null, 2));

      await fs.writeFile(path.join(promptsDir, 'user-guide-prompt.md'), `# User Guide Prompt

This is a custom prompt for generating user guides.

## Instructions
Generate a user guide for {{product_name}} with the following features:
- {{feature1}}
- {{feature2}}
- {{feature3}}

## Requirements
- Target audience: {{audience}}
- Length: {{length}}
- Style: {{style}}
`);

      await fs.writeFile(path.join(promptsDir, 'api-documentation-prompt.yaml'), `name: "api_documentation_prompt"
description: "Custom prompt for API documentation generation"
instructions: |
  Generate comprehensive API documentation for {{api_name}}.
  
  Include the following sections:
  - Overview
  - Authentication
  - Endpoints
  - Examples
  
  Use {{format}} format and target {{audience}} audience.
arguments:
  type: object
  properties:
    api_name:
      type: string
      description: "Name of the API"
    format:
      type: string
      description: "Documentation format (markdown, html, pdf)"
    audience:
      type: string
      description: "Target audience (developers, users, admins)"
  required: ["api_name", "format", "audience"]
`);

      // Load prompts
      await server.loadPromptsFromDirectory(promptsDir);

      // Test prompts/list
      const listResponse = await server.processListPrompts({ id: 1 });
      expect(listResponse.jsonrpc).toBe('2.0');
      expect(listResponse.result.prompts).toHaveLength(6);

      const prompts = listResponse.result.prompts;
      
      // Check custom-prompt.json
      const jsonPrompt = prompts.find(p => p.name === 'custom_api_prompt');
      expect(jsonPrompt).toBeDefined();
      expect(jsonPrompt.description).toBe('Custom prompt for API operations');
      expect(jsonPrompt.arguments).toHaveLength(2);
      expect(jsonPrompt.arguments[0].name).toBe('operation');
      expect(jsonPrompt.arguments[1].name).toBe('endpoint');

      // Check user-guide-prompt.md
      const mdPrompt = prompts.find(p => p.name === 'user-guide-prompt');
      expect(mdPrompt).toBeDefined();
      expect(mdPrompt.description).toBe('Prompt from user-guide-prompt.md');

      // Check api-documentation-prompt.yaml
      const yamlPrompt = prompts.find(p => p.name === 'api_documentation_prompt');
      expect(yamlPrompt).toBeDefined();
      expect(yamlPrompt.description).toBe('Custom prompt for API documentation generation');
      expect(yamlPrompt.arguments).toHaveLength(3);
    });

    test('should display custom prompts with template parameters', async () => {
      // Create prompt with template parameters
      await fs.writeFile(path.join(promptsDir, 'template-prompt.txt'), `You are a {{role}} assistant.

Help the user with {{task}} using the following context:
- Service: {{service_name}}
- Environment: {{environment}}
- Priority: {{priority}}

Provide {{output_format}} output.`);

      await server.loadPromptsFromDirectory(promptsDir);

      // Test prompts/list
      const listResponse = await server.processListPrompts({ id: 1 });
      const prompts = listResponse.result.prompts;
      
      const templatePrompt = prompts.find(p => p.name === 'template-prompt');
      expect(templatePrompt).toBeDefined();
      expect(templatePrompt.description).toBe('Prompt from template-prompt.txt');
    });

    test('should get custom prompts with template substitution', async () => {
      // Create prompt with template parameters
      await fs.writeFile(path.join(promptsDir, 'template-prompt.txt'), `You are a {{role}} assistant.

Help the user with {{task}} using the following context:
- Service: {{service_name}}
- Environment: {{environment}}
- Priority: {{priority}}

Provide {{output_format}} output.`);

      await server.loadPromptsFromDirectory(promptsDir);

      // Test prompts/get with template substitution
      const getResponse = await server.processGetPrompt({
        id: 1,
        params: {
          name: 'template-prompt',
          arguments: {
            role: 'technical support',
            task: 'API integration',
            service_name: 'MyAPI',
            environment: 'production',
            priority: 'high',
            output_format: 'step-by-step instructions'
          }
        }
      });

      expect(getResponse.jsonrpc).toBe('2.0');
      expect(getResponse.result.description).toBe('Prompt from template-prompt.txt');
      expect(getResponse.result.messages).toHaveLength(1);
      
      const message = getResponse.result.messages[0];
      expect(message.role).toBe('user');
      expect(message.content.type).toBe('text');
      
      // Verify template substitution
      const processedText = message.content.text;
      expect(processedText).toContain('You are a technical support assistant');
      expect(processedText).toContain('Help the user with API integration');
      expect(processedText).toContain('Service: MyAPI');
      expect(processedText).toContain('Environment: production');
      expect(processedText).toContain('Priority: high');
      expect(processedText).toContain('Provide step-by-step instructions output');
    });
  });

  describe('Mixed Custom Resources and Prompts', () => {
    test('should display both custom resources and prompts together', async () => {
      // Create mixed custom files
      await fs.writeFile(path.join(resourcesDir, 'api-config.json'), JSON.stringify({
        name: 'API Configuration',
        description: 'Custom API configuration'
      }, null, 2));

      await fs.writeFile(path.join(promptsDir, 'api-prompt.json'), JSON.stringify({
        name: 'api_prompt',
        description: 'Custom API prompt'
      }, null, 2));

      // Load both
      await server.loadResourcesFromDirectory(resourcesDir);
      await server.loadPromptsFromDirectory(promptsDir);

      // Test both lists
      const resourcesResponse = await server.processListResources({ id: 1 });
      const promptsResponse = await server.processListPrompts({ id: 1 });

      // Check that our custom resources and prompts are present (there may be additional existing ones)
      expect(resourcesResponse.result.resources.length).toBeGreaterThanOrEqual(1);
      expect(promptsResponse.result.prompts.length).toBeGreaterThanOrEqual(1);

      // Find our specific custom resources and prompts
      const apiConfigResource = resourcesResponse.result.resources.find(r => r.uri === 'resource://api-config.json');
      const apiPrompt = promptsResponse.result.prompts.find(p => p.name === 'api_prompt');
      
      expect(apiConfigResource).toBeDefined();
      expect(apiConfigResource.name).toBe('API Configuration');
      expect(apiPrompt).toBeDefined();
      expect(apiPrompt.name).toBe('api_prompt');
    });
  });

  describe('File Format Support', () => {
    test('should support any file format for custom resources and prompts', async () => {
      // Create files in various formats
      const testFiles = [
        { name: 'test-config-js.js', content: 'module.exports = { name: "{{service_name}}" };' },
        { name: 'test-prompt-py.py', content: 'def generate_prompt({{param1}}, {{param2}}):\n    return f"Hello {param1} from {param2}"' },
        { name: 'test-schema-xml.xml', content: '<schema name="{{schema_name}}"><field>{{field_name}}</field></schema>' },
        { name: 'test-template-sql.sql', content: 'SELECT * FROM {{table_name}} WHERE {{condition}}' },
        { name: 'test-config-ini.ini', content: '[{{section}}]\nkey={{value}}' },
        { name: 'test-prompt-sh.sh', content: 'echo "Hello {{name}} from {{service}}"' }
      ];

      // Create resource files
      for (const file of testFiles) {
        await fs.writeFile(path.join(resourcesDir, file.name), file.content);
      }

      // Create prompt files
      for (const file of testFiles) {
        await fs.writeFile(path.join(promptsDir, file.name), file.content);
      }

      // Load both
      await server.loadResourcesFromDirectory(resourcesDir);
      await server.loadPromptsFromDirectory(promptsDir);

      // Test both lists
      const resourcesResponse = await server.processListResources({ id: 1 });
      const promptsResponse = await server.processListPrompts({ id: 1 });

      // Check that our custom resources and prompts are present (there may be additional existing ones)
      expect(resourcesResponse.result.resources.length).toBeGreaterThanOrEqual(testFiles.length);
      expect(promptsResponse.result.prompts.length).toBeGreaterThanOrEqual(testFiles.length);

      // Verify all files are loaded with correct MIME types
      const resources = resourcesResponse.result.resources;
      const prompts = promptsResponse.result.prompts;

      expect(resources.find(r => r.uri === 'resource://test-config-js.js')).toBeDefined();
      expect(resources.find(r => r.uri === 'resource://test-prompt-py.py')).toBeDefined();
      expect(resources.find(r => r.uri === 'resource://test-schema-xml.xml')).toBeDefined();
      expect(resources.find(r => r.uri === 'resource://test-template-sql.sql')).toBeDefined();
      expect(resources.find(r => r.uri === 'resource://test-config-ini.ini')).toBeDefined();
      expect(resources.find(r => r.uri === 'resource://test-prompt-sh.sh')).toBeDefined();

      expect(prompts.find(p => p.name === 'test-config-js')).toBeDefined();
      expect(prompts.find(p => p.name === 'test-prompt-py')).toBeDefined();
      expect(prompts.find(p => p.name === 'test-schema-xml')).toBeDefined();
      expect(prompts.find(p => p.name === 'test-template-sql')).toBeDefined();
      expect(prompts.find(p => p.name === 'test-config-ini')).toBeDefined();
      expect(prompts.find(p => p.name === 'test-prompt-sh')).toBeDefined();
    });
  });
});
