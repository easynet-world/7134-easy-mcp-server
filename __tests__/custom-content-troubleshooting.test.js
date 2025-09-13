/**
 * Test to help troubleshoot custom prompts and resources loading
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const DynamicAPIMCPServer = require('../src/mcp/mcp-server');

describe('Custom Content Troubleshooting', () => {
  let server;
  let tempDir;
  let customPromptsDir;
  let customResourcesDir;

  beforeEach(async () => {
    // Create temporary directories for custom content
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'custom-mcp-test-'));
    customPromptsDir = path.join(tempDir, 'custom-prompts');
    customResourcesDir = path.join(tempDir, 'custom-resources');
    
    await fs.mkdir(customPromptsDir, { recursive: true });
    await fs.mkdir(customResourcesDir, { recursive: true });

    // Initialize server with custom directories
    server = new DynamicAPIMCPServer('0.0.0.0', 3001, {
      prompts: {
        enabled: true,
        directory: customPromptsDir,
        watch: false, // Disable for testing
        formats: ['*'], // Support all formats
        enableTemplates: true
      },
      resources: {
        enabled: true,
        directory: customResourcesDir,
        watch: false, // Disable for testing
        formats: ['*'], // Support all formats
        enableTemplates: true
      }
    });
  });

  afterEach(async () => {
    // Clean up
    if (server) {
      server.stop();
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Custom Prompts Loading', () => {
    test('should load custom prompts from various formats', async () => {
      // Create custom prompt files in different formats
      const customPrompts = [
        {
          name: 'my-custom-prompt.json',
          content: JSON.stringify({
            name: 'Custom JSON Prompt',
            description: 'A custom prompt in JSON format',
            instructions: 'This is a custom prompt with {{param1}} and {{param2}}',
            arguments: {
              type: 'object',
              properties: {
                param1: { type: 'string', description: 'First parameter' },
                param2: { type: 'string', description: 'Second parameter' }
              },
              required: ['param1', 'param2']
            }
          }, null, 2)
        },
        {
          name: 'my-custom-prompt.md',
          content: '# Custom Markdown Prompt\n\nThis is a custom prompt in markdown with {{variable}} substitution.'
        },
        {
          name: 'my-custom-prompt.py',
          content: 'def generate_custom_prompt({{name}}, {{context}}):\n    return f"Hello {name}, here is your {context}"'
        },
        {
          name: 'my-custom-prompt.yaml',
          content: `name: Custom YAML Prompt
description: A custom prompt in YAML format
instructions: Generate content for {{topic}} with {{style}}
arguments:
  type: object
  properties:
    topic:
      type: string
      description: The topic to generate content about
    style:
      type: string
      description: The writing style to use
  required: [topic, style]`
        },
        {
          name: 'my-custom-prompt.txt',
          content: 'This is a simple text prompt with {{placeholder}} for substitution.'
        }
      ];

      // Write custom prompt files
      for (const prompt of customPrompts) {
        await fs.writeFile(path.join(customPromptsDir, prompt.name), prompt.content);
      }

      // Load prompts
      await server.loadPromptsFromDirectory(customPromptsDir);

      // Test listing prompts
      const promptsResponse = await server.processListPrompts({ id: 1 });
      
      expect(promptsResponse.result.prompts.length).toBeGreaterThanOrEqual(4);
      
      // Verify specific prompts exist
      const promptNames = promptsResponse.result.prompts.map(p => p.name);
      
      expect(promptNames).toContain('Custom JSON Prompt');
      expect(promptNames).toContain('my-custom-prompt');
      expect(promptNames).toContain('Custom YAML Prompt');
      expect(promptNames).toContain('test-prompt'); // For test files
    });

    test('should handle prompts with template parameters', async () => {
      const templatePrompt = {
        name: 'template-prompt.md',
        content: `# Template Prompt

Generate a {{type}} for {{audience}} with the following requirements:
- Length: {{length}}
- Tone: {{tone}}
- Include: {{features}}

Additional context: {{context}}`
      };

      await fs.writeFile(path.join(customPromptsDir, templatePrompt.name), templatePrompt.content);

      await server.loadPromptsFromDirectory(customPromptsDir);

      const promptsResponse = await server.processListPrompts({ id: 1 });
      const prompt = promptsResponse.result.prompts.find(p => p.name === 'template-prompt');

      expect(prompt).toBeDefined();
      if (prompt && prompt.instructions) {
        expect(prompt.instructions).toContain('{{type}}');
        expect(prompt.instructions).toContain('{{audience}}');
        expect(prompt.instructions).toContain('{{length}}');
      }
    });
  });

  describe('Custom Resources Loading', () => {
    test('should load custom resources from various formats', async () => {
      // Create custom resource files in different formats
      const customResources = [
        {
          name: 'my-config.json',
          content: JSON.stringify({
            name: 'Custom Configuration',
            description: 'A custom configuration file',
            settings: {
              apiUrl: '{{api_url}}',
              timeout: '{{timeout}}',
              retries: '{{retries}}'
            }
          }, null, 2)
        },
        {
          name: 'my-guide.md',
          content: '# Custom Guide\n\nThis is a custom guide with {{version}} information.'
        },
        {
          name: 'my-script.js',
          content: 'console.log("Custom script with {{environment}} configuration");'
        },
        {
          name: 'my-template.html',
          content: '<html><body><h1>{{title}}</h1><p>{{content}}</p></body></html>'
        },
        {
          name: 'my-data.yaml',
          content: `name: Custom Data
description: Custom data in YAML format
data:
  key1: "{{value1}}"
  key2: "{{value2}}"`
        }
      ];

      // Write custom resource files
      for (const resource of customResources) {
        await fs.writeFile(path.join(customResourcesDir, resource.name), resource.content);
      }

      // Load resources
      await server.loadResourcesFromDirectory(customResourcesDir);

      // Test listing resources
      const resourcesResponse = await server.processListResources({ id: 1 });
      
      expect(resourcesResponse.result.resources.length).toBeGreaterThanOrEqual(customResources.length);
      
      // Verify specific resources exist
      const resourceUris = resourcesResponse.result.resources.map(r => r.uri);
      
      expect(resourceUris).toContain('resource://my-config.json');
      expect(resourceUris).toContain('resource://my-guide.md');
      expect(resourceUris).toContain('resource://my-script.js');
      expect(resourceUris).toContain('resource://my-template.html');
      expect(resourceUris).toContain('resource://my-data.yaml');
    });

    test('should handle resources with template parameters', async () => {
      const templateResource = {
        name: 'template-config.json',
        content: JSON.stringify({
          name: 'Template Configuration',
          description: 'A configuration template',
          database: {
            host: '{{db_host}}',
            port: '{{db_port}}',
            name: '{{db_name}}'
          },
          api: {
            baseUrl: '{{api_base_url}}',
            version: '{{api_version}}'
          }
        }, null, 2)
      };

      await fs.writeFile(path.join(customResourcesDir, templateResource.name), templateResource.content);

      await server.loadResourcesFromDirectory(customResourcesDir);

      const resourcesResponse = await server.processListResources({ id: 1 });
      const resource = resourcesResponse.result.resources.find(r => r.uri === 'resource://template-config.json');

      expect(resource).toBeDefined();
      if (resource && resource.content) {
        expect(resource.content).toContain('{{db_host}}');
        expect(resource.content).toContain('{{api_base_url}}');
      }
    });
  });

  describe('Directory Structure Issues', () => {
    test('should handle nested directory structures', async () => {
      // Create nested directories
      const nestedPromptsDir = path.join(customPromptsDir, 'category1', 'subcategory');
      const nestedResourcesDir = path.join(customResourcesDir, 'templates', 'v1');
      
      await fs.mkdir(nestedPromptsDir, { recursive: true });
      await fs.mkdir(nestedResourcesDir, { recursive: true });

      // Create files in nested directories
      await fs.writeFile(
        path.join(nestedPromptsDir, 'nested-prompt.md'),
        '# Nested Prompt\n\nThis is in a nested directory with {{param}}.'
      );
      
      await fs.writeFile(
        path.join(nestedResourcesDir, 'nested-resource.json'),
        JSON.stringify({ name: 'Nested Resource', value: '{{nested_value}}' }, null, 2)
      );

      // Load from parent directories (should recursively load)
      await server.loadPromptsFromDirectory(customPromptsDir);
      await server.loadResourcesFromDirectory(customResourcesDir);

      const promptsResponse = await server.processListPrompts({ id: 1 });
      const resourcesResponse = await server.processListResources({ id: 1 });

      // Should find nested content
      const promptNames = promptsResponse.result.prompts.map(p => p.name);
      const resourceUris = resourcesResponse.result.resources.map(r => r.uri);

      expect(promptNames).toContain('category1_subcategory_nested-prompt');
      expect(resourceUris).toContain('resource://templates/v1/nested-resource.json');
    });

    test('should handle empty directories gracefully', async () => {
      // Create empty subdirectories
      const emptyDir = path.join(customPromptsDir, 'empty');
      await fs.mkdir(emptyDir, { recursive: true });

      // Should not throw errors
      await expect(server.loadPromptsFromDirectory(customPromptsDir)).resolves.not.toThrow();
      await expect(server.loadResourcesFromDirectory(customResourcesDir)).resolves.not.toThrow();
    });
  });

  describe('File Format Support', () => {
    test('should support all common file formats', async () => {
      const testFiles = [
        { name: 'test.js', content: 'console.log("{{message}}");' },
        { name: 'test.py', content: 'print("{{message}}")' },
        { name: 'test.java', content: 'public class Test { /* {{comment}} */ }' },
        { name: 'test.cpp', content: '// {{comment}}\n#include <iostream>' },
        { name: 'test.c', content: '/* {{comment}} */\n#include <stdio.h>' },
        { name: 'test.php', content: '<?php echo "{{message}}"; ?>' },
        { name: 'test.rb', content: 'puts "{{message}}"' },
        { name: 'test.go', content: 'package main\n// {{comment}}' },
        { name: 'test.rs', content: '// {{comment}}\nfn main() {}' },
        { name: 'test.swift', content: '// {{comment}}\nprint("{{message}}")' },
        { name: 'test.kt', content: '// {{comment}}\nfun main() { println("{{message}}") }' },
        { name: 'test.scala', content: '// {{comment}}\nobject Test { def main(args: Array[String]) = println("{{message}}") }' },
        { name: 'test.sh', content: '#!/bin/bash\necho "{{message}}"' },
        { name: 'test.bat', content: '@echo off\necho {{message}}' },
        { name: 'test.ps1', content: 'Write-Host "{{message}}"' },
        { name: 'test.html', content: '<html><body>{{content}}</body></html>' },
        { name: 'test.xml', content: '<root>{{content}}</root>' },
        { name: 'test.css', content: 'body { color: {{color}}; }' },
        { name: 'test.sql', content: 'SELECT * FROM {{table}} WHERE {{condition}}' },
        { name: 'test.ini', content: '[{{section}}]\nkey={{value}}' },
        { name: 'test.properties', content: '{{key}}={{value}}' },
        { name: 'test.env', content: '{{KEY}}={{VALUE}}' },
        { name: 'test.dockerfile', content: 'FROM {{base_image}}\nCOPY {{source}} {{dest}}' },
        { name: 'test.makefile', content: '{{target}}: {{dependencies}}\n\t{{command}}' },
        { name: 'test.cmake', content: 'cmake_minimum_required(VERSION {{version}})' },
        { name: 'test.gradle', content: 'apply plugin: "{{plugin}}"' },
        { name: 'test.toml', content: '[{{section}}]\nkey = "{{value}}"' },
        { name: 'test.csv', content: '{{header1}},{{header2}}\n{{value1}},{{value2}}' },
        { name: 'test.tsv', content: '{{header1}}\t{{header2}}\n{{value1}}\t{{value2}}' },
        { name: 'test.tex', content: '\\documentclass{article}\n\\title{{{title}}}\n\\begin{document}\n{{content}}\n\\end{document}' },
        { name: 'test.rst', content: '{{title}}\n========\n\n{{content}}' },
        { name: 'test.adoc', content: '= {{title}}\n\n{{content}}' },
        { name: 'test.org', content: '* {{title}}\n\n{{content}}' },
        { name: 'test.wiki', content: '= {{title}} =\n\n{{content}}' }
      ];

      // Create test files
      for (const file of testFiles) {
        await fs.writeFile(path.join(customPromptsDir, file.name), file.content);
        await fs.writeFile(path.join(customResourcesDir, file.name), file.content);
      }

      // Load content
      await server.loadPromptsFromDirectory(customPromptsDir);
      await server.loadResourcesFromDirectory(customResourcesDir);

      // Verify all files were loaded
      const promptsResponse = await server.processListPrompts({ id: 1 });
      const resourcesResponse = await server.processListResources({ id: 1 });

      expect(promptsResponse.result.prompts.length).toBeGreaterThanOrEqual(2);
      expect(resourcesResponse.result.resources.length).toBeGreaterThanOrEqual(testFiles.length);
    });
  });
});
