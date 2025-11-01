const request = require('supertest');

describe('MCP Bridge tools exposure', () => {
  let serverModule;
  let app;

  beforeAll(() => {
    jest.resetModules();
    // Ensure real MCP ws server stays off
    process.env.EASY_MCP_SERVER_MCP_ENABLED = 'false';
    // Ensure bridges are enabled in tests for this suite
    process.env.EASY_MCP_SERVER_BRIDGE_ENABLED = 'true';

    // Mock MCPBridge to return a list_tools result immediately
    const bridgeModulePath = require('path').resolve(__dirname, '../src/utils/mcp/mcp-bridge.js');
    jest.doMock(bridgeModulePath, () => {
      return function MockBridge() {
        return {
          start() {},
          on() {},
          rpcRequest: async (method) => {
            if (method === 'tools/list') {
              return {
                tools: [
                  { name: 'list_pages', description: 'List open pages' },
                  { name: 'navigate', description: 'Navigate to URL' }
                ]
              };
            }
            throw new Error('unsupported in mock');
          }
        };
      };
    });

    // Mock MCPBridgeReloader to bypass NODE_ENV === 'test' stub and return our mock bridge
    const reloaderModulePath = require('path').resolve(__dirname, '../src/utils/mcp/mcp-bridge-reloader.js');
    jest.doMock(reloaderModulePath, () => {
      const MockBridge = require(bridgeModulePath);
      return class MockReloader {
        constructor() { this.map = null; }
        startWatching() {}
        ensureBridges() {
          if (!this.map) {
            this.map = new Map();
            this.map.set('chrome-devtools', new MockBridge());
          }
          return this.map;
        }
      };
    });

    serverModule = require('../src/app/server');
    app = serverModule.app;
  });

  afterAll(() => {});

  test('GET /bridge/list-tools returns tools from mock bridge', async () => {
    const res = await request(app).get('/bridge/list-tools');
    expect(res.statusCode).toBe(200);
    expect(res.body && res.body.servers).toBeTruthy();
    const names = Object.keys(res.body.servers);
    expect(names.length).toBeGreaterThan(0);
    const first = res.body.servers[names[0]];
    expect(first && first.tools).toBeTruthy();
    expect(Array.isArray(first.tools)).toBe(true);
  });
});


