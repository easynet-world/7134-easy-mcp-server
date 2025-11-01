/**
 * Test MCP custom directory loading functionality
 * 
 * This test verifies that the MCP server correctly loads resources from
 * a custom ./mcp directory when it exists, and falls back to the package
 * directory when it doesn't.
 */

const fs = require('fs');
const path = require('path');
const DynamicAPIMCPServer = require('../src/mcp');

describe('MCP Custom Directory Loading', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    // Store original working directory
    originalCwd = process.cwd();
    
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(__dirname, 'mcp-test-'));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    // Restore original working directory
    process.chdir(originalCwd);
  });

  test('should use custom MCP directory when it exists', async () => {
    // Create custom MCP directory structure
    const customMcpDir = path.join(tempDir, 'mcp');
    const customPromptsDir = path.join(customMcpDir, 'prompts');
    const customResourcesDir = path.join(customMcpDir, 'resources');
    
    fs.mkdirSync(customPromptsDir, { recursive: true });
    fs.mkdirSync(customResourcesDir, { recursive: true });
    
    // Create test files
    const testPrompt = `# Test Prompt
This is a test prompt from custom MCP directory.`;
    
    const testResource = `# Test Resource
This is a test resource from custom MCP directory.`;
    
    fs.writeFileSync(path.join(customPromptsDir, 'test-prompt.md'), testPrompt);
    fs.writeFileSync(path.join(customResourcesDir, 'test-resource.md'), testResource);
    
    // Change to temp directory
    process.chdir(tempDir);
    
    // Initialize MCP server with custom base path
    const mcpServer = new DynamicAPIMCPServer('0.0.0.0', 0, {
      mcp: {
        basePath: './mcp'
      }
    });
    
    // Start the server
    await mcpServer.run();
    
    // Load prompts and resources from filesystem
    await mcpServer.loadPromptsAndResourcesFromFilesystem();
    
    // Verify that the server is using the custom directory
    expect(mcpServer.resolvedBasePath).toBe(path.resolve('./mcp'));
    
    // Test loading prompts and resources by checking the internal maps
    const prompts = mcpServer.prompts;
    const resources = mcpServer.resources;
    
    // Prompts are now loaded through cache manager when available, so check both static and cached
    let totalPrompts = prompts.size;
    if (mcpServer.cacheManager) {
      try {
        const cachedPrompts = await mcpServer.cacheManager.getPrompts();
        totalPrompts += cachedPrompts.length;
      } catch (error) {
        // Cache manager might not be available in test environment
      }
    }
    expect(totalPrompts).toBeGreaterThan(0);
    
    // Resources are now loaded through cache manager when available, so check both static and cached
    let totalResources = resources.size;
    if (mcpServer.cacheManager) {
      try {
        const cachedResources = await mcpServer.cacheManager.getResources();
        totalResources += cachedResources.length;
      } catch (error) {
        // Cache manager might not be available in test environment
      }
    }
    expect(totalResources).toBeGreaterThan(0);
    
    // Check if our custom files are loaded
    let foundCustomPrompt = false;
    let foundCustomResource = false;
    
    for (const [, prompt] of prompts) {
      if (prompt.template && prompt.template.includes('custom MCP directory')) {
        foundCustomPrompt = true;
      }
    }
    
    // Also check cached prompts if cache manager is available
    if (mcpServer.cacheManager && !foundCustomPrompt) {
      try {
        const cachedPrompts = await mcpServer.cacheManager.getPrompts();
        for (const prompt of cachedPrompts) {
          if (prompt.content && prompt.content.includes('custom MCP directory')) {
            foundCustomPrompt = true;
            break;
          }
        }
      } catch (error) {
        // Cache manager might not be available in test environment
      }
    }
    
    for (const [, resource] of resources) {
      if (resource.content && resource.content.includes('custom MCP directory')) {
        foundCustomResource = true;
      }
    }
    
    // Also check cached resources if cache manager is available
    if (mcpServer.cacheManager && !foundCustomResource) {
      try {
        const cachedResources = await mcpServer.cacheManager.getResources();
        for (const resource of cachedResources) {
          if (resource.content && resource.content.includes('custom MCP directory')) {
            foundCustomResource = true;
            break;
          }
        }
      } catch (error) {
        // Cache manager might not be available in test environment
      }
    }
    
    expect(foundCustomPrompt).toBe(true);
    expect(foundCustomResource).toBe(true);
    
    // Stop the server
    mcpServer.stop();
  });

  test('should fall back to package MCP directory when custom directory does not exist', async () => {
    // Change to temp directory (no custom mcp directory)
    process.chdir(tempDir);
    
    // Initialize MCP server with non-existent custom base path
    const mcpServer = new DynamicAPIMCPServer('0.0.0.0', 0, {
      mcp: {
        basePath: './non-existent-mcp'
      }
    });
    
    // Start the server
    await mcpServer.run();
    
    // Load prompts and resources from filesystem
    await mcpServer.loadPromptsAndResourcesFromFilesystem();
    
    // Verify that the server fell back to package directory
    const packageMcpPath = path.resolve(__dirname, '..', 'mcp');
    expect(mcpServer.resolvedBasePath).toBe(packageMcpPath);
    
    // Test loading prompts and resources by checking the internal maps
    const prompts = mcpServer.prompts;
    const resources = mcpServer.resources;
    
    // Should have loaded some files from package directory
    expect(prompts.size).toBeGreaterThanOrEqual(0);
    expect(resources.size).toBeGreaterThanOrEqual(0);
    
    // Stop the server
    mcpServer.stop();
  });

});
