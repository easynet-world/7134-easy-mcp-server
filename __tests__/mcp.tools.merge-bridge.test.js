describe('MCP tools/list merges bridge tools (HTTP MCP)', () => {
  test('processListTools returns combined list', async () => {
    jest.resetModules();

    // Mock bridge to return tools
    const bridgeModulePath = require('path').resolve(__dirname, '../src/utils/mcp-bridge.js');
    jest.doMock(bridgeModulePath, () => {
      return function MockBridge() {
        return {
          start() {},
          on() {},
          rpcRequest: async (method) => {
            if (method === 'tools/list') {
              return { tools: [{ name: 'mock_bridge_tool', description: 'from bridge' }] };
            }
            throw new Error('unsupported');
          }
        };
      };
    });

    const reloaderModulePath = require('path').resolve(__dirname, '../src/utils/mcp-bridge-reloader.js');
    jest.doMock(reloaderModulePath, () => {
      const MockBridge = require(bridgeModulePath);
      return class MockReloader {
        ensureBridges() {
          return new Map([['mock', new MockBridge()]]);
        }
      };
    });

    const DynamicAPIMCPServer = require('../src/mcp/mcp-server');
    const BridgeReloader = require('../src/utils/mcp-bridge-reloader');
    const reloader = new BridgeReloader();
    const mcpServer = new DynamicAPIMCPServer('0.0.0.0', 8888, { bridgeReloader: reloader });

    // Provide a simple route so tools list is non-empty
    mcpServer.setRoutes([{ method: 'GET', path: '/ping', processorInstance: {} }]);

    const resp = await mcpServer.processMCPRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(resp && resp.result && Array.isArray(resp.result.tools)).toBe(true);
    const names = resp.result.tools.map(t => t.name);
    expect(names).toContain('mock_mock_bridge_tool');
  });
});


