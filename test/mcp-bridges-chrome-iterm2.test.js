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
    const bridgeModulePath = require('path').resolve(__dirname, '../src/mcp/utils/mcp-bridge.js');
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

    const reloaderModulePath = require('path').resolve(__dirname, '../src/utils/loaders/mcp-bridge-reloader.js');
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
    BridgeReloader = require('../src/utils/loaders/mcp-bridge-reloader');

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

  test('tools/call correctly maps cleaned tool names to original bridge tool names (chrome_new_page -> new_page)', async () => {
    // This test verifies the fix for issue #449: chrome MCP call failure
    // When a tool is listed as 'chrome_new_page' but exposed as 'new_page',
    // calling 'new_page' should correctly map back to 'chrome_new_page'
    
    // Create a mock bridge with chrome_new_page tool
    const bridgeModulePath = require('path').resolve(__dirname, '../src/mcp/utils/mcp-bridge.js');
    const MockBridge = jest.fn().mockImplementation(() => {
      let callCount = 0;
      return {
        start() {},
        on() {},
        async rpcRequest(method, params) {
          if (method === 'tools/list') {
            return { 
              tools: [
                { 
                  name: 'chrome_new_page', 
                  description: 'Create a new page', 
                  inputSchema: { 
                    type: 'object', 
                    properties: { 
                      url: { type: 'string' } 
                    } 
                  } 
                }
              ]
            };
          }
          if (method === 'tools/call') {
            callCount++;
            // Verify that the tool name used is the original 'chrome_new_page', not 'new_page'
            if (params.name === 'chrome_new_page') {
              return { 
                content: [{ 
                  type: 'text', 
                  text: JSON.stringify({ success: true, tool: params.name, arguments: params.arguments }) 
                }], 
                isError: false 
              };
            }
            // If wrong name is used, return error
            throw new Error(`Tool ${params.name} not found`);
          }
          throw new Error('unsupported');
        }
      };
    });

    const reloaderModulePath = require('path').resolve(__dirname, '../src/utils/loaders/mcp-bridge-reloader.js');
    jest.doMock(reloaderModulePath, () => {
      return class MockReloader {
        ensureBridges() {
          return new Map([
            ['chrome', new MockBridge()]
          ]);
        }
      };
    });

    // Reset modules to use the new mock
    jest.resetModules();
    const DynamicAPIMCPServer = require('../src/mcp');
    const BridgeReloader = require('../src/utils/loaders/mcp-bridge-reloader');
    
    const reloader = new BridgeReloader();
    const mcp = new DynamicAPIMCPServer('127.0.0.1', 0, { bridgeReloader: reloader });
    mcp.setRoutes([]);

    // First, verify the tool is listed as 'new_page' (cleaned name)
    const listResp = await mcp.processMCPRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(listResp && listResp.result && Array.isArray(listResp.result.tools)).toBe(true);
    const toolNames = listResp.result.tools.map(t => t.name);
    expect(toolNames).toContain('new_page');

    // Then, call the tool using the cleaned name 'new_page'
    const callResp = await mcp.processMCPRequest({ 
      jsonrpc: '2.0', 
      id: 2, 
      method: 'tools/call', 
      params: { 
        name: 'new_page', 
        arguments: { url: 'https://example.com' } 
      } 
    });
    
    // Verify the call succeeded (should have mapped 'new_page' to 'chrome_new_page')
    expect(callResp.result).toBeDefined();
    expect(callResp.result.content).toBeDefined();
    const resultText = callResp.result.content[0].text;
    const result = JSON.parse(resultText);
    expect(result.success).toBe(true);
    expect(result.tool).toBe('chrome_new_page');
    expect(result.arguments.url).toBe('https://example.com');
  });
});


