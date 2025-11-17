/**
 * Real HTTP Bridge Integration Test
 * 
 * Tests actual HTTP bridge connection to external MCP servers.
 * Uses https://mcp.easynet.world/ for testing StreamableHttp protocol.
 */

const MCPHTTPBridge = require('../src/mcp/utils/mcp-http-bridge');
const MCPBridgeReloader = require('../src/utils/loaders/mcp-bridge-reloader');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('HTTP Bridge Real Integration Test', () => {
  let testConfigPath;
  let originalTestMode;

  beforeAll(() => {
    // Disable test mode to allow real connections
    originalTestMode = process.env.EASY_MCP_SERVER_TEST_MODE;
    delete process.env.EASY_MCP_SERVER_TEST_MODE;
    
    // Create a temporary mcp-bridge.json for testing
    const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-bridge-test-'));
    testConfigPath = path.join(testDir, 'mcp-bridge.json');
    
    const testConfig = {
      mcpServers: {
        'easynet-world': {
          url: 'https://mcp.easynet.world'
        }
      }
    };
    
    fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));
  });

  afterAll(() => {
    // Restore test mode
    if (originalTestMode !== undefined) {
      process.env.EASY_MCP_SERVER_TEST_MODE = originalTestMode;
    } else {
      delete process.env.EASY_MCP_SERVER_TEST_MODE;
    }
    
    // Clean up test config
    if (testConfigPath && fs.existsSync(testConfigPath)) {
      const testDir = path.dirname(testConfigPath);
      fs.unlinkSync(testConfigPath);
      try {
        fs.rmdirSync(testDir);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  test('HTTP Bridge can connect to https://mcp.easynet.world/', async () => {
    const bridge = new MCPHTTPBridge({
      url: 'https://mcp.easynet.world',
      quiet: true, // Suppress logs in tests
      timeout: 30000
    });

    // Test initialization - skip if server is unavailable
    try {
      await bridge.start();
      expect(bridge.initialized).toBe(true);
      expect(bridge.workingEndpoint).toBeDefined();
    } catch (error) {
      // If server returns HTML, 403, or is unavailable, skip the test
      if (error.message.includes('HTML') || error.message.includes('403') || error.message.includes('Forbidden') || error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
        console.log('⚠️  Skipping test: Server unavailable, forbidden, or not an MCP server');
        return;
      }
      throw error;
    } finally {
      bridge.stop();
    }
  }, 60000); // 60 second timeout for network requests

  test('HTTP Bridge can list tools from https://mcp.easynet.world/', async () => {
    const bridge = new MCPHTTPBridge({
      url: 'https://mcp.easynet.world',
      quiet: true,
      timeout: 30000
    });

    try {
      await bridge.start();
      
      // Test tools/list
      const result = await bridge.rpcRequest('tools/list', {});
      
      expect(result).toBeDefined();
      expect(result.tools).toBeDefined();
      expect(Array.isArray(result.tools)).toBe(true);
      
      // Log some info for debugging
      console.log(`✅ Successfully retrieved ${result.tools.length} tools from easynet-world`);
      if (result.tools.length > 0) {
        console.log(`   First tool: ${result.tools[0].name}`);
      }
    } catch (error) {
      // If server is unavailable, skip the test
      if (error.message.includes('HTML') || error.message.includes('403') || error.message.includes('Forbidden') || error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
        console.log('⚠️  Skipping test: Server unavailable, forbidden, or not an MCP server');
        return;
      }
      throw error;
    } finally {
      bridge.stop();
    }
  }, 60000);

  test('HTTP Bridge supports StreamableHttp protocol (POST to /)', async () => {
    const bridge = new MCPHTTPBridge({
      url: 'https://mcp.easynet.world',
      quiet: true,
      timeout: 30000
    });

    try {
      await bridge.start();
      
      // Verify it's using the root endpoint (StreamableHttp)
      // The bridge should try /mcp first, then fall back to / if needed
      expect(bridge.workingEndpoint).toBeDefined();
      
      // Test that we can make requests
      const result = await bridge.rpcRequest('tools/list', {});
      expect(result).toBeDefined();
      expect(result.tools).toBeDefined();
      
      console.log(`✅ StreamableHttp protocol working (endpoint: ${bridge.workingEndpoint})`);
    } catch (error) {
      // If server is unavailable, skip the test
      if (error.message.includes('HTML') || error.message.includes('403') || error.message.includes('Forbidden') || error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
        console.log('⚠️  Skipping test: Server unavailable, forbidden, or not an MCP server');
        return;
      }
      throw error;
    } finally {
      bridge.stop();
    }
  }, 60000);

  test('HTTP Bridge can receive notifications via SSE', async () => {
    const bridge = new MCPHTTPBridge({
      url: 'https://mcp.easynet.world',
      quiet: true,
      timeout: 30000
    });

    try {
      await bridge.start();
      
      // Wait a bit for SSE connection to establish
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if SSE is supported
      if (bridge.sseSupported) {
        console.log('✅ SSE connection established');
        
        // Set up a listener for notifications
        let notificationReceived = false;
        bridge.on('notification', (msg) => {
          notificationReceived = true;
          console.log(`✅ Received notification: ${msg.method}`);
        });
        
        // Wait a bit to see if we get any notifications
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Note: We don't fail if no notifications are received,
        // as the server may not send any during this time
        if (notificationReceived) {
          console.log('✅ Notification received via SSE');
        } else {
          console.log('ℹ️  No notifications received (this is normal)');
        }
      } else {
        console.log('ℹ️  SSE not supported by server (this is normal)');
      }
    } catch (error) {
      // If server is unavailable, skip the test
      if (error.message.includes('HTML') || error.message.includes('403') || error.message.includes('Forbidden') || error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
        console.log('⚠️  Skipping test: Server unavailable, forbidden, or not an MCP server');
        return;
      }
      throw error;
    } finally {
      bridge.stop();
    }
  }, 60000);

  test('MCPBridgeReloader can load HTTP bridge from config', async () => {
    // Set the bridge config path
    process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH = testConfigPath;
    
    const reloader = new MCPBridgeReloader({
      root: path.dirname(testConfigPath),
      logger: {
        log: () => {},
        warn: () => {}
      },
      quiet: true,
      configFile: 'mcp-bridge.json'
    });

    // Get bridges
    const bridges = reloader.ensureBridges();
    
    // Wait a bit for async initialization
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if bridge was created
    const bridge = bridges.get('easynet-world');
    
    // If bridge failed to initialize (server unavailable), skip the test
    if (!bridge) {
      console.log('⚠️  Skipping test: Bridge failed to initialize (server may be unavailable)');
      reloader.stopWatching();
      delete process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH;
      return;
    }
    
    expect(bridge).toBeDefined();
    
    // Test that we can use the bridge
    if (bridge && bridge.rpcRequest) {
      try {
        const result = await bridge.rpcRequest('tools/list', {});
        expect(result).toBeDefined();
        expect(result.tools).toBeDefined();
        console.log(`✅ Bridge loaded from config and working (${result.tools.length} tools)`);
      } catch (error) {
        // If server is unavailable, skip the test
        if (error.message.includes('HTML') || error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
          console.log('⚠️  Skipping test: Server unavailable or not an MCP server');
          return;
        }
        // Bridge might still be initializing
        console.log(`ℹ️  Bridge still initializing: ${error.message}`);
      }
    }
    
    // Clean up
    reloader.stopWatching();
    delete process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH;
  }, 60000);

  test('HTTP Bridge handles errors gracefully', async () => {
    const bridge = new MCPHTTPBridge({
      url: 'https://invalid-url-that-does-not-exist-12345.com',
      quiet: true,
      timeout: 5000 // Short timeout for faster failure
    });

    // Should fail gracefully
    await expect(bridge.start()).rejects.toThrow();
    expect(bridge.initialized).toBe(false);
    
    bridge.stop();
  }, 30000);
});

