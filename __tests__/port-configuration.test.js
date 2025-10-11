/**
 * Test cases for port configuration functionality
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

describe('Port Configuration', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(__dirname, 'port-test-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should use default ports when no configuration provided', (done) => {
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
    const serverProcess = spawn('node', ['../../src/easy-mcp-server.js'], {
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
      // Should use default ports
      expect(output).toContain('🚀 Starting Easy MCP Server...');
      
      // Clean up
      let finished = false;
      const finish = () => { if (!finished) { finished = true; done(); } };
      serverProcess.once('close', finish);
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        finish();
      }, 300);
    }, 3000);
  });

  test('should use CLI port arguments', (done) => {
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

    // Start the server with default ports
    const serverProcess = spawn('node', ['../../src/easy-mcp-server.js'], {
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
      // Should use custom ports
      expect(output).toContain('🚀 Starting Easy MCP Server...');
      
      // Clean up
      let finished2 = false;
      const finish2 = () => { if (!finished2) { finished2 = true; done(); } };
      serverProcess.once('close', finish2);
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        finish2();
      }, 300);
    }, 3000);
  });

  test('should use EASY_MCP_SERVER_PORT environment variables for port configuration', (done) => {
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

    // Create .env file with port configuration
    const envContent = `
EASY_MCP_SERVER_PORT=8887
EASY_MCP_SERVER_MCP_PORT=8888
`;
    fs.writeFileSync(path.join(tempDir, '.env'), envContent);

    // Start the server
    const serverProcess = spawn('node', ['../../src/easy-mcp-server.js'], {
      stdio: 'pipe',
      cwd: tempDir,
      env: {
        ...process.env,
        EASY_MCP_SERVER_PORT: '8887',
        EASY_MCP_SERVER_MCP_PORT: '8888'
      }
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
      // Should load .env and use configured ports
      expect(output).toContain('📄 Loaded environment from .env');
      expect(output).toContain('🚀 Starting Easy MCP Server...');
      
      // Clean up
      let finished3 = false;
      const finish3 = () => { if (!finished3) { finished3 = true; done(); } };
      serverProcess.once('close', finish3);
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        finish3();
      }, 300);
    }, 3000);
  });

  test('should use fallback environment variables for port configuration', (done) => {
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

    // Create .env file with fallback port configuration
    const envContent = `
PORT=8887
MCP_PORT=8888
`;
    fs.writeFileSync(path.join(tempDir, '.env'), envContent);

    // Start the server
    const serverProcess = spawn('node', ['../../src/easy-mcp-server.js'], {
      stdio: 'pipe',
      cwd: tempDir,
      env: {
        ...process.env,
        PORT: '8887',
        MCP_PORT: '8888'
      }
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
      // Should load .env and use configured ports
      expect(output).toContain('📄 Loaded environment from .env');
      expect(output).toContain('🚀 Starting Easy MCP Server...');
      
      // Clean up
      let finished4 = false;
      const finish4 = () => { if (!finished4) { finished4 = true; done(); } };
      serverProcess.once('close', finish4);
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        finish4();
      }, 300);
    }, 3000);
  });

  test('should prioritize CLI arguments over environment variables', (done) => {
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

    // Start the server with environment variables
    const serverProcess = spawn('node', ['../../src/easy-mcp-server.js'], {
      stdio: 'pipe',
      cwd: tempDir,
      env: {
        ...process.env,
        EASY_MCP_SERVER_PORT: '9997',
        EASY_MCP_SERVER_MCP_PORT: '9998'
      }
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
      // Should use CLI arguments, not environment variables
      expect(output).toContain('🚀 Starting Easy MCP Server...');
      
      // Clean up
      let finished5 = false;
      const finish5 = () => { if (!finished5) { finished5 = true; done(); } };
      serverProcess.once('close', finish5);
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        finish5();
      }, 300);
    }, 3000);
  });
});
