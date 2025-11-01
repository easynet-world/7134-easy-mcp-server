describe('Chrome DevTools MCP bridge - full tool coverage (mocked)', () => {
  let DynamicAPIMCPServer;
  let BridgeReloader;
  let mcp;

  beforeAll(() => {
    jest.resetModules();

    // Mock the chrome bridge to expose a comprehensive toolset
    const bridgeModulePath = require('path').resolve(__dirname, '../src/mcp/utils/mcp-bridge.js');
    jest.doMock(bridgeModulePath, () => {
      const toolList = [
        { name: 'navigate', inputSchema: { type: 'object', properties: { url: { type: 'string' } } } },
        { name: 'list_tabs', inputSchema: { type: 'object', properties: {} } },
        { name: 'click', inputSchema: { type: 'object', properties: { selector: { type: 'string' } } } },
        { name: 'type', inputSchema: { type: 'object', properties: { selector: { type: 'string' }, text: { type: 'string' } } } },
        { name: 'eval', inputSchema: { type: 'object', properties: { expression: { type: 'string' } } } },
        { name: 'screenshot', inputSchema: { type: 'object', properties: { selector: { type: 'string' } } } },
        { name: 'close_tab', inputSchema: { type: 'object', properties: { tabId: { type: 'string' } } } },
        { name: 'wait_for', inputSchema: { type: 'object', properties: { text: { type: 'string' } } } },
        { name: 'fill', inputSchema: { type: 'object', properties: { selector: { type: 'string' }, value: { type: 'string' } } } },
        { name: 'fill_form', inputSchema: { type: 'object', properties: { fields: { type: 'object' } } } },
        { name: 'hover', inputSchema: { type: 'object', properties: { selector: { type: 'string' } } } },
        { name: 'drag', inputSchema: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } } } },
        { name: 'upload_file', inputSchema: { type: 'object', properties: { selector: { type: 'string' }, filePath: { type: 'string' } } } }
      ];
      return function MockBridge() {
        return {
          start() {},
          on() {},
          async rpcRequest(method, params) {
            if (method === 'tools/list') {
              return { tools: toolList };
            }
            if (method === 'tools/call') {
              return { content: [{ type: 'text', text: JSON.stringify(params || {}) }], is_error: false };
            }
            throw new Error('unsupported');
          }
        };
      };
    });

    const reloaderModulePath = require('path').resolve(__dirname, '../src/utils/loaders/mcp-bridge-reloader.js');
    jest.doMock(reloaderModulePath, () => {
      const MockBridge = require(require('path').resolve(__dirname, '../src/mcp/utils/mcp-bridge.js'));
      return class MockReloader {
        ensureBridges() {
          return new Map([
            ['chrome-devtools', new MockBridge()]
          ]);
        }
      };
    });

    DynamicAPIMCPServer = require('../src/mcp');
    BridgeReloader = require('../src/utils/loaders/mcp-bridge-reloader');
  });

  beforeEach(() => {
    const reloader = new BridgeReloader();
    mcp = new DynamicAPIMCPServer('127.0.0.1', 0, { bridgeReloader: reloader });
    // Provide a minimal API route to ensure merging behavior still works
    mcp.setRoutes([{ method: 'GET', path: '/health', filePath: __filename, processorInstance: {} }]);
  });

  afterEach(() => {
    if (mcp) mcp.stop();
  });

  test('tools/list includes all chrome tools with schemas', async () => {
    const resp = await mcp.processMCPRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    const tools = resp && resp.result && resp.result.tools;
    expect(Array.isArray(tools)).toBe(true);
    const names = tools.map(t => t.name);
    const expected = ['navigate', 'list_tabs', 'click', 'type', 'eval', 'screenshot', 'close_tab', 'wait_for', 'fill', 'fill_form', 'hover', 'drag', 'upload_file'];
    expected.forEach(n => expect(names).toContain(n));
    // spot-check input schemas exist for a few
    const navigate = tools.find(t => t.name === 'navigate');
    expect(navigate.inputSchema && navigate.inputSchema.properties && navigate.inputSchema.properties.url).toBeDefined();
    const click = tools.find(t => t.name === 'click');
    expect(click.inputSchema.properties.selector).toBeDefined();
  });

  test('tools/call executes each chrome tool with arguments', async () => {
    const calls = [
      { name: 'navigate', arguments: { url: 'http://127.0.0.1:9999' } },
      { name: 'list_tabs', arguments: {} },
      { name: 'click', arguments: { selector: '#btn' } },
      { name: 'type', arguments: { selector: '#q', text: 'hello' } },
      { name: 'eval', arguments: { expression: 'document.title' } },
      { name: 'screenshot', arguments: { selector: 'body' } },
      { name: 'close_tab', arguments: { tabId: '1' } },
      { name: 'wait_for', arguments: { text: 'Loaded' } },
      { name: 'fill', arguments: { selector: '#name', value: 'Alice' } },
      { name: 'fill_form', arguments: { fields: { '#a': '1' } } },
      { name: 'hover', arguments: { selector: '.menu' } },
      { name: 'drag', arguments: { from: '#a', to: '#b' } },
      { name: 'upload_file', arguments: { selector: '#file', filePath: '/tmp/x.txt' } }
    ];

    for (const call of calls) {
      const resp = await mcp.processMCPRequest({ jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: call });
      expect(resp && resp.result && Array.isArray(resp.result.content)).toBe(true);
      const text = resp.result.content[0] && resp.result.content[0].text;
      expect(String(text)).toContain(call.name);
    }
  });
});


