const fs = require('fs');
const path = require('path');
const MCPBridgeReloader = require('../src/utils/mcp-bridge-reloader');

describe('EASY_MCP_SERVER_BRIDGE_CONFIG_PATH Environment Variable', () => {
  const testConfigPath = path.join(__dirname, '..', 'test-bridge-config.json');
  const originalEnv = process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH;

  beforeEach(() => {
    // Clean up any existing test config
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH = originalEnv;
    } else {
      delete process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH;
    }
    
    // Clean up test config
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  test('should use default config file when environment variable is not set', () => {
    delete process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH;
    
    const reloader = new MCPBridgeReloader({
      root: __dirname + '/..',
      logger: { log: jest.fn(), warn: jest.fn() }
    });
    
    expect(reloader.configFile).toBe('mcp-bridge.json');
    expect(reloader.getConfigPath()).toBe(path.join(__dirname, '..', 'mcp-bridge.json'));
  });

  test('should use custom config file when environment variable is set', () => {
    process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH = 'test-bridge-config.json';
    
    const reloader = new MCPBridgeReloader({
      root: __dirname + '/..',
      logger: { log: jest.fn(), warn: jest.fn() }
    });
    
    expect(reloader.configFile).toBe('test-bridge-config.json');
    expect(reloader.getConfigPath()).toBe(testConfigPath);
  });

  test('should load custom config file when environment variable is set', () => {
    // Create test config file
    const testConfig = {
      mcpServers: {
        'test-server': {
          command: 'echo',
          args: ['test-bridge-config-loaded']
        }
      }
    };
    fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));
    
    process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH = 'test-bridge-config.json';
    
    const reloader = new MCPBridgeReloader({
      root: __dirname + '/..',
      logger: { log: jest.fn(), warn: jest.fn() }
    });
    
    const config = reloader.loadConfig();
    expect(config).toEqual(testConfig);
    expect(config.mcpServers['test-server']).toBeDefined();
    expect(config.mcpServers['test-server'].command).toBe('echo');
  });

  test('should resolve servers from custom config file', () => {
    // Create test config file
    const testConfig = {
      mcpServers: {
        'custom-server': {
          command: 'node',
          args: ['--version']
        }
      }
    };
    fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));
    
    process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH = 'test-bridge-config.json';
    
    const reloader = new MCPBridgeReloader({
      root: __dirname + '/..',
      logger: { log: jest.fn(), warn: jest.fn() }
    });
    
    const config = reloader.loadConfig();
    const servers = reloader.resolveAllServers(config);
    
    expect(servers).toHaveLength(1);
    expect(servers[0].name).toBe('custom-server');
    expect(servers[0].command).toBe('node');
    expect(servers[0].args).toEqual(['--version']);
  });

  test('should handle non-existent custom config file gracefully', () => {
    process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH = 'non-existent-config.json';
    
    const reloader = new MCPBridgeReloader({
      root: __dirname + '/..',
      logger: { log: jest.fn(), warn: jest.fn() }
    });
    
    const config = reloader.loadConfig();
    expect(config).toEqual({});
  });

  test('should handle invalid JSON in custom config file', () => {
    // Create invalid JSON file
    fs.writeFileSync(testConfigPath, 'invalid json content');
    
    process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH = 'test-bridge-config.json';
    
    const mockLogger = { log: jest.fn(), warn: jest.fn() };
    const reloader = new MCPBridgeReloader({
      root: __dirname + '/..',
      logger: mockLogger
    });
    
    const config = reloader.loadConfig();
    expect(config).toEqual({});
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse')
    );
  });

  test('should not override environment variable when configFile is not provided', () => {
    // This test verifies that the MCPBridgeReloader respects the environment variable
    // when no configFile option is provided (as fixed in server.js)
    process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH = 'test-bridge-config.json';
    
    const reloader = new MCPBridgeReloader({
      root: __dirname + '/..',
      logger: { log: jest.fn(), warn: jest.fn() }
      // Note: no configFile option provided - this is the fix
    });
    
    expect(reloader.configFile).toBe('test-bridge-config.json');
    expect(reloader.getConfigPath()).toBe(testConfigPath);
  });

  test('should use default when environment variable is empty string', () => {
    process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH = '';
    
    const reloader = new MCPBridgeReloader({
      root: __dirname + '/..',
      logger: { log: jest.fn(), warn: jest.fn() }
    });
    
    expect(reloader.configFile).toBe('mcp-bridge.json');
    expect(reloader.getConfigPath()).toBe(path.join(__dirname, '..', 'mcp-bridge.json'));
  });
});
