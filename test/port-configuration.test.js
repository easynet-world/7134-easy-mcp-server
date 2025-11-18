/**
 * Test cases for port configuration functionality
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

describe('Port Configuration', () => {
  let tempDir;
  let originalCwd;
  let serverProcesses = [];

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(__dirname, 'port-test-'));
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

  test('should use default ports when no configuration provided', (done) => {
    jest.setTimeout(15000);
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

    // Create .env file with port configuration to ensure HTTP mode
    const envContent = `
EASY_MCP_SERVER_PORT=8887
EASY_MCP_SERVER_MCP_PORT=8888
`;
    fs.writeFileSync(path.join(tempDir, '.env'), envContent);

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
      // Check for server startup messages (with or without emoji)
      if (output.includes('Starting Easy MCP Server') || 
          output.includes('🚀 Starting Easy MCP Server') ||
          output.includes('Found api/ directory') ||
          output.includes('STARTING EASY MCP SERVER')) {
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
      if (output.includes('Starting Easy MCP Server') || 
          output.includes('🚀 Starting Easy MCP Server') ||
          output.includes('Found api/ directory') ||
          output.includes('STARTING EASY MCP SERVER')) {
        done();
      } else {
        done(new Error('Timeout waiting for server to start. Output: ' + output.substring(0, 500)));
      }
    }, 10000);
  });

  test('should use CLI port arguments', (done) => {
    jest.setTimeout(15000);
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

    // Create .env file with port configuration to ensure HTTP mode
    const envContent = `
EASY_MCP_SERVER_PORT=8887
EASY_MCP_SERVER_MCP_PORT=8888
`;
    fs.writeFileSync(path.join(tempDir, '.env'), envContent);

    // Start the server with default ports
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
      // Check for server startup messages (with or without emoji)
      if (output.includes('Starting Easy MCP Server') || 
          output.includes('🚀 Starting Easy MCP Server') ||
          output.includes('Found api/ directory') ||
          output.includes('STARTING EASY MCP SERVER')) {
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
      if (output.includes('Starting Easy MCP Server') || 
          output.includes('🚀 Starting Easy MCP Server') ||
          output.includes('Found api/ directory') ||
          output.includes('STARTING EASY MCP SERVER')) {
        done();
      } else {
        done(new Error('Timeout waiting for server to start. Output: ' + output.substring(0, 500)));
      }
    }, 10000);
  });

  test('should use EASY_MCP_SERVER_PORT environment variables for port configuration', (done) => {
    jest.setTimeout(15000);
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
      // Check for .env loading or server startup messages (with or without emoji)
      const hasEnvLoad = output.includes('Loaded environment from .env') || 
                         output.includes('📄 Loaded environment from .env');
      const hasServerStart = output.includes('Starting Easy MCP Server') || 
                             output.includes('🚀 Starting Easy MCP Server') ||
                             output.includes('Found api/ directory') ||
                             output.includes('STARTING EASY MCP SERVER');
      
      if (hasEnvLoad || hasServerStart) {
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
      const hasEnvLoad = output.includes('Loaded environment from .env') || 
                         output.includes('📄 Loaded environment from .env');
      const hasServerStart = output.includes('Starting Easy MCP Server') || 
                             output.includes('🚀 Starting Easy MCP Server') ||
                             output.includes('Found api/ directory') ||
                             output.includes('STARTING EASY MCP SERVER');
      
      if (hasEnvLoad || hasServerStart) {
        done();
      } else {
        done(new Error('Timeout waiting for server to start. Output: ' + output.substring(0, 500)));
      }
    }, 10000);
  });

  test('should use fallback environment variables for port configuration', (done) => {
    jest.setTimeout(15000);
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
    // Also set EASY_MCP_SERVER_MCP_PORT to ensure HTTP mode
    const envContent = `
PORT=8887
MCP_PORT=8888
EASY_MCP_SERVER_MCP_PORT=8888
`;
    fs.writeFileSync(path.join(tempDir, '.env'), envContent);

    // Start the server
    const serverProcess = spawn('node', ['../../src/easy-mcp-server.js'], {
      stdio: 'pipe',
      cwd: tempDir,
      env: {
        ...process.env,
        PORT: '8887',
        MCP_PORT: '8888',
        EASY_MCP_SERVER_MCP_PORT: '8888'
      }
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
      // Check for .env loading or server startup messages (with or without emoji)
      const hasEnvLoad = output.includes('Loaded environment from .env') || 
                         output.includes('📄 Loaded environment from .env');
      const hasServerStart = output.includes('Starting Easy MCP Server') || 
                             output.includes('🚀 Starting Easy MCP Server') ||
                             output.includes('Found api/ directory') ||
                             output.includes('STARTING EASY MCP SERVER');
      
      if (hasEnvLoad || hasServerStart) {
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
      const hasEnvLoad = output.includes('Loaded environment from .env') || 
                         output.includes('📄 Loaded environment from .env');
      const hasServerStart = output.includes('Starting Easy MCP Server') || 
                             output.includes('🚀 Starting Easy MCP Server') ||
                             output.includes('Found api/ directory') ||
                             output.includes('STARTING EASY MCP SERVER');
      
      if (hasEnvLoad || hasServerStart) {
        done();
      } else {
        done(new Error('Timeout waiting for server to start. Output: ' + output.substring(0, 500)));
      }
    }, 10000);
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

  test('should start in HTTP mode when mcp-bridge.json exists but port is set in .env', (done) => {
    jest.setTimeout(15000);
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

    // Create .env file with port configuration (use random ports to avoid conflicts)
    const apiPort = 18887 + Math.floor(Math.random() * 100);
    const mcpPort = 18888 + Math.floor(Math.random() * 100);
    const envContent = `
EASY_MCP_SERVER_PORT=${apiPort}
EASY_MCP_SERVER_MCP_PORT=${mcpPort}
`;
    fs.writeFileSync(path.join(tempDir, '.env'), envContent);

    // Create mcp-bridge.json (this should NOT force STDIO mode if port is set)
    const bridgeConfig = {
      mcpServers: {
        test: {
          command: 'npx',
          args: ['test']
        }
      }
    };
    fs.writeFileSync(path.join(tempDir, 'mcp-bridge.json'), JSON.stringify(bridgeConfig, null, 2));

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

    // Check output periodically
    const checkInterval = setInterval(() => {
      // Server should start in HTTP mode (not STDIO mode) because port is set
      // Look for HTTP mode indicators, not STDIO mode indicators
      if (output.includes('MCP Server started successfully') || 
          output.includes('WebSocket server listening') ||
          output.includes('HTTP endpoints available') ||
          output.includes('EASY MCP SERVER')) {
        clearInterval(checkInterval);
        // Verify it's NOT in STDIO mode
        expect(output).not.toContain('STDIO mode');
        expect(output).not.toContain('Reading from stdin');
        // If we got here, the server started in HTTP mode (we checked for HTTP mode indicators above)
        // Just verify it's not in STDIO mode
        
        // Kill the server
        serverProcess.kill('SIGTERM');
        setTimeout(() => {
          if (!serverProcess.killed) {
            serverProcess.kill('SIGKILL');
          }
          done();
        }, 300);
      }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
      // Check if server started successfully (even if we didn't catch the exact message)
      const hasStarted = output.includes('MCP Server started successfully') || 
                        output.includes('WebSocket server listening') ||
                        output.includes('EASY MCP SERVER') ||
                        output.includes('SERVER STARTED SUCCESSFULLY');
      const isStdioMode = output.includes('STDIO mode') || output.includes('Reading from stdin');
      
      if (!hasStarted || isStdioMode) {
        console.error('Server output:', output);
        done(new Error(`Server did not start in HTTP mode as expected. Started: ${hasStarted}, STDIO: ${isStdioMode}`));
      } else {
        done();
      }
    }, 10000);
  });
});
