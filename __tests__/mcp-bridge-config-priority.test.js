/**
 * Test MCP bridge configuration file priority and resolution
 */

const MCPBridgeReloader = require('../src/utils/mcp-bridge-reloader');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('MCP Bridge Configuration Priority', () => {
  let tempDir;
  let projectDir;
  let packageDir;

  beforeEach(() => {
    // Create temporary directory structure
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-bridge-test-'));
    projectDir = path.join(tempDir, 'my-project');
    packageDir = path.join(tempDir, 'node_modules', 'easy-mcp-server');
    
    // Create directory structure
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(packageDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'node_modules', 'easy-mcp-server'), { recursive: true });
    
    // Create package.json in project directory
    const packageJson = {
      name: 'my-project',
      dependencies: {
        'easy-mcp-server': '^1.0.0'
      }
    };
    fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    
    // Create package.json in package directory
    const packageJsonPkg = {
      name: 'easy-mcp-server',
      version: '1.0.0'
    };
    fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify(packageJsonPkg, null, 2));
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Configuration File Resolution', () => {
    test('should prioritize explicit environment variable path', () => {
      const customConfigPath = path.join(projectDir, 'custom-bridge.json');
      const customConfig = {
        mcpServers: {
          'custom-server': {
            command: 'node',
            args: ['custom-server.js']
          }
        }
      };
      fs.writeFileSync(customConfigPath, JSON.stringify(customConfig, null, 2));
      
      // Set environment variable
      process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH = customConfigPath;
      
      const reloader = new MCPBridgeReloader({ 
        root: projectDir, 
        logger: { log: () => {}, warn: () => {} }
      });
      
      const config = reloader.loadConfig();
      
      expect(config.mcpServers).toBeDefined();
      expect(config.mcpServers['custom-server']).toBeDefined();
      
      // Clean up environment variable
      delete process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH;
    });

    test('should use project directory config over package config', () => {
      // Create config in project directory
      const projectConfig = {
        mcpServers: {
          'project-server': {
            command: 'node',
            args: ['project-server.js']
          }
        }
      };
      fs.writeFileSync(path.join(projectDir, 'mcp-bridge.json'), JSON.stringify(projectConfig, null, 2));
      
      // Create config in package directory (this should be ignored)
      const packageConfig = {
        mcpServers: {
          'package-server': {
            command: 'node',
            args: ['package-server.js']
          }
        }
      };
      fs.writeFileSync(path.join(packageDir, 'mcp-bridge.json'), JSON.stringify(packageConfig, null, 2));
      
      const reloader = new MCPBridgeReloader({ 
        root: projectDir, 
        logger: { log: () => {}, warn: () => {} }
      });
      
      const config = reloader.loadConfig();
      
      expect(config.mcpServers).toBeDefined();
      expect(config.mcpServers['project-server']).toBeDefined();
      expect(config.mcpServers['package-server']).toBeUndefined();
    });

    test('should find project root when running from subdirectory', () => {
      const subDir = path.join(projectDir, 'src', 'subdirectory');
      fs.mkdirSync(subDir, { recursive: true });
      
      // Create config in project root
      const projectConfig = {
        mcpServers: {
          'project-server': {
            command: 'node',
            args: ['project-server.js']
          }
        }
      };
      fs.writeFileSync(path.join(projectDir, 'mcp-bridge.json'), JSON.stringify(projectConfig, null, 2));
      
      // Create reloader from subdirectory
      const reloader = new MCPBridgeReloader({ 
        root: subDir, 
        logger: { log: () => {}, warn: () => {} }
      });
      
      const config = reloader.loadConfig();
      
      expect(config.mcpServers).toBeDefined();
      expect(config.mcpServers['project-server']).toBeDefined();
    });

    test('should handle relative paths in environment variable', () => {
      const relativeConfigPath = './custom-bridge.json';
      const customConfig = {
        mcpServers: {
          'relative-server': {
            command: 'node',
            args: ['relative-server.js']
          }
        }
      };
      fs.writeFileSync(path.join(projectDir, 'custom-bridge.json'), JSON.stringify(customConfig, null, 2));
      
      // Set environment variable with relative path
      process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH = relativeConfigPath;
      
      const reloader = new MCPBridgeReloader({ 
        root: projectDir, 
        logger: { log: () => {}, warn: () => {} }
      });
      
      const config = reloader.loadConfig();
      
      expect(config.mcpServers).toBeDefined();
      expect(config.mcpServers['relative-server']).toBeDefined();
      
      // Clean up environment variable
      delete process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH;
    });

    test('should return empty config when no config file found', () => {
      const reloader = new MCPBridgeReloader({ 
        root: projectDir, 
        logger: { log: () => {}, warn: () => {} }
      });
      
      const config = reloader.loadConfig();
      
      expect(config).toEqual({});
    });

    test('should handle invalid JSON gracefully', () => {
      // Create invalid JSON config
      fs.writeFileSync(path.join(projectDir, 'mcp-bridge.json'), 'invalid json content');
      
      const reloader = new MCPBridgeReloader({ 
        root: projectDir, 
        logger: { log: () => {}, warn: () => {} }
      });
      
      const config = reloader.loadConfig();
      
      expect(config).toEqual({});
    });
  });

  describe('Project Root Detection', () => {
    test('should detect project root with easy-mcp-server dependency', () => {
      const reloader = new MCPBridgeReloader({ 
        root: projectDir, 
        logger: { log: () => {}, warn: () => {} }
      });
      
      const projectRoot = reloader.findProjectRoot();
      
      expect(projectRoot).toBe(projectDir);
    });

    test('should return null when no project root found', () => {
      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-test-'));
      
      const reloader = new MCPBridgeReloader({ 
        root: emptyDir, 
        logger: { log: () => {}, warn: () => {} }
      });
      
      const projectRoot = reloader.findProjectRoot();
      
      expect(projectRoot).toBeNull();
      
      // Clean up
      fs.rmSync(emptyDir, { recursive: true, force: true });
    });

    test('should limit search depth to prevent infinite loops', () => {
      // Create a deep directory structure (but not too deep)
      let deepDir = projectDir;
      for (let i = 0; i < 5; i++) {
        deepDir = path.join(deepDir, `level${i}`);
        fs.mkdirSync(deepDir, { recursive: true });
      }
      
      const reloader = new MCPBridgeReloader({ 
        root: deepDir, 
        logger: { log: () => {}, warn: () => {} }
      });
      
      const projectRoot = reloader.findProjectRoot();
      
      // Should find the project root despite deep nesting
      expect(projectRoot).toBe(projectDir);
    });
  });

  describe('Configuration Loading Priority', () => {
    test('should log which config file was loaded', () => {
      const projectConfig = {
        mcpServers: {
          'test-server': {
            command: 'node',
            args: ['test.js']
          }
        }
      };
      fs.writeFileSync(path.join(projectDir, 'mcp-bridge.json'), JSON.stringify(projectConfig, null, 2));
      
      const logMessages = [];
      const logger = {
        log: (msg) => logMessages.push(msg),
        warn: (msg) => logMessages.push(msg)
      };
      
      const reloader = new MCPBridgeReloader({ 
        root: projectDir, 
        logger
      });
      
      reloader.loadConfig();
      
      expect(logMessages.some(msg => msg.includes('Loaded MCP bridge config from'))).toBe(true);
    });
  });
});
