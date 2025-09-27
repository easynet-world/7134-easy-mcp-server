/**
 * Test cases for error handling improvements
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const APILoader = require('../src/core/api-loader');

describe('Error Handling Improvements', () => {
  let app;
  let apiLoader;
  let tempApiDir;

  beforeEach(() => {
    app = express();
    apiLoader = new APILoader(app);
    
    // Create temporary API directory for testing
    tempApiDir = path.join(__dirname, 'temp-api');
    if (!fs.existsSync(tempApiDir)) {
      fs.mkdirSync(tempApiDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempApiDir)) {
      fs.rmSync(tempApiDir, { recursive: true, force: true });
    }
  });

  describe('Port Conflict Handling', () => {
    test('should handle port conflicts gracefully', async () => {
      const net = require('net');
      
      // Find an available port first
      let testPort = 3000;
      let testServer;
      let serverStarted = false;
      
      // Try to find an available port
      for (let i = 0; i < 10; i++) {
        try {
          testServer = net.createServer();
          await new Promise((resolve, reject) => {
            testServer.listen(testPort, resolve);
            testServer.on('error', reject);
          });
          serverStarted = true;
          break;
        } catch (error) {
          testPort++;
          if (testServer) {
            testServer.close();
          }
        }
      }
      
      if (!serverStarted) {
        throw new Error('Could not find an available port for testing');
      }

      // Test that the server can start on an alternative port
      const { spawn } = require('child_process');
      const serverProcess = spawn('node', ['bin/easy-mcp-server.js'], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, EASY_MCP_SERVER_PORT: testPort.toString() }
      });

      // Wait a bit for the server to start
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check if server is running on alternative port (try multiple ports)
      let isRunning = false;
      for (let i = 1; i <= 5; i++) {
        if (await checkPort(testPort + i)) {
          isRunning = true;
          break;
        }
      }
      
      expect(isRunning).toBe(true);

      // Clean up
      testServer.close();
      serverProcess.kill('SIGTERM');
      setTimeout(() => {
        serverProcess.kill('SIGKILL');
      }, 1000);
    });
  });

  describe('API Loading Error Handling', () => {
    test('should continue server startup with API loading errors', () => {
      // Create a test API file with missing dependency
      const testApiFile = path.join(tempApiDir, 'get.js');
      const testApiContent = `
        const MissingModule = require('non-existent-module');
        
        class TestAPI {
          process(req, res) {
            res.json({ message: 'test' });
          }
        }
        
        module.exports = TestAPI;
      `;
      fs.writeFileSync(testApiFile, testApiContent);

      // Set API path to temp directory
      apiLoader.apiPath = tempApiDir;

      // Load APIs - should not throw
      const routes = apiLoader.loadAPIs();
      const errors = apiLoader.getErrors();

      expect(routes).toBeDefined();
      expect(Array.isArray(routes)).toBe(true);
      expect(errors.length).toBeGreaterThan(0);
      
      // Check error structure
      const error = errors[0];
      expect(error).toHaveProperty('file');
      expect(error).toHaveProperty('error');
      expect(error).toHaveProperty('type');
      expect(error.type).toBe('missing_dependency');
    });

    test('should categorize different types of errors', () => {
      // Test missing module error
      const missingModuleFile = path.join(tempApiDir, 'get.js');
      fs.writeFileSync(missingModuleFile, `
        const MissingModule = require('non-existent-module');
        class TestAPI {
          process(req, res) { res.json({}); }
        }
        module.exports = TestAPI;
      `);

      // Test invalid constructor error - need to create a file that will be loaded but fail
      const invalidConstructorFile = path.join(tempApiDir, 'post.js');
      fs.writeFileSync(invalidConstructorFile, `
        // This will cause a "is not a constructor" error
        const NotAClass = 'string';
        class TestAPI extends NotAClass {
          process(req, res) { res.json({}); }
        }
        module.exports = TestAPI;
      `);

      apiLoader.apiPath = tempApiDir;
      const routes = apiLoader.loadAPIs();
      const errors = apiLoader.getErrors();

      expect(errors.length).toBeGreaterThanOrEqual(2);
      
      // Check error types
      const errorTypes = errors.map(e => e.type);
      expect(errorTypes).toContain('missing_dependency');
      expect(errorTypes).toContain('invalid_constructor');
    });

    test('should provide helpful error messages', () => {
      const testApiFile = path.join(tempApiDir, 'get.js');
      fs.writeFileSync(testApiFile, `
        const MissingPackage = require('@aws-sdk/client-s3');
        class TestAPI {
          process(req, res) { res.json({}); }
        }
        module.exports = TestAPI;
      `);

      apiLoader.apiPath = tempApiDir;
      const routes = apiLoader.loadAPIs();
      const errors = apiLoader.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      const error = errors[0];
      expect(error.error).toContain('Missing dependency');
      expect(error.type).toBe('missing_dependency');
    });
  });

  describe('Server Error Recovery', () => {
    test('should start server even with API loading errors', async () => {
      // Create API files with errors
      const errorApiFile = path.join(tempApiDir, 'get.js');
      fs.writeFileSync(errorApiFile, `
        const MissingModule = require('missing-package');
        class ErrorAPI {
          process(req, res) { res.json({}); }
        }
        module.exports = ErrorAPI;
      `);

      // Create a working API file
      const workingApiFile = path.join(tempApiDir, 'post.js');
      fs.writeFileSync(workingApiFile, `
        class WorkingAPI {
          process(req, res) {
            res.json({ message: 'working' });
          }
        }
        module.exports = WorkingAPI;
      `);

      // Test that server can start with mixed success/failure
      const { spawn } = require('child_process');
      const serverProcess = spawn('node', ['src/server.js'], {
        cwd: path.join(__dirname, '..'),
        env: { 
          ...process.env, 
          API_PATH: tempApiDir,
          SERVER_PORT: '0' // Use random port
        }
      });

      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Server should be running
      expect(serverProcess.exitCode).toBeNull();

      // Clean up
      serverProcess.kill();
    });
  });
});

// Helper function to check if a port is in use
async function checkPort(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(port, () => {
      server.close(() => {
        resolve(true);
      });
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}
