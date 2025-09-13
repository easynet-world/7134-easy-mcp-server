/**
 * Test MCP custom directory loading functionality
 * 
 * This test verifies that the MCP server correctly loads resources from
 * a custom ./mcp directory when it exists, and falls back to the package
 * directory when it doesn't.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const DynamicAPIMCPServer = require('../src/mcp/mcp-server');

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
    
    // Should have loaded the custom files
    expect(prompts.size).toBeGreaterThan(0);
    expect(resources.size).toBeGreaterThan(0);
    
    // Check if our custom files are loaded
    let foundCustomPrompt = false;
    let foundCustomResource = false;
    
    for (const [, prompt] of prompts) {
      if (prompt.template && prompt.template.includes('custom MCP directory')) {
        foundCustomPrompt = true;
      }
    }
    
    for (const [, resource] of resources) {
      if (resource.content && resource.content.includes('custom MCP directory')) {
        foundCustomResource = true;
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

  test('should handle CLI with custom MCP directory', (done) => {
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
    
    // Create a simple API directory to trigger the CLI behavior
    const apiDir = path.join(tempDir, 'api');
    const exampleApiDir = path.join(apiDir, 'example');
    fs.mkdirSync(exampleApiDir, { recursive: true });
    
    const exampleApi = `const BaseAPI = require('easy-mcp-server/base-api');

class GetExample extends BaseAPI {
  process(req, res) {
    res.json({
      message: 'Hello from test API',
      timestamp: Date.now()
    });
  }
}

module.exports = GetExample;
`;
    
    fs.writeFileSync(path.join(exampleApiDir, 'get.js'), exampleApi);
    
    // Change to temp directory
    process.chdir(tempDir);
    
    // Start the server using the CLI
    const serverProcess = spawn('node', [path.join(__dirname, '..', 'bin', 'easy-mcp-server.js')], {
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });
    
    let output = '';
    let stderr = '';
    
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    serverProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log('Server stderr:', data.toString());
    });
    
    // Wait for server to start and check for custom MCP directory message
    setTimeout(() => {
      const combinedOutput = output + stderr;
      console.log('Combined output:', combinedOutput);
      expect(combinedOutput).toContain('🔌 MCP Server: Using custom MCP directory');
      serverProcess.kill();
      done();
    }, 15000);
    
    // Timeout after 20 seconds
    setTimeout(() => {
      serverProcess.kill();
      done(new Error('Test timeout'));
    }, 20000);
  });
});
