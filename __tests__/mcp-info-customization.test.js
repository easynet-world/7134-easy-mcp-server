const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Import the MCP server
const DynamicAPIMCPServer = require('../src/mcp/mcp-server');

describe('MCP Info Page Customization', () => {
  let mcpServer;
  let tempDir;
  let customHtmlPath;
  let serverPort;

  beforeAll(async () => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-info-test-'));
    customHtmlPath = path.join(tempDir, 'custom-mcp-info.html');
    
    // Start MCP server on a random port
    serverPort = 3001 + Math.floor(Math.random() * 1000);
    mcpServer = new DynamicAPIMCPServer('127.0.0.1', serverPort);
    await mcpServer.run();
  });

  afterAll(async () => {
    if (mcpServer) {
      mcpServer.stop();
    }
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Helper function to make HTTP requests to MCP server
  const makeRequest = (path = '/') => {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: '127.0.0.1',
        port: serverPort,
        path: path,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            text: data
          });
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    });
  };

  test('should serve default MCP info page when no custom file exists', async () => {
    const response = await makeRequest('/');

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('Easy MCP Server');
    expect(response.text).toContain('Model Context Protocol Server');
  });

  test('should serve custom HTML file from project root', async () => {
    // Create a custom HTML file in project root
    const customHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>My Custom MCP Server</title>
</head>
<body>
    <h1>🚀 My Custom MCP Server</h1>
    <p>This is my custom MCP info page!</p>
</body>
</html>`;

    const projectRootHtmlPath = path.join(process.cwd(), 'mcp-info.html');
    
    // Write custom HTML to project root
    fs.writeFileSync(projectRootHtmlPath, customHtml);

    try {
      const response = await makeRequest('/');

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('My Custom MCP Server');
      expect(response.text).toContain('This is my custom MCP info page!');
    } finally {
      // Clean up the custom HTML file
      if (fs.existsSync(projectRootHtmlPath)) {
        fs.unlinkSync(projectRootHtmlPath);
      }
    }
  });

  test('should serve custom HTML file from environment variable path', async () => {
    // Create a custom HTML file
    const customHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Environment Custom MCP Server</title>
</head>
<body>
    <h1>🌍 Environment Custom MCP Server</h1>
    <p>This is loaded from environment variable!</p>
</body>
</html>`;

    fs.writeFileSync(customHtmlPath, customHtml);

    // Set environment variable
    const originalEnv = process.env.MCP_INFO_HTML_PATH;
    process.env.MCP_INFO_HTML_PATH = customHtmlPath;

    try {
      const response = await makeRequest('/');

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('Environment Custom MCP Server');
      expect(response.text).toContain('This is loaded from environment variable!');
    } finally {
      // Restore original environment variable
      if (originalEnv) {
        process.env.MCP_INFO_HTML_PATH = originalEnv;
      } else {
        delete process.env.MCP_INFO_HTML_PATH;
      }
    }
  });

  test('should prioritize environment variable over project root file', async () => {
    // Create two different custom HTML files
    const projectRootHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Project Root MCP Server</title>
</head>
<body>
    <h1>📁 Project Root MCP Server</h1>
    <p>This is from project root!</p>
</body>
</html>`;

    const envHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Environment MCP Server</title>
</head>
<body>
    <h1>🌍 Environment MCP Server</h1>
    <p>This is from environment variable!</p>
</body>
</html>`;

    const projectRootHtmlPath = path.join(process.cwd(), 'mcp-info.html');
    
    // Write both files
    fs.writeFileSync(projectRootHtmlPath, projectRootHtml);
    fs.writeFileSync(customHtmlPath, envHtml);

    // Set environment variable
    const originalEnv = process.env.MCP_INFO_HTML_PATH;
    process.env.MCP_INFO_HTML_PATH = customHtmlPath;

    try {
      const response = await makeRequest('/');

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      // Should serve the environment variable file, not the project root file
      expect(response.text).toContain('Environment MCP Server');
      expect(response.text).toContain('This is from environment variable!');
      expect(response.text).not.toContain('Project Root MCP Server');
    } finally {
      // Clean up files and environment
      if (fs.existsSync(projectRootHtmlPath)) {
        fs.unlinkSync(projectRootHtmlPath);
      }
      if (originalEnv) {
        process.env.MCP_INFO_HTML_PATH = originalEnv;
      } else {
        delete process.env.MCP_INFO_HTML_PATH;
      }
    }
  });

  test('should handle missing custom HTML file gracefully', async () => {
    // Set environment variable to non-existent file
    const originalEnv = process.env.MCP_INFO_HTML_PATH;
    process.env.MCP_INFO_HTML_PATH = '/path/to/nonexistent/file.html';

    try {
      const response = await makeRequest('/');

      // Should fall back to default page
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('Easy MCP Server');
    } finally {
      // Restore original environment variable
      if (originalEnv) {
        process.env.MCP_INFO_HTML_PATH = originalEnv;
      } else {
        delete process.env.MCP_INFO_HTML_PATH;
      }
    }
  });

  test('should handle invalid HTML file gracefully', async () => {
    // Create an invalid HTML file
    const invalidHtml = 'This is not valid HTML content';
    fs.writeFileSync(customHtmlPath, invalidHtml);

    // Set environment variable
    const originalEnv = process.env.MCP_INFO_HTML_PATH;
    process.env.MCP_INFO_HTML_PATH = customHtmlPath;

    try {
      const response = await makeRequest('/');

      // Should still serve the file (even if invalid HTML)
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('This is not valid HTML content');
    } finally {
      // Restore original environment variable
      if (originalEnv) {
        process.env.MCP_INFO_HTML_PATH = originalEnv;
      } else {
        delete process.env.MCP_INFO_HTML_PATH;
      }
    }
  });
});
