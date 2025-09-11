/**
 * Tests for enhanced MCP server resource and prompt functionality
 * Tests support for any file format and automatic {{params}} template support
 */

const DynamicAPIMCPServer = require('../src/mcp/mcp-server');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('Enhanced MCP Server Resources and Prompts', () => {
  let server;
  let tempDir;
  let promptsDir;
  let resourcesDir;

  beforeEach(async () => {
    // Create temporary directories
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-test-'));
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
    // Clean up temporary directories
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Resource Loading - Any File Format', () => {
    test('should load JavaScript files as resources', async () => {
      const jsContent = `
// JavaScript resource with template parameters
function greetUser({{name}}) {
  return "Hello, {{name}}! Welcome to {{app}}.";
}
`;
      await fs.writeFile(path.join(resourcesDir, 'greeting.js'), jsContent);

      await server.loadResourcesFromDirectory(resourcesDir);

      const resources = Array.from(server.resources.values());
      expect(resources).toHaveLength(1);
      
      const resource = resources[0];
      expect(resource.name).toBe('greeting');
      expect(resource.mimeType).toBe('application/javascript');
      expect(resource.hasParameters).toBe(true);
      expect(resource.parameters).toContain('name');
      expect(resource.parameters).toContain('app');
      expect(resource.isTemplate).toBe(true);
    });

    test('should load Python files as resources', async () => {
      const pyContent = `
# Python resource with template parameters
def process_data({{input_data}}, {{output_format}}):
    """Process {{input_data}} and return in {{output_format}} format"""
    return f"Processed {input_data} as {output_format}"
`;
      await fs.writeFile(path.join(resourcesDir, 'processor.py'), pyContent);

      await server.loadResourcesFromDirectory(resourcesDir);

      const resources = Array.from(server.resources.values());
      expect(resources).toHaveLength(1);
      
      const resource = resources[0];
      expect(resource.name).toBe('processor');
      expect(resource.mimeType).toBe('text/x-python');
      expect(resource.hasParameters).toBe(true);
      expect(resource.parameters).toContain('input_data');
      expect(resource.parameters).toContain('output_format');
    });

    test('should load YAML files as resources', async () => {
      const yamlContent = `
name: "{{service_name}}"
version: "{{version}}"
description: "{{description}}"
config:
  host: "{{host}}"
  port: {{port}}
`;
      await fs.writeFile(path.join(resourcesDir, 'config.yaml'), yamlContent);

      await server.loadResourcesFromDirectory(resourcesDir);

      const resources = Array.from(server.resources.values());
      expect(resources).toHaveLength(1);
      
      const resource = resources[0];
      expect(resource.name).toBe('{{service_name}}'); // YAML parsing extracts name from content
      expect(resource.mimeType).toBe('application/x-yaml');
      expect(resource.hasParameters).toBe(true);
      expect(resource.parameters).toContain('service_name');
      expect(resource.parameters).toContain('version');
      expect(resource.parameters).toContain('description');
      expect(resource.parameters).toContain('host');
      expect(resource.parameters).toContain('port');
    });

    test('should load HTML files as resources', async () => {
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>{{page_title}}</title>
</head>
<body>
    <h1>Welcome to {{app_name}}</h1>
    <p>Hello, {{user_name}}!</p>
</body>
</html>
`;
      await fs.writeFile(path.join(resourcesDir, 'template.html'), htmlContent);

      await server.loadResourcesFromDirectory(resourcesDir);

      const resources = Array.from(server.resources.values());
      expect(resources).toHaveLength(1);
      
      const resource = resources[0];
      expect(resource.name).toBe('template');
      expect(resource.mimeType).toBe('text/html');
      expect(resource.hasParameters).toBe(true);
      expect(resource.parameters).toContain('page_title');
      expect(resource.parameters).toContain('app_name');
      expect(resource.parameters).toContain('user_name');
    });

    test('should load files without parameters as regular resources', async () => {
      const content = 'This is a simple text file without any parameters.';
      await fs.writeFile(path.join(resourcesDir, 'simple.txt'), content);

      await server.loadResourcesFromDirectory(resourcesDir);

      const resources = Array.from(server.resources.values());
      expect(resources).toHaveLength(1);
      
      const resource = resources[0];
      expect(resource.name).toBe('simple');
      expect(resource.mimeType).toBe('text/plain');
      expect(resource.hasParameters).toBe(false);
      expect(resource.parameters).toHaveLength(0);
      expect(resource.isTemplate).toBe(false);
    });
  });

  describe('Prompt Loading - Any File Format', () => {
    test('should load Markdown files as prompts', async () => {
      const mdContent = `
# {{prompt_title}}

You are a helpful assistant that specializes in {{domain}}.

## Instructions
- Always be {{tone}}
- Focus on {{topic}}
- Provide examples when {{include_examples}}
`;
      await fs.writeFile(path.join(promptsDir, 'assistant.md'), mdContent);

      await server.loadPromptsFromDirectory(promptsDir);

      const prompts = Array.from(server.prompts.values());
      expect(prompts).toHaveLength(1);
      
      const prompt = prompts[0];
      expect(prompt.name).toBe('assistant');
      expect(prompt.description).toBe('Prompt from assistant.md');
      expect(prompt.hasParameters).toBe(true);
      expect(prompt.parameters).toContain('prompt_title');
      expect(prompt.parameters).toContain('domain');
      expect(prompt.parameters).toContain('tone');
      expect(prompt.parameters).toContain('topic');
      expect(prompt.parameters).toContain('include_examples');
    });

    test('should load JSON files as prompts with metadata', async () => {
      const jsonContent = JSON.stringify({
        name: "code_review_prompt",
        description: "Prompt for code review assistance",
        instructions: "Review the following {{language}} code for {{review_type}} issues:\n\n{{code}}",
        arguments: {
          properties: {
            language: { description: "Programming language" },
            review_type: { description: "Type of review to perform" },
            code: { description: "Code to review" }
          },
          required: ["language", "code"]
        }
      }, null, 2);
      await fs.writeFile(path.join(promptsDir, 'code_review.json'), jsonContent);

      await server.loadPromptsFromDirectory(promptsDir);

      const prompts = Array.from(server.prompts.values());
      expect(prompts).toHaveLength(1);
      
      const prompt = prompts[0];
      expect(prompt.name).toBe('code_review_prompt');
      expect(prompt.description).toBe('Prompt for code review assistance');
      expect(prompt.arguments).toHaveLength(3);
      expect(prompt.arguments[0].name).toBe('language');
      expect(prompt.arguments[0].required).toBe(true);
      expect(prompt.hasParameters).toBe(true);
      expect(prompt.parameters).toContain('language');
      expect(prompt.parameters).toContain('review_type');
      expect(prompt.parameters).toContain('code');
    });

    test('should load plain text files as prompts', async () => {
      const txtContent = 'Write a {{genre}} story about {{character}} in {{setting}}.';
      await fs.writeFile(path.join(promptsDir, 'story.txt'), txtContent);

      await server.loadPromptsFromDirectory(promptsDir);

      const prompts = Array.from(server.prompts.values());
      expect(prompts).toHaveLength(1);
      
      const prompt = prompts[0];
      expect(prompt.name).toBe('story');
      expect(prompt.description).toBe('Prompt from story.txt');
      expect(prompt.hasParameters).toBe(true);
      expect(prompt.parameters).toContain('genre');
      expect(prompt.parameters).toContain('character');
      expect(prompt.parameters).toContain('setting');
    });
  });

  describe('Template Parameter Substitution', () => {
    beforeEach(async () => {
      // Create a resource with parameters
      const resourceContent = 'Hello {{name}}, welcome to {{app}}! Your role is {{role}}.';
      await fs.writeFile(path.join(resourcesDir, 'welcome.txt'), resourceContent);
      await server.loadResourcesFromDirectory(resourcesDir);
    });

    test('should substitute parameters in resource content', async () => {
      const resource = Array.from(server.resources.values())[0];
      
      const result = await server.processReadResource({
        id: 1,
        params: {
          uri: resource.uri,
          arguments: {
            name: 'Alice',
            app: 'MyApp',
            role: 'admin'
          }
        }
      });

      expect(result.jsonrpc).toBe('2.0');
      expect(result.result.contents[0].text).toBe('Hello Alice, welcome to MyApp! Your role is admin.');
      expect(result.result.template).toBeDefined();
      expect(result.result.template.hasParameters).toBe(true);
      expect(result.result.template.parameters).toContain('name');
      expect(result.result.template.parameters).toContain('app');
      expect(result.result.template.parameters).toContain('role');
    });

    test('should return original content when no arguments provided', async () => {
      const resource = Array.from(server.resources.values())[0];
      
      const result = await server.processReadResource({
        id: 1,
        params: {
          uri: resource.uri
        }
      });

      expect(result.jsonrpc).toBe('2.0');
      expect(result.result.contents[0].text).toBe('Hello {{name}}, welcome to {{app}}! Your role is {{role}}.');
    });

    test('should handle partial parameter substitution', async () => {
      const resource = Array.from(server.resources.values())[0];
      
      const result = await server.processReadResource({
        id: 1,
        params: {
          uri: resource.uri,
          arguments: {
            name: 'Bob'
          }
        }
      });

      expect(result.jsonrpc).toBe('2.0');
      expect(result.result.contents[0].text).toBe('Hello Bob, welcome to {{app}}! Your role is {{role}}.');
    });
  });

  describe('MIME Type Detection', () => {
    test('should detect correct MIME types for various file extensions', () => {
      expect(server.getMimeTypeForExtension('.js')).toBe('application/javascript');
      expect(server.getMimeTypeForExtension('.py')).toBe('text/x-python');
      expect(server.getMimeTypeForExtension('.html')).toBe('text/html');
      expect(server.getMimeTypeForExtension('.css')).toBe('text/css');
      expect(server.getMimeTypeForExtension('.json')).toBe('application/json');
      expect(server.getMimeTypeForExtension('.yaml')).toBe('application/x-yaml');
      expect(server.getMimeTypeForExtension('.md')).toBe('text/markdown');
      expect(server.getMimeTypeForExtension('.txt')).toBe('text/plain');
      expect(server.getMimeTypeForExtension('.unknown')).toBe('text/plain');
    });
  });

  describe('Configuration Options', () => {
    test('should respect format restrictions when specified', async () => {
      const restrictedServer = new DynamicAPIMCPServer('127.0.0.1', 0, {
        resources: {
          enabled: true,
          directory: resourcesDir,
          watch: false,
          formats: ['txt', 'md'], // Only allow txt and md
          enableTemplates: true
        }
      });

      // Create files with different extensions
      await fs.writeFile(path.join(resourcesDir, 'allowed.txt'), 'Text content');
      await fs.writeFile(path.join(resourcesDir, 'allowed.md'), 'Markdown content');
      await fs.writeFile(path.join(resourcesDir, 'forbidden.js'), 'JavaScript content');

      await restrictedServer.loadResourcesFromDirectory(resourcesDir);

      const resources = Array.from(restrictedServer.resources.values());
      expect(resources).toHaveLength(2); // Only txt and md files loaded
      expect(resources.some(r => r.name === 'allowed')).toBe(true);
      expect(resources.some(r => r.name === 'forbidden')).toBe(false);

      restrictedServer.stop();
    });

    test('should disable template processing when disabled', async () => {
      const noTemplateServer = new DynamicAPIMCPServer('127.0.0.1', 0, {
        resources: {
          enabled: true,
          directory: resourcesDir,
          watch: false,
          formats: ['*'],
          enableTemplates: false
        }
      });

      const resourceContent = 'Hello {{name}}!';
      await fs.writeFile(path.join(resourcesDir, 'template.txt'), resourceContent);
      await noTemplateServer.loadResourcesFromDirectory(resourcesDir);

      const resource = Array.from(noTemplateServer.resources.values())[0];
      
      const result = await noTemplateServer.processReadResource({
        id: 1,
        params: {
          uri: resource.uri,
          arguments: { name: 'Alice' }
        }
      });

      // Should not substitute parameters when templates are disabled
      expect(result.result.contents[0].text).toBe('Hello {{name}}!');

      noTemplateServer.stop();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid JSON gracefully', async () => {
      const invalidJson = '{ invalid json content';
      await fs.writeFile(path.join(resourcesDir, 'invalid.json'), invalidJson);

      // Should not throw error
      await expect(server.loadResourcesFromDirectory(resourcesDir)).resolves.not.toThrow();

      const resources = Array.from(server.resources.values());
      expect(resources).toHaveLength(1);
      expect(resources[0].mimeType).toBe('application/json'); // MIME type is set before parsing
    });

    test('should handle invalid YAML gracefully', async () => {
      const invalidYaml = 'invalid: yaml: content: [';
      await fs.writeFile(path.join(resourcesDir, 'invalid.yaml'), invalidYaml);

      // Should not throw error
      await expect(server.loadResourcesFromDirectory(resourcesDir)).resolves.not.toThrow();

      const resources = Array.from(server.resources.values());
      expect(resources).toHaveLength(1);
      expect(resources[0].mimeType).toBe('application/x-yaml'); // MIME type is set before parsing
    });
  });
});
