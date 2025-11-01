const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Import the MCP server
const DynamicAPIMCPServer = require('../src/mcp');

describe('MCP Root Static Serving', () => {
  let mcpServer;
  let tempDir;
  let customHtmlPath;
  let serverPort;

  beforeAll(async () => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-info-test-'));
    customHtmlPath = path.join(tempDir, 'custom-mcp-info.html');
    // Ensure MCP HTTP static directory points to project public
    process.env.EASY_MCP_SERVER_STATIC_DIRECTORY = path.resolve('./public');
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

  test('serves public/index.html at root when present', async () => {
    const publicDir = path.resolve('./public');
    const indexPath = path.join(publicDir, 'index.html');
    const backupPath = path.join(publicDir, 'index.backup.test.html');

    // Backup existing index if present
    if (fs.existsSync(indexPath)) {
      fs.renameSync(indexPath, backupPath);
    }

    // Create a minimal index.html for test
    fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(indexPath, '<!doctype html><html><head><title>Public Index</title></head><body><h1>Public Root</h1></body></html>');

    try {
      const response = await makeRequest('/');
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('Public Root');
    } finally {
      // Restore original file if backed up
      if (fs.existsSync(backupPath)) {
        fs.renameSync(backupPath, indexPath);
      } else if (fs.existsSync(indexPath)) {
        fs.unlinkSync(indexPath);
      }
    }
  });

  test('ignores project-root mcp-info.html and still serves public index', async () => {
    const publicDir = path.resolve('./public');
    const indexPath = path.join(publicDir, 'index.html');
    const backupPath = path.join(publicDir, 'index.backup.test.html');
    const projectRootHtmlPath = path.join(process.cwd(), 'mcp-info.html');

    // Backup existing index if present
    if (fs.existsSync(indexPath)) {
      fs.renameSync(indexPath, backupPath);
    }
    fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(indexPath, '<!doctype html><html><body><h1>Public Root 2</h1></body></html>');

    // Write a project-root mcp-info.html which should be ignored now
    fs.writeFileSync(projectRootHtmlPath, '<!doctype html><html><body><h1>Project MCP Info</h1></body></html>');

    try {
      const response = await makeRequest('/');
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('Public Root 2');
      expect(response.text).not.toContain('Project MCP Info');
    } finally {
      if (fs.existsSync(projectRootHtmlPath)) fs.unlinkSync(projectRootHtmlPath);
      if (fs.existsSync(backupPath)) {
        fs.renameSync(backupPath, indexPath);
      } else if (fs.existsSync(indexPath)) {
        fs.unlinkSync(indexPath);
      }
    }
  });

  test('ignores EASY_MCP_SERVER_MCP_INFO_HTML_PATH and serves public index', async () => {
    const publicDir = path.resolve('./public');
    const indexPath = path.join(publicDir, 'index.html');
    const backupPath = path.join(publicDir, 'index.backup.test.html');

    if (fs.existsSync(indexPath)) {
      fs.renameSync(indexPath, backupPath);
    }
    fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(indexPath, '<!doctype html><html><body><h1>Public Root 3</h1></body></html>');

    // Create an env HTML file which should be ignored
    fs.writeFileSync(customHtmlPath, '<!doctype html><html><body><h1>Env MCP Info</h1></body></html>');
    const originalEnv = process.env.EASY_MCP_SERVER_MCP_INFO_HTML_PATH;
    process.env.EASY_MCP_SERVER_MCP_INFO_HTML_PATH = customHtmlPath;

    try {
      const response = await makeRequest('/');
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('Public Root 3');
      expect(response.text).not.toContain('Env MCP Info');
    } finally {
      if (originalEnv) {
        process.env.EASY_MCP_SERVER_MCP_INFO_HTML_PATH = originalEnv;
      } else {
        delete process.env.EASY_MCP_SERVER_MCP_INFO_HTML_PATH;
      }
      if (fs.existsSync(backupPath)) {
        fs.renameSync(backupPath, indexPath);
      } else if (fs.existsSync(indexPath)) {
        fs.unlinkSync(indexPath);
      }
    }
  });

  test('always serves public index regardless of env or project files', async () => {
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
    const publicDir = path.resolve('./public');
    const indexPath = path.join(publicDir, 'index.html');
    const backupPath = path.join(publicDir, 'index.backup.test.html');

    // Write both files
    fs.writeFileSync(projectRootHtmlPath, projectRootHtml);
    fs.writeFileSync(customHtmlPath, envHtml);

    // Prepare public index which should be served
    if (fs.existsSync(indexPath)) {
      fs.renameSync(indexPath, backupPath);
    }
    fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(indexPath, '<!doctype html><html><body><h1>Public Root 4</h1></body></html>');

    // Set environment variable
    const originalEnv = process.env.EASY_MCP_SERVER_MCP_INFO_HTML_PATH;
    process.env.EASY_MCP_SERVER_MCP_INFO_HTML_PATH = customHtmlPath;

    try {
      const response = await makeRequest('/');

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('Public Root 4');
      expect(response.text).not.toContain('Environment MCP Server');
      expect(response.text).not.toContain('Project Root MCP Server');
    } finally {
      // Clean up files and environment
      if (fs.existsSync(projectRootHtmlPath)) {
        fs.unlinkSync(projectRootHtmlPath);
      }
      if (originalEnv) {
        process.env.EASY_MCP_SERVER_MCP_INFO_HTML_PATH = originalEnv;
      } else {
        delete process.env.EASY_MCP_SERVER_MCP_INFO_HTML_PATH;
      }
      if (fs.existsSync(backupPath)) {
        fs.renameSync(backupPath, indexPath);
      } else if (fs.existsSync(indexPath)) {
        fs.unlinkSync(indexPath);
      }
    }
  });

  test('returns 404 when public index missing and no static match', async () => {
    const publicDir = path.resolve('./public');
    const indexPath = path.join(publicDir, 'index.html');
    const backupPath = path.join(publicDir, 'index.backup.test.html');

    // Temporarily remove index.html if present
    if (fs.existsSync(indexPath)) {
      fs.renameSync(indexPath, backupPath);
    }

    try {
      const response = await makeRequest('/');
      // Root GET without index should 404 now
      expect(response.statusCode).toBe(404);
    } finally {
      if (fs.existsSync(backupPath)) {
        fs.renameSync(backupPath, indexPath);
      }
    }
  });

  test('static file serving works for non-root paths', async () => {
    const publicDir = path.resolve('./public');
    const filePath = path.join(publicDir, 'test.txt');
    const backupIndex = path.join(publicDir, 'index.backup.test.html');
    const indexPath = path.join(publicDir, 'index.html');

    // Ensure index exists for other tests, but this test targets non-root path
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
    if (fs.existsSync(indexPath)) fs.renameSync(indexPath, backupIndex);

    fs.writeFileSync(filePath, 'hello world');
    try {
      const response = await makeRequest('/test.txt');
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/plain/);
      expect(response.text).toContain('hello world');
    } finally {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      if (fs.existsSync(backupIndex)) fs.renameSync(backupIndex, indexPath);
    }
  });
});
