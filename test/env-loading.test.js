/**
 * Test cases for .env file loading functionality
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

describe('Environment File Loading', () => {
  let tempDir;
  let originalCwd;
  let serverProcesses = [];

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(__dirname, 'env-test-'));
    process.chdir(tempDir);
    serverProcesses = [];
  });

  afterEach((done) => {
    // Kill all spawned processes
    const killPromises = serverProcesses.map(proc => {
      return new Promise((resolve) => {
        if (proc && !proc.killed) {
          try {
            proc.kill('SIGTERM');
            // Wait a bit, then force kill if still alive
            setTimeout(() => {
              if (proc && !proc.killed) {
                try {
                  proc.kill('SIGKILL');
                } catch (e) {
                  // Ignore errors
                }
              }
              resolve();
            }, 200);
          } catch (e) {
            // Ignore errors
            resolve();
          }
        } else {
          resolve();
        }
      });
    });
    
    // Wait for all processes to be killed, then wait for ports to be released
    Promise.all(killPromises).then(() => {
      serverProcesses = [];
      // Wait longer for ports to be released by OS
      setTimeout(() => {
        process.chdir(originalCwd);
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {
          // Ignore cleanup errors
        }
        done();
      }, 1000);
    });
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
    const serverProcess = spawn('node', ['../../src/easy-mcp-server.js'], {
      stdio: 'pipe',
      cwd: tempDir
    });
    serverProcesses.push(serverProcess);

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

  test('should load multiple .env files in correct order', (done) => {
    jest.setTimeout(15000);
    // Create multiple .env files
    fs.writeFileSync(path.join(tempDir, '.env'), 'BASE_VAR=base\nEASY_MCP_SERVER_PORT=8887');
    fs.writeFileSync(path.join(tempDir, '.env.development'), 'DEV_VAR=development\nEASY_MCP_SERVER_PORT=8888');
    fs.writeFileSync(path.join(tempDir, '.env.local'), 'LOCAL_VAR=local\nEASY_MCP_SERVER_PORT=8889');

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
    serverProcesses.push(serverProcess);

    let output = '';
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    serverProcess.stderr.on('data', (data) => {
      output += data.toString();
    });

    // Wait for server to start - check for output or timeout
    const checkOutput = () => {
      if (output.includes('📄 Loaded environment from .env.local') &&
          output.includes('📄 Loaded environment from .env.development') &&
          output.includes('📄 Loaded environment from .env')) {
        // All .env files loaded, clean up
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
      } else if (output.includes('Error') || output.includes('EADDRINUSE')) {
        // Server failed to start, fail the test
        serverProcess.kill('SIGKILL');
        done(new Error('Server failed to start: ' + output));
      }
    };

    // Check output periodically
    const checkInterval = setInterval(() => {
      checkOutput();
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
      if (output.includes('📄 Loaded environment from .env.local') &&
          output.includes('📄 Loaded environment from .env.development') &&
          output.includes('📄 Loaded environment from .env')) {
        done();
      } else {
        done(new Error('Timeout waiting for .env files to load. Output: ' + output.substring(0, 500)));
      }
    }, 10000);
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
    const serverProcess = spawn('node', ['../../src/easy-mcp-server.js'], {
      stdio: 'pipe',
      cwd: tempDir
    });
    serverProcesses.push(serverProcess);

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
});
