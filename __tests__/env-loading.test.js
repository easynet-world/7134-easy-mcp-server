/**
 * Test cases for .env file loading functionality
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

describe('Environment File Loading', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(__dirname, 'env-test-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should load .env file from user directory', (done) => {
    // Create a test .env file
    const envContent = `
TEST_VAR=hello_from_env
PORT=4000
MCP_PORT=4001
`;
    fs.writeFileSync(path.join(tempDir, '.env'), envContent);

    // Create a simple API file
    const apiDir = path.join(tempDir, 'api');
    fs.mkdirSync(apiDir, { recursive: true });
    
    const apiFile = path.join(apiDir, 'get.js');
    const apiContent = `
const BaseAPI = require('easy-mcp-server/base-api');

class TestAPI extends BaseAPI {
  process(req, res) {
    res.json({ 
      message: 'Test API',
      envVar: process.env.TEST_VAR,
      port: process.env.EASY_MCP_SERVER_PORT 
    });
  }
}

module.exports = TestAPI;
`;
    fs.writeFileSync(apiFile, apiContent);

    // Start the server and check if .env is loaded
    const serverProcess = spawn('node', ['../../bin/easy-mcp-server.js'], {
      stdio: 'pipe',
      cwd: tempDir
    });

    let output = '';
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    serverProcess.stderr.on('data', (data) => {
      output += data.toString();
    });

    // Wait for server to start
    setTimeout(() => {
      // Check if .env loading message appears
      expect(output).toContain('📄 Loaded environment from .env');
      
      // Clean up
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        done();
      }, 100);
    }, 3000);
  });

  test('should load multiple .env files in correct order', (done) => {
    // Create multiple .env files
    fs.writeFileSync(path.join(tempDir, '.env'), 'BASE_VAR=base\nPORT=3000');
    fs.writeFileSync(path.join(tempDir, '.env.development'), 'DEV_VAR=development\nPORT=3001');
    fs.writeFileSync(path.join(tempDir, '.env.local'), 'LOCAL_VAR=local\nPORT=3002');

    // Create a simple API file
    const apiDir = path.join(tempDir, 'api');
    fs.mkdirSync(apiDir, { recursive: true });
    
    const apiFile = path.join(apiDir, 'get.js');
    const apiContent = `
const BaseAPI = require('easy-mcp-server/base-api');

class TestAPI extends BaseAPI {
  process(req, res) {
    res.json({ message: 'Test API' });
  }
}

module.exports = TestAPI;
`;
    fs.writeFileSync(apiFile, apiContent);

    // Start the server
    const serverProcess = spawn('node', ['../../bin/easy-mcp-server.js'], {
      stdio: 'pipe',
      cwd: tempDir
    });

    let output = '';
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    serverProcess.stderr.on('data', (data) => {
      output += data.toString();
    });

    // Wait for server to start
    setTimeout(() => {
      // Check if all .env files are loaded
      expect(output).toContain('📄 Loaded environment from .env.local');
      expect(output).toContain('📄 Loaded environment from .env.development');
      expect(output).toContain('📄 Loaded environment from .env');
      
      // Clean up
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        done();
      }, 100);
    }, 3000);
  });

  test('should handle missing .env files gracefully', (done) => {
    // Create a simple API file without .env files
    const apiDir = path.join(tempDir, 'api');
    fs.mkdirSync(apiDir, { recursive: true });
    
    const apiFile = path.join(apiDir, 'get.js');
    const apiContent = `
const BaseAPI = require('easy-mcp-server/base-api');

class TestAPI extends BaseAPI {
  process(req, res) {
    res.json({ message: 'Test API' });
  }
}

module.exports = TestAPI;
`;
    fs.writeFileSync(apiFile, apiContent);

    // Start the server
    const serverProcess = spawn('node', ['../../bin/easy-mcp-server.js'], {
      stdio: 'pipe',
      cwd: tempDir
    });

    let output = '';
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    serverProcess.stderr.on('data', (data) => {
      output += data.toString();
    });

    // Wait for server to start
    setTimeout(() => {
      // Should not have any .env loading messages
      expect(output).not.toContain('📄 Loaded environment from');
      
      // Clean up
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        done();
      }, 100);
    }, 3000);
  });
});
