/**
 * Test file format support in MCPResourceLoader
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const MCPResourceLoader = require('../src/utils/loaders/resource-loader');

describe('MCPResourceLoader File Format Support', () => {
  let loader;
  let tempDir;
  let promptsDir;
  let resourcesDir;

  beforeEach(async () => {
    // Create temporary directories
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-resource-loader-test-'));
    promptsDir = path.join(tempDir, 'prompts');
    resourcesDir = path.join(tempDir, 'resources');
    
    await fs.mkdir(promptsDir, { recursive: true });
    await fs.mkdir(resourcesDir, { recursive: true });

    // Initialize loader
    loader = new MCPResourceLoader(tempDir);
  });

  afterEach(async () => {
    // Clean up temporary directories
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Resource Format Support', () => {
    test('should load resources from all supported file formats', async () => {
      const testFiles = [
        { name: 'config.json', content: '{"name": "Test Config", "description": "A test configuration"}' },
        { name: 'readme.md', content: '# Test Readme\n\nThis is a test markdown file.' },
        { name: 'script.js', content: 'console.log("Hello World");' },
        { name: 'style.css', content: 'body { color: red; }' },
        { name: 'data.yaml', content: 'name: Test Data\ndescription: A test YAML file' },
        { name: 'query.sql', content: 'SELECT * FROM users WHERE id = 1;' },
        { name: 'config.ini', content: '[section]\nkey=value' },
        { name: 'script.py', content: 'def hello():\n    print("Hello World")' },
        { name: 'data.xml', content: '<root><item>test</item></root>' },
        { name: 'template.html', content: '<html><body><h1>{{title}}</h1></body></html>' }
      ];

      // Create test files
      for (const file of testFiles) {
        await fs.writeFile(path.join(resourcesDir, file.name), file.content);
      }

      // Load resources
      const resources = await loader.loadDirectory('resources', 'resources');

      // Verify all files were loaded
      expect(resources).toHaveLength(testFiles.length);

      // Verify each resource has correct properties
      for (const resource of resources) {
        expect(resource).toHaveProperty('uri');
        expect(resource).toHaveProperty('name');
        expect(resource).toHaveProperty('description');
        expect(resource).toHaveProperty('mimeType');
        expect(resource).toHaveProperty('content');
        expect(resource).toHaveProperty('filePath');
        expect(resource).toHaveProperty('format');
      }

      // Verify specific MIME types
      const resourceMap = new Map(resources.map(r => [path.basename(r.filePath), r]));
      
      expect(resourceMap.get('config.json').mimeType).toBe('application/json');
      expect(resourceMap.get('readme.md').mimeType).toBe('text/markdown');
      expect(resourceMap.get('script.js').mimeType).toBe('application/javascript');
      expect(resourceMap.get('style.css').mimeType).toBe('text/css');
      expect(resourceMap.get('data.yaml').mimeType).toBe('application/x-yaml');
      expect(resourceMap.get('query.sql').mimeType).toBe('text/x-sql');
      expect(resourceMap.get('config.ini').mimeType).toBe('text/x-ini');
      expect(resourceMap.get('script.py').mimeType).toBe('text/x-python');
      expect(resourceMap.get('data.xml').mimeType).toBe('text/xml');
      expect(resourceMap.get('template.html').mimeType).toBe('text/html');
    });

    test('should handle structured formats with metadata extraction', async () => {
      const jsonContent = {
        name: 'Test Resource',
        description: 'A test resource with metadata',
        mimeType: 'application/custom',
        data: { key: 'value' }
      };

      await fs.writeFile(
        path.join(resourcesDir, 'metadata.json'), 
        JSON.stringify(jsonContent, null, 2)
      );

      const resources = await loader.loadDirectory('resources', 'resources');
      const resource = resources[0];

      expect(resource.name).toBe('Test Resource');
      expect(resource.description).toBe('A test resource with metadata');
      expect(resource.mimeType).toBe('application/custom');
    });

    test('should handle YAML files with metadata extraction', async () => {
      const yamlContent = `name: YAML Test
description: A test YAML resource
mimeType: application/custom-yaml
data:
  key: value
  nested:
    item: test`;

      await fs.writeFile(path.join(resourcesDir, 'metadata.yaml'), yamlContent);

      const resources = await loader.loadDirectory('resources', 'resources');
      const resource = resources[0];

      expect(resource.name).toBe('YAML Test');
      expect(resource.description).toBe('A test YAML resource');
      expect(resource.mimeType).toBe('application/custom-yaml');
    });
  });

  describe('Prompt Format Support', () => {
    test('should load prompts from all supported file formats', async () => {
      const testFiles = [
        { name: 'prompt.json', content: '{"name": "Test Prompt", "description": "A test prompt", "instructions": "Do something"}' },
        { name: 'prompt.md', content: '# Test Prompt\n\nThis is a test prompt in markdown.' },
        { name: 'prompt.js', content: 'function generatePrompt() { return "Hello World"; }' },
        { name: 'prompt.py', content: 'def generate_prompt():\n    return "Hello World"' },
        { name: 'prompt.yaml', content: 'name: YAML Prompt\ndescription: A YAML prompt\ninstructions: Do something' },
        { name: 'prompt.txt', content: 'This is a plain text prompt.' },
        { name: 'prompt.sh', content: '#!/bin/bash\necho "Hello World"' }
      ];

      // Create test files
      for (const file of testFiles) {
        await fs.writeFile(path.join(promptsDir, file.name), file.content);
      }

      // Load prompts
      const prompts = await loader.loadDirectory('prompts', 'prompts');

      // Verify all files were loaded
      expect(prompts).toHaveLength(testFiles.length);

      // Verify each prompt has correct properties
      for (const prompt of prompts) {
        expect(prompt).toHaveProperty('name');
        expect(prompt).toHaveProperty('description');
        expect(prompt).toHaveProperty('instructions');
        expect(prompt).toHaveProperty('template');
        expect(prompt).toHaveProperty('filePath');
        expect(prompt).toHaveProperty('format');
        expect(prompt).toHaveProperty('mimeType');
      }
    });

    test('should handle structured prompt formats with arguments', async () => {
      const jsonPrompt = {
        name: 'Complex Prompt',
        description: 'A prompt with arguments',
        instructions: 'Generate a {{type}} for {{name}}',
        arguments: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'The type of content to generate' },
            name: { type: 'string', description: 'The name to use' }
          },
          required: ['type', 'name']
        }
      };

      await fs.writeFile(
        path.join(promptsDir, 'complex.json'), 
        JSON.stringify(jsonPrompt, null, 2)
      );

      const prompts = await loader.loadDirectory('prompts', 'prompts');
      const prompt = prompts[0];

      expect(prompt.name).toBe('Complex Prompt');
      expect(prompt.description).toBe('A prompt with arguments');
      expect(prompt.instructions).toBe('Generate a {{type}} for {{name}}');
      expect(prompt.arguments).toBeDefined();
      expect(prompt.arguments.properties).toHaveProperty('type');
      expect(prompt.arguments.properties).toHaveProperty('name');
      expect(prompt.arguments.required).toEqual(['type', 'name']);
    });

    test('should handle YAML prompt formats with arguments', async () => {
      const yamlPrompt = `name: YAML Complex Prompt
description: A YAML prompt with arguments
instructions: Generate a {{type}} for {{name}}
arguments:
  type: object
  properties:
    type:
      type: string
      description: The type of content to generate
    name:
      type: string
      description: The name to use
  required:
    - type
    - name`;

      await fs.writeFile(path.join(promptsDir, 'complex.yaml'), yamlPrompt);

      const prompts = await loader.loadDirectory('prompts', 'prompts');
      const prompt = prompts[0];

      expect(prompt.name).toBe('YAML Complex Prompt');
      expect(prompt.description).toBe('A YAML prompt with arguments');
      expect(prompt.instructions).toBe('Generate a {{type}} for {{name}}');
      expect(prompt.arguments).toBeDefined();
      expect(prompt.arguments.properties).toHaveProperty('type');
      expect(prompt.arguments.properties).toHaveProperty('name');
      expect(prompt.arguments.required).toEqual(['type', 'name']);
    });

    test('should handle plain text prompts as templates', async () => {
      const plainTextPrompt = 'This is a plain text prompt with {{variable}} substitution.';

      await fs.writeFile(path.join(promptsDir, 'plain.txt'), plainTextPrompt);

      const prompts = await loader.loadDirectory('prompts', 'prompts');
      const prompt = prompts[0];

      expect(prompt.name).toBe('plain');
      expect(prompt.description).toBe('Prompt from plain');
      expect(prompt.instructions).toBe(plainTextPrompt);
      expect(prompt.template).toBe(plainTextPrompt);
      expect(prompt.mimeType).toBe('text/plain');
    });
  });

  describe('MIME Type Detection', () => {
    test('should detect correct MIME types for all supported extensions', () => {
      const testCases = [
        { ext: '.js', expected: 'application/javascript' },
        { ext: '.ts', expected: 'application/typescript' },
        { ext: '.py', expected: 'text/x-python' },
        { ext: '.java', expected: 'text/x-java-source' },
        { ext: '.cpp', expected: 'text/x-c++src' },
        { ext: '.c', expected: 'text/x-csrc' },
        { ext: '.h', expected: 'text/x-chdr' },
        { ext: '.hpp', expected: 'text/x-c++hdr' },
        { ext: '.cs', expected: 'text/x-csharp' },
        { ext: '.php', expected: 'text/x-php' },
        { ext: '.rb', expected: 'text/x-ruby' },
        { ext: '.go', expected: 'text/x-go' },
        { ext: '.rs', expected: 'text/x-rust' },
        { ext: '.swift', expected: 'text/x-swift' },
        { ext: '.kt', expected: 'text/x-kotlin' },
        { ext: '.scala', expected: 'text/x-scala' },
        { ext: '.sh', expected: 'text/x-shellscript' },
        { ext: '.bash', expected: 'text/x-shellscript' },
        { ext: '.zsh', expected: 'text/x-shellscript' },
        { ext: '.fish', expected: 'text/x-fish' },
        { ext: '.ps1', expected: 'text/x-powershell' },
        { ext: '.bat', expected: 'text/x-msdos-batch' },
        { ext: '.cmd', expected: 'text/x-msdos-batch' },
        { ext: '.html', expected: 'text/html' },
        { ext: '.htm', expected: 'text/html' },
        { ext: '.xml', expected: 'text/xml' },
        { ext: '.css', expected: 'text/css' },
        { ext: '.scss', expected: 'text/x-scss' },
        { ext: '.sass', expected: 'text/x-sass' },
        { ext: '.less', expected: 'text/x-less' },
        { ext: '.sql', expected: 'text/x-sql' },
        { ext: '.r', expected: 'text/x-r' },
        { ext: '.m', expected: 'text/x-objective-c' },
        { ext: '.mm', expected: 'text/x-objective-c++' },
        { ext: '.pl', expected: 'text/x-perl' },
        { ext: '.pm', expected: 'text/x-perl' },
        { ext: '.lua', expected: 'text/x-lua' },
        { ext: '.dart', expected: 'text/x-dart' },
        { ext: '.elm', expected: 'text/x-elm' },
        { ext: '.clj', expected: 'text/x-clojure' },
        { ext: '.cljs', expected: 'text/x-clojure' },
        { ext: '.hs', expected: 'text/x-haskell' },
        { ext: '.ml', expected: 'text/x-ocaml' },
        { ext: '.fs', expected: 'text/x-fsharp' },
        { ext: '.vb', expected: 'text/x-vb' },
        { ext: '.asm', expected: 'text/x-asm' },
        { ext: '.s', expected: 'text/x-asm' },
        { ext: '.tex', expected: 'text/x-tex' },
        { ext: '.rst', expected: 'text/x-rst' },
        { ext: '.adoc', expected: 'text/x-asciidoc' },
        { ext: '.asciidoc', expected: 'text/x-asciidoc' },
        { ext: '.org', expected: 'text/x-org' },
        { ext: '.wiki', expected: 'text/x-wiki' },
        { ext: '.toml', expected: 'text/x-toml' },
        { ext: '.ini', expected: 'text/x-ini' },
        { ext: '.cfg', expected: 'text/x-config' },
        { ext: '.conf', expected: 'text/x-config' },
        { ext: '.properties', expected: 'text/x-properties' },
        { ext: '.env', expected: 'text/x-env' },
        { ext: '.dockerfile', expected: 'text/x-dockerfile' },
        { ext: '.makefile', expected: 'text/x-makefile' },
        { ext: '.cmake', expected: 'text/x-cmake' },
        { ext: '.gradle', expected: 'text/x-gradle' },
        { ext: '.maven', expected: 'text/x-maven' },
        { ext: '.pom', expected: 'text/x-maven' },
        { ext: '.log', expected: 'text/x-log' },
        { ext: '.diff', expected: 'text/x-diff' },
        { ext: '.patch', expected: 'text/x-patch' },
        { ext: '.csv', expected: 'text/csv' },
        { ext: '.tsv', expected: 'text/tab-separated-values' },
        { ext: '.rtf', expected: 'text/rtf' },
        { ext: '.vtt', expected: 'text/vtt' },
        { ext: '.srt', expected: 'text/x-subrip' },
        { ext: '.sub', expected: 'text/x-subviewer' },
        { ext: '.smi', expected: 'text/x-sami' },
        { ext: '.md', expected: 'text/markdown' },
        { ext: '.txt', expected: 'text/plain' },
        { ext: '.json', expected: 'application/json' },
        { ext: '.yaml', expected: 'application/x-yaml' },
        { ext: '.yml', expected: 'application/x-yaml' },
        { ext: '.unknown', expected: 'text/plain' }
      ];

      for (const testCase of testCases) {
        expect(loader.getMimeTypeForExtension(testCase.ext)).toBe(testCase.expected);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid JSON gracefully', async () => {
      const invalidJson = '{ "name": "Test", "invalid": json }';
      await fs.writeFile(path.join(resourcesDir, 'invalid.json'), invalidJson);

      const resources = await loader.loadDirectory('resources', 'resources');
      const resource = resources[0];

      // Should fall back to plain text
      expect(resource.mimeType).toBe('text/plain');
      expect(resource.content).toBe(invalidJson);
    });

    test('should handle invalid YAML gracefully', async () => {
      const invalidYaml = 'name: Test\ninvalid: yaml: content: [';
      await fs.writeFile(path.join(resourcesDir, 'invalid.yaml'), invalidYaml);

      const resources = await loader.loadDirectory('resources', 'resources');
      const resource = resources[0];

      // Should fall back to plain text
      expect(resource.mimeType).toBe('text/plain');
      expect(resource.content).toBe(invalidYaml);
    });
  });
});
