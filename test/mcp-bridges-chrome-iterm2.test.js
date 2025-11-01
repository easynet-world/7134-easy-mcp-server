const http = require('http');

describe('MCP bridges: chrome-devtools and iterm2', () => {
  let serverModule;
  let DynamicAPIMCPServer;
  let BridgeReloader;

  let appServer;
  beforeAll(() => {
    jest.resetModules();
    // Disable real MCP network servers in test
    process.env.EASY_MCP_SERVER_MCP_ENABLED = 'false';
  
    // Create a tiny local HTTP server to act as a safe navigation target
    appServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    });
    appServer.listen(0); // random port
    const port = appServer.address().port;
    const localUrl = `http://127.0.0.1:${port}/test`;

    // Mock bridge that simulates Chrome and iTerm2 toolsets
    const bridgeModulePath = require('path').resolve(__dirname, '../src/utils/mcp/mcp-bridge.js');
    jest.doMock(bridgeModulePath, () => {
      return function MockBridge(kind) {
        return {
          start() {},
          on() {},
          async rpcRequest(method, params) {
            if (method === 'tools/list') {
              if (kind === 'chrome-devtools') {
                return { tools: [
                  { name: 'navigate', description: 'Navigate to URL', inputSchema: { type: 'object', properties: { url: { type: 'string' } } } },
                  { name: 'list_tabs', description: 'List tabs' }
                ]};
              } else if (kind === 'iterm2') {
                return { tools: [
                  { name: 'type', description: 'Type text', inputSchema: { type: 'object', properties: { text: { type: 'string' } } } },
                  { name: 'run', description: 'Run command', inputSchema: { type: 'object', properties: { cmd: { type: 'string' } } } }
                ]};
              }
            }
            if (method === 'tools/call') {
              // echo back arguments to validate plumbing
              return { content: [{ type: 'text', text: JSON.stringify(params || {}) }], is_error: false };
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
          // two bridges available
          return new Map([
            ['chrome-devtools', new MockBridge('chrome-devtools')],
            ['iterm2', new MockBridge('iterm2')]
          ]);
        }
      };
    });

    DynamicAPIMCPServer = require('../src/mcp');
    BridgeReloader = require('../src/utils/mcp-bridge-reloader');

    // Create MCP server instance (no network bind needed for unit tests)
    const reloader = new BridgeReloader();
    const mcp = new DynamicAPIMCPServer('127.0.0.1', 0, { bridgeReloader: reloader });
    // Provide a minimal route so API tools exist too
    mcp.setRoutes([{ method: 'GET', path: '/users', filePath: __filename, processorInstance: { openApi: { parameters: [{ in: 'query', name: 'active', schema: { type: 'boolean' } }] } } }]);
    serverModule = { mcp };

    // Expose helper for tests
    serverModule.localUrl = localUrl;
  });

  afterAll(() => {
    if (appServer && appServer.listening) {
      appServer.close();
    }
  });

  test('tools/list includes chrome and iterm2 tools', async () => {
    const resp = await serverModule.mcp.processMCPRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(resp && resp.result && Array.isArray(resp.result.tools)).toBe(true);
    const names = resp.result.tools.map(t => t.name);
    expect(names).toEqual(expect.arrayContaining(['navigate', 'list_tabs', 'type', 'run']));
  });

  test('tools/call passes arguments through to chrome navigate and iterm2 type', async () => {
    const url = serverModule.localUrl;
    const nav = await serverModule.mcp.processMCPRequest({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'navigate', arguments: { url } } });
    expect(JSON.stringify(nav)).toContain(url);
    const text = 'hello world';
    const type = await serverModule.mcp.processMCPRequest({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'type', arguments: { text } } });
    expect(JSON.stringify(type)).toContain(text);
  });
});


