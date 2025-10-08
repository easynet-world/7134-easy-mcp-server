/**
 * Test MCP Server Hot Reload CRUD Operations
 * 
 * This test suite verifies that hot reloading works correctly for all CRUD operations
 * (Create, Read, Update, Delete) on both prompts and resources.
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const DynamicAPIMCPServer = require('../src/mcp/mcp-server');

describe('MCP Server Hot Reload CRUD Operations', () => {
  // Increase timeout for CI environments
  jest.setTimeout(30000);
  
  let mcpServer;
  let tempDir;
  let promptsDir;
  let resourcesDir;

  beforeAll(async () => {
    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-hot-reload-test-'));
    promptsDir = path.join(tempDir, 'prompts');
    resourcesDir = path.join(tempDir, 'resources');

    // Create directories
    await fs.mkdir(promptsDir, { recursive: true });
    await fs.mkdir(resourcesDir, { recursive: true });

    // Initialize MCP server with temp directory
    mcpServer = new DynamicAPIMCPServer('127.0.0.1', 0, {
      mcp: {
        basePath: tempDir
      }
    });

    // Initialize and start the server
    await mcpServer.loadPromptsAndResourcesFromFilesystem();
    await mcpServer.run();
    
    // Wait for file watchers to be fully initialized
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (mcpServer) {
      await mcpServer.stop();
    }
    
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up temp directory:', error.message);
    }
  });

  beforeEach(async () => {
    // Clear any existing files and directories
    const clearDirectory = async (dirPath) => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            await fs.rm(fullPath, { recursive: true, force: true });
          } else {
            await fs.unlink(fullPath);
          }
        }
      } catch (error) {
        // Directory might not exist, ignore error
      }
    };

    await clearDirectory(promptsDir);
    await clearDirectory(resourcesDir);

    // Clear server state
    mcpServer.prompts.clear();
    mcpServer.resources.clear();
  });

  describe('Prompts CRUD Operations', () => {
    test('should CREATE new prompt file and load it via hot reload', async () => {
      const promptContent = `# Test Prompt

This is a test prompt with parameters: {{param1}} and {{param2}}.

## Instructions
Use this prompt to test hot reload functionality.`;

      const promptFile = path.join(promptsDir, 'test-prompt.md');
      await fs.writeFile(promptFile, promptContent);

      // Wait for file watcher to detect the change - increased timeout for CI
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Wait for prompt to be loaded with retry logic for CI
      let retries = 0;
      while (mcpServer.prompts.size === 0 && retries < 20) {
        await new Promise(resolve => setTimeout(resolve, 200));
        retries++;
        console.log(`Retry ${retries}: prompts.size = ${mcpServer.prompts.size}`);
      }

      // Check if prompt was loaded
      console.log(`Final prompts.size = ${mcpServer.prompts.size}`);
      expect(mcpServer.prompts.size).toBeGreaterThan(0);
      
      const prompt = Array.from(mcpServer.prompts.values())[0];
      expect(prompt.name).toBe('test-prompt');
      expect(prompt.template).toContain('{{param1}}');
      expect(prompt.template).toContain('{{param2}}');
      expect(prompt.arguments).toHaveLength(2);
      expect(prompt.arguments.map(arg => arg.name)).toContain('param1');
      expect(prompt.arguments.map(arg => arg.name)).toContain('param2');
    });

    test('should UPDATE existing prompt file and reload it via hot reload', async () => {
      // Create initial prompt
      const initialContent = `# Initial Prompt
This is the initial content with {{oldParam}}.`;
      
      const promptFile = path.join(promptsDir, 'update-test.md');
      await fs.writeFile(promptFile, initialContent);

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify initial state
      expect(mcpServer.prompts.size).toBe(1);
      let prompt = Array.from(mcpServer.prompts.values())[0];
      expect(prompt.template).toContain('{{oldParam}}');
      expect(prompt.arguments).toHaveLength(1);

      // Update the prompt
      const updatedContent = `# Updated Prompt
This is the updated content with {{newParam1}} and {{newParam2}}.
Additional content for testing.`;

      await fs.writeFile(promptFile, updatedContent);

      // Wait for hot reload
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify update
      expect(mcpServer.prompts.size).toBe(1);
      prompt = Array.from(mcpServer.prompts.values())[0];
      expect(prompt.template).toContain('{{newParam1}}');
      expect(prompt.template).toContain('{{newParam2}}');
      expect(prompt.template).not.toContain('{{oldParam}}');
      expect(prompt.arguments).toHaveLength(2);
      expect(prompt.arguments.map(arg => arg.name)).toContain('newParam1');
      expect(prompt.arguments.map(arg => arg.name)).toContain('newParam2');
    });

    test('should DELETE prompt file and remove it via hot reload', async () => {
      // Create a prompt
      const promptContent = `# Delete Test Prompt
This prompt will be deleted.`;
      
      const promptFile = path.join(promptsDir, 'delete-test.md');
      await fs.writeFile(promptFile, promptContent);

      // Wait for load
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify it's loaded
      expect(mcpServer.prompts.size).toBe(1);

      // Delete the file
      await fs.unlink(promptFile);

      // Wait for hot reload
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify it's removed
      expect(mcpServer.prompts.size).toBe(0);
    });

    test('should handle nested directory structure for prompts', async () => {
      // Create nested directory
      const nestedDir = path.join(promptsDir, 'category1', 'subcategory');
      await fs.mkdir(nestedDir, { recursive: true });

      const promptContent = `# Nested Prompt
This is a nested prompt with {{nestedParam}}.`;

      const promptFile = path.join(nestedDir, 'nested-prompt.md');
      await fs.writeFile(promptFile, promptContent);

      // Wait for hot reload - increased timeout for nested directory detection
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify nested prompt is loaded
      expect(mcpServer.prompts.size).toBe(1);
      const prompt = Array.from(mcpServer.prompts.values())[0];
      expect(prompt.name).toBe('category1_subcategory_nested-prompt');
      expect(prompt.template).toContain('{{nestedParam}}');
    });
  });

  describe('Resources CRUD Operations', () => {
    test('should CREATE new resource file and load it via hot reload', async () => {
      const resourceContent = `# Test Resource

This is a test resource with some content.

## Features
- Feature 1
- Feature 2
- Feature 3`;

      const resourceFile = path.join(resourcesDir, 'test-resource.md');
      await fs.writeFile(resourceFile, resourceContent);

      // Wait for file watcher to detect the change - increased timeout for CI
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Wait for resource to be loaded with retry logic for CI
      let retries = 0;
      while (mcpServer.resources.size === 0 && retries < 20) {
        await new Promise(resolve => setTimeout(resolve, 200));
        retries++;
      }

      // Check if resource was loaded
      expect(mcpServer.resources.size).toBeGreaterThan(0);
      
      const resource = Array.from(mcpServer.resources.values())[0];
      expect(resource.name).toBe('test-resource');
      expect(resource.uri).toBe('resource://test-resource.md');
      expect(resource.content).toContain('Test Resource');
      expect(resource.mimeType).toBe('text/markdown');
    });

    test('should UPDATE existing resource file and reload it via hot reload', async () => {
      // Create initial resource
      const initialContent = `# Initial Resource
This is the initial content.`;
      
      const resourceFile = path.join(resourcesDir, 'update-test.md');
      await fs.writeFile(resourceFile, initialContent);

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify initial state
      expect(mcpServer.resources.size).toBe(1);
      let resource = Array.from(mcpServer.resources.values())[0];
      expect(resource.content).toContain('Initial Resource');

      // Update the resource
      const updatedContent = `# Updated Resource
This is the updated content with more information.

## New Section
- New item 1
- New item 2`;

      await fs.writeFile(resourceFile, updatedContent);

      // Wait for hot reload
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify update
      expect(mcpServer.resources.size).toBe(1);
      resource = Array.from(mcpServer.resources.values())[0];
      expect(resource.content).toContain('Updated Resource');
      expect(resource.content).toContain('New Section');
      expect(resource.content).not.toContain('Initial Resource');
    });

    test('should DELETE resource file and remove it via hot reload', async () => {
      // Create a resource
      const resourceContent = `# Delete Test Resource
This resource will be deleted.`;
      
      const resourceFile = path.join(resourcesDir, 'delete-test.md');
      await fs.writeFile(resourceFile, resourceContent);

      // Wait for load
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify it's loaded
      expect(mcpServer.resources.size).toBe(1);

      // Delete the file
      await fs.unlink(resourceFile);

      // Wait for hot reload
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify it's removed
      expect(mcpServer.resources.size).toBe(0);
    });

    test('should handle nested directory structure for resources', async () => {
      // Create nested directory
      const nestedDir = path.join(resourcesDir, 'templates', 'v1');
      await fs.mkdir(nestedDir, { recursive: true });

      const resourceFile = path.join(nestedDir, 'nested-resource.json');
      await fs.writeFile(resourceFile, JSON.stringify({
        name: 'nested-resource',
        content: 'This is a nested resource.',
        version: '1.0.0'
      }, null, 2));

      // Wait for hot reload
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify nested resource is loaded
      expect(mcpServer.resources.size).toBe(1);
      const resource = Array.from(mcpServer.resources.values())[0];
      expect(resource.name).toBe('nested-resource');
      expect(resource.uri).toBe('resource://templates/v1/nested-resource.json');
    });

    test('should handle JSON resource files', async () => {
      const jsonContent = {
        name: 'test-json-resource',
        description: 'A JSON resource for testing',
        data: {
          items: ['item1', 'item2', 'item3'],
          config: {
            enabled: true,
            timeout: 5000
          }
        }
      };

      const resourceFile = path.join(resourcesDir, 'test.json');
      await fs.writeFile(resourceFile, JSON.stringify(jsonContent, null, 2));

      // Wait for hot reload
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify JSON resource is loaded
      expect(mcpServer.resources.size).toBe(1);
      const resource = Array.from(mcpServer.resources.values())[0];
      expect(resource.name).toBe('test-json-resource'); // The name comes from the JSON content
      expect(resource.uri).toBe('resource://test.json');
      expect(resource.content).toContain('test-json-resource');
    });
  });

  describe('Mixed CRUD Operations', () => {
    test('should handle multiple simultaneous changes', async () => {
      // Create multiple files simultaneously
      const promptContent = `# Multi Test Prompt
This prompt has {{param1}} and {{param2}}.`;

      const resourceContent = `# Multi Test Resource
This resource has some content.`;

      const promptFile = path.join(promptsDir, 'multi-prompt.md');
      const resourceFile = path.join(resourcesDir, 'multi-resource.md');

      await Promise.all([
        fs.writeFile(promptFile, promptContent),
        fs.writeFile(resourceFile, resourceContent)
      ]);

      // Wait for hot reload with retry logic
      let retries = 0;
      while ((mcpServer.prompts.size === 0 || mcpServer.resources.size === 0) && retries < 20) {
        await new Promise(resolve => setTimeout(resolve, 200));
        retries++;
        console.log(`Retry ${retries}: prompts.size = ${mcpServer.prompts.size}, resources.size = ${mcpServer.resources.size}`);
      }
      console.log(`Final: prompts.size = ${mcpServer.prompts.size}, resources.size = ${mcpServer.resources.size}`);

      // Verify both are loaded
      expect(mcpServer.prompts.size).toBe(1);
      expect(mcpServer.resources.size).toBe(1);

      // Update both files
      const updatedPromptContent = `# Updated Multi Test Prompt
This prompt now has {{param1}}, {{param2}}, and {{param3}}.`;

      const updatedResourceContent = `# Updated Multi Test Resource
This resource now has updated content.`;

      await Promise.all([
        fs.writeFile(promptFile, updatedPromptContent),
        fs.writeFile(resourceFile, updatedResourceContent)
      ]);

      // Wait for hot reload with retry logic for updates
      let updateRetries = 0;
      let prompt = null;
      let resource = null;
      
      while (updateRetries < 20) {
        await new Promise(resolve => setTimeout(resolve, 200));
        updateRetries++;
        
        if (mcpServer.prompts.size === 1 && mcpServer.resources.size === 1) {
          prompt = Array.from(mcpServer.prompts.values())[0];
          resource = Array.from(mcpServer.resources.values())[0];
          
          // Check if the update has been applied
          if (prompt.arguments && prompt.arguments.length === 3 && 
              resource.content && resource.content.includes('updated content')) {
            break;
          }
        }
        console.log(`Update retry ${updateRetries}: prompt args = ${prompt?.arguments?.length || 'undefined'}, resource updated = ${resource?.content?.includes('updated content') || false}`);
      }

      // Verify updates
      expect(mcpServer.prompts.size).toBe(1);
      expect(mcpServer.resources.size).toBe(1);

      expect(prompt.arguments).toHaveLength(3);
      expect(resource.content).toContain('updated content');

      // Delete both files
      await Promise.all([
        fs.unlink(promptFile),
        fs.unlink(resourceFile)
      ]);

      // Wait for hot reload
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify both are removed
      expect(mcpServer.prompts.size).toBe(0);
      expect(mcpServer.resources.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid file formats gracefully', async () => {
      // Create a file with unsupported extension (using a truly unsupported extension)
      const invalidFile = path.join(promptsDir, 'invalid-file.xyz');
      await fs.writeFile(invalidFile, 'This is not a supported format');

      // Wait for hot reload
      await new Promise(resolve => setTimeout(resolve, 200));

      // Since MCP server is configured with formats: ['*'], it should load all files
      expect(mcpServer.prompts.size).toBe(1);
      const prompt = Array.from(mcpServer.prompts.values())[0];
      expect(prompt.name).toBe('invalid-file');
      expect(prompt.template).toBe('This is not a supported format');
    });

    test('should handle malformed JSON gracefully', async () => {
      // Create malformed JSON
      const malformedJson = path.join(resourcesDir, 'malformed.json');
      await fs.writeFile(malformedJson, '{ invalid json content');

      // Wait for hot reload
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should load the file as plain text (graceful fallback)
      expect(mcpServer.resources.size).toBe(1);
      const resource = Array.from(mcpServer.resources.values())[0];
      expect(resource.name).toBe('malformed');
      expect(resource.content).toBe('{ invalid json content');
    });
  });
});
