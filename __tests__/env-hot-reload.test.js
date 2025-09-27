/**
 * Test .env hot reloading functionality
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

describe('Environment Hot Reload', () => {
  let tempDir;
  let serverProcess;

  beforeAll(() => {
    // Create temporary directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-hot-reload-test-'));
  });

  afterAll((done) => {
    // Clean up
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        serverProcess.kill('SIGKILL');
        // Clean up temp directory
        if (tempDir && fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
        done();
      }, 1000);
    } else {
      // Clean up temp directory
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      done();
    }
  });

  test('should detect .env file changes and reload environment variables', (done) => {
    // Create initial .env file
    const envFile = path.join(tempDir, '.env');
    fs.writeFileSync(envFile, 'TEST_VAR=initial_value\nEASY_MCP_SERVER_PORT=3000\n');

    // Create a simple API file
    const apiDir = path.join(tempDir, 'api');
    fs.mkdirSync(apiDir, { recursive: true });
    const apiFile = path.join(apiDir, 'test.js');
    const apiContent = `
const express = require('express');
const router = express.Router();

/**
 * @api {get} /test Test endpoint
 * @apiName Test
 * @apiGroup Test
 */
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Test endpoint',
    envVar: process.env.TEST_VAR,
    port: process.env.EASY_MCP_SERVER_PORT
  });
});

module.exports = router;
`;
    fs.writeFileSync(apiFile, apiContent);

    // Start the server
    serverProcess = spawn('node', [path.join(__dirname, '..', 'bin', 'easy-mcp-server.js')], {
      stdio: 'pipe',
      cwd: tempDir
    });

    let output = '';
    let envReloaded = false;
    let serverStarted = false;

    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
      
      // Check if server started successfully
      if (output.includes('🚀 Starting Easy MCP Server...') && !serverStarted) {
        serverStarted = true;
        // Wait a bit for server to fully start
        setTimeout(() => {
          // Modify .env file
          fs.writeFileSync(envFile, 'TEST_VAR=updated_value\nEASY_MCP_SERVER_PORT=3001\n');
        }, 2000);
      }
      
      // Check for hot reload messages
      if (output.includes('🔄 Reloading .env files...') || 
          output.includes('📄 Reloaded environment from .env') ||
          output.includes('✅ Reloaded 1 .env file(s)')) {
        envReloaded = true;
        done();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server stderr:', data.toString());
    });

    serverProcess.on('error', (error) => {
      done(error);
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      if (!envReloaded) {
        done(new Error('Environment hot reload did not detect .env file changes'));
      }
    }, 15000);
  });

  test.skip('should handle multiple .env files in priority order', (done) => {
    // Create multiple .env files
    const envLocal = path.join(tempDir, '.env.local');
    const envDev = path.join(tempDir, '.env.development');
    const env = path.join(tempDir, '.env');

    fs.writeFileSync(envLocal, 'PRIORITY=local\n');
    fs.writeFileSync(envDev, 'PRIORITY=development\n');
    fs.writeFileSync(env, 'PRIORITY=default\n');

    // Create a simple API file
    const apiDir = path.join(tempDir, 'api');
    fs.mkdirSync(apiDir, { recursive: true });
    const apiFile = path.join(apiDir, 'priority.js');
    const apiContent = `
const express = require('express');
const router = express.Router();

/**
 * @api {get} /priority Priority test endpoint
 * @apiName Priority
 * @apiGroup Test
 */
router.get('/priority', (req, res) => {
  res.json({ 
    priority: process.env.PRIORITY
  });
});

module.exports = router;
`;
    fs.writeFileSync(apiFile, apiContent);

    // Start the server
    serverProcess = spawn('node', [path.join(__dirname, '..', 'bin', 'easy-mcp-server.js')], {
      stdio: 'pipe',
      cwd: tempDir
    });

    let output = '';
    let hotReloadSetup = false;

    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
      
      // Check if hot reload setup was successful
      if (output.includes('🔄 Setting up .env hot reload for: .env.local, .env.development, .env') ||
          output.includes('✅ .env hot reload is now active')) {
        hotReloadSetup = true;
        done();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server stderr:', data.toString());
    });

    serverProcess.on('error', (error) => {
      done(error);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!hotReloadSetup) {
        done(new Error('Test timeout - hot reload setup did not complete'));
      }
    }, 10000);
  });

  test.skip('should handle missing .env files gracefully', (done) => {
    // Don't create any .env files
    const apiDir = path.join(tempDir, 'api');
    fs.mkdirSync(apiDir, { recursive: true });
    const apiFile = path.join(apiDir, 'noenv.js');
    const apiContent = `
const express = require('express');
const router = express.Router();

/**
 * @api {get} /noenv No env test endpoint
 * @apiName NoEnv
 * @apiGroup Test
 */
router.get('/noenv', (req, res) => {
  res.json({ 
    message: 'No .env files test'
  });
});

module.exports = router;
`;
    fs.writeFileSync(apiFile, apiContent);

    // Start the server
    serverProcess = spawn('node', [path.join(__dirname, '..', 'bin', 'easy-mcp-server.js')], {
      stdio: 'pipe',
      cwd: tempDir
    });

    let output = '';
    let serverStarted = false;

    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
      
      // Check if server started without .env files
      if (output.includes('🚀 Starting Easy MCP Server...') && 
          (output.includes('📄 No .env files found - skipping hot reload setup') ||
           output.includes('✅ .env hot reload is now active'))) {
        serverStarted = true;
        done();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server stderr:', data.toString());
    });

    serverProcess.on('error', (error) => {
      done(error);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!serverStarted) {
        done(new Error('Test timeout - server did not start gracefully without .env files'));
      }
    }, 10000);
  });
});
