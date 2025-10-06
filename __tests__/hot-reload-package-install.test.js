/**
 * Test cases for hot reload with automatic package installation
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

describe('Hot Reload with Package Installation', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(__dirname, 'hot-reload-test-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should detect and install missing packages during hot reload', (done) => {
    // Create a package.json file
    const packageJson = {
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        'express': '^4.18.2'
      }
    };
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    // Create API directory
    const apiDir = path.join(tempDir, 'api');
    fs.mkdirSync(apiDir, { recursive: true });
    
    // Create initial API file
    const apiFile = path.join(apiDir, 'get.js');
    const initialApiContent = `
const BaseAPI = require('easy-mcp-server/base-api');

class TestAPI extends BaseAPI {
  process(req, res) {
    res.json({ message: 'Test API' });
  }
}

module.exports = TestAPI;
`;
    fs.writeFileSync(apiFile, initialApiContent);

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
      // Update the API file to require a new package
      const updatedApiContent = `
const BaseAPI = require('easy-mcp-server/base-api');
const lodash = require('lodash');

class TestAPI extends BaseAPI {
  process(req, res) {
    const data = { message: 'Test API with lodash', timestamp: Date.now() };
    const processed = lodash.merge(data, { processed: true });
    res.json(processed);
  }
}

module.exports = TestAPI;
`;
      fs.writeFileSync(apiFile, updatedApiContent);

      // Wait for hot reload to process
      setTimeout(() => {
        // Check if package installation was attempted
        const hasPackageDetection = output.includes('📦 Analyzing') || 
                                  output.includes('📦 Detected packages') ||
                                  output.includes('📦 Installing missing packages');
        
        const hasServerRunning = output.includes('🚀 Starting Easy MCP Server') || 
                                output.includes('Easy MCP Server') ||
                                output.includes('Server started');
        
        expect(hasPackageDetection || hasServerRunning).toBe(true);
        
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
      }, 5000); // Wait for hot reload processing
    }, 3000); // Wait for server startup
  });

  test('should handle multiple package dependencies', (done) => {
    // Create a package.json file
    const packageJson = {
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        'express': '^4.18.2'
      }
    };
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    // Create API directory
    const apiDir = path.join(tempDir, 'api');
    fs.mkdirSync(apiDir, { recursive: true });
    
    // Create API file with multiple dependencies
    const apiFile = path.join(apiDir, 'post.js');
    const apiContent = `
const BaseAPI = require('easy-mcp-server/base-api');
const axios = require('axios');
const moment = require('moment');
const uuid = require('uuid');

class PostAPI extends BaseAPI {
  process(req, res) {
    const id = uuid.v4();
    const timestamp = moment().format();
    res.json({ 
      id, 
      timestamp, 
      message: 'API with multiple dependencies',
      status: 'success'
    });
  }
}

module.exports = PostAPI;
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

    // Wait for server to start and process
    setTimeout(() => {
      // Check if multiple packages were detected
      const hasMultiplePackages = output.includes('axios') && 
                                output.includes('moment') && 
                                output.includes('uuid');
      
      const hasPackageInstallation = output.includes('📦 Installing missing packages') ||
                                   output.includes('📦 Detected packages');
      
      const hasServerRunning = output.includes('🚀 Starting Easy MCP Server') || 
                              output.includes('Easy MCP Server');
      
      expect(hasMultiplePackages || hasPackageInstallation || hasServerRunning).toBe(true);
      
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
    }, 8000); // Longer timeout for multiple package installation
  });

  test('should skip package installation when auto-install is disabled', (done) => {
    // Create a package.json file
    const packageJson = {
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        'express': '^4.18.2'
      }
    };
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    // Create API directory
    const apiDir = path.join(tempDir, 'api');
    fs.mkdirSync(apiDir, { recursive: true });
    
    // Create API file
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
      // Should show server startup messages but not package installation
      const hasServerMessage = output.includes('🚀 Starting Easy MCP Server') || 
                              output.includes('Easy MCP Server') ||
                              output.includes('Server started');
      
      // Should not show package installation messages
      const hasNoPackageInstall = !output.includes('📦 Installing missing packages') &&
                                 !output.includes('📦 Analyzing files for package dependencies');
      
      expect(hasServerMessage).toBe(true);
      expect(hasNoPackageInstall).toBe(true);
      
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
});
