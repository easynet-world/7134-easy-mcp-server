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
      // Should show npm install messages
      expect(output).toContain('📦 Checking for missing dependencies...');
      
      // Clean up
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        done();
      }, 100);
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
      // Should show skip message
      expect(output).toContain('📦 No package.json found - skipping auto-install');
      
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
      // Should show npm install attempt and continue
      expect(output).toContain('📦 Checking for missing dependencies...');
      expect(output).toContain('🚀 Starting Easy MCP Server...');
      
      // Clean up
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        done();
      }, 100);
    }, 8000); // Longer timeout for failed npm install
  });
});
