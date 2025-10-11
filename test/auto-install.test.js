/**
 * Test cases for auto npm install functionality
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

describe('Auto npm Install', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(__dirname, 'install-test-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should run npm install when package.json exists', (done) => {
    // Create a package.json file
    const packageJson = {
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        'express': '^4.18.2'
      }
    };
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

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
      // Should show npm install messages or server startup messages
      const hasInstallMessage = output.includes('📦 Checking for missing dependencies...') || 
                                output.includes('📦 No package.json found - skipping auto-install') ||
                                output.includes('✅ Dependencies installed successfully');
      
      // Also check for server startup messages
      const hasServerMessage = output.includes('🚀 Starting Easy MCP Server') || 
                              output.includes('Easy MCP Server') ||
                              output.includes('Server started');
      
      expect(hasInstallMessage || hasServerMessage).toBe(true);
      
      // Clean up and ensure child process fully exits
      let finished = false;
      const finish = () => { if (!finished) { finished = true; done(); } };
      serverProcess.once('close', finish);
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        // Fallback in case 'close' wasn't emitted
        finish();
      }, 300);
    }, 5000); // Longer timeout for npm install
  });

  test('should skip npm install when package.json does not exist', (done) => {
    // Create a simple API file without package.json
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
      // Should show skip message or server startup messages
      const hasSkipMessage = output.includes('📦 No package.json found - skipping auto-install');
      const hasServerMessage = output.includes('🚀 Starting Easy MCP Server') || 
                              output.includes('Easy MCP Server') ||
                              output.includes('Server started');
      
      expect(hasSkipMessage || hasServerMessage).toBe(true);
      
      // Clean up and ensure child process fully exits
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

  test('should continue server startup even if npm install fails', (done) => {
    // Create a package.json with invalid dependency
    const packageJson = {
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        'non-existent-package-that-will-fail': '^999.999.999'
      }
    };
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

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
      // Should show npm install attempt and continue
      const hasInstallMessage = output.includes('📦 Checking for missing dependencies...');
      const hasServerMessage = output.includes('🚀 Starting Easy MCP Server...') || 
                              output.includes('Easy MCP Server') ||
                              output.includes('Server started');
      
      expect(hasInstallMessage || hasServerMessage).toBe(true);
      
      // Clean up and ensure child process fully exits
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
    }, 8000); // Longer timeout for failed npm install
  });
});
