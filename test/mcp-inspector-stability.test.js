// Ensure example APIs are loaded and MCP server is started
process.env.EASY_MCP_SERVER_API_PATH = require('path').join(__dirname, '..', 'example-project', 'api');
jest.resetModules();

const request = require('supertest');
const http = require('http');

// Boot the server app (Express server)
const { app, apiLoader } = require('../src/orchestrator');

// Import MCP server
const DynamicAPIMCPServer = require('../src/mcp');

async function postJSON(url, payload) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(payload));
    const { hostname, port, pathname } = new URL(url);
    const req = http.request({
      hostname,
      port,
      path: pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, res => {
      let body = '';
      res.on('data', chunk => (body += chunk.toString()));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

describe('MCP Inspector stability - tool schemas persist across selections', () => {
  let mcpServer;
  
  beforeAll(async () => {
    // Warm up express endpoints
    await request(app).get('/openapi.json').expect(200);
    
    // Start MCP server manually (like other tests do)
    const mcpPort = parseInt(process.env.EASY_MCP_SERVER_MCP_PORT) || 8888;
    const routes = apiLoader.getRoutes();
    
    mcpServer = new DynamicAPIMCPServer('127.0.0.1', mcpPort, {
      mcp: {
        basePath: require('path').join(__dirname, '..', 'example-project', 'mcp')
      }
    });
    
    mcpServer.setRoutes(routes);
    await mcpServer.run();
    
    // Wait a bit for server to be fully ready
    await new Promise(resolve => setTimeout(resolve, 200));
  });
  
  afterAll(async () => {
    if (mcpServer) {
      await mcpServer.stop();
    }
  });

  test('HTTP /mcp/tools keeps query.active for api__users_get across repeated calls', async () => {
    const getQuery = async () => {
      const res = await request(app).get('/mcp/tools').expect(200);
      const tool = res.body.tools.find(t => t.name === 'api__users_get');
      return tool && tool.inputSchema && tool.inputSchema.properties && tool.inputSchema.properties.query;
    };
    const q1 = await getQuery();
    expect(q1 && q1.properties && q1.properties.active).toBeDefined();
    const q2 = await getQuery();
    expect(q2 && q2.properties && q2.properties.active).toBeDefined();
  });

  test('JSON-RPC /mcp tools/list keeps query.active for api__users_get after interleaved calls', async () => {
    const mcpPort = parseInt(process.env.EASY_MCP_SERVER_MCP_PORT) || 8888;
    const mcpUrl = `http://127.0.0.1:${mcpPort}/mcp`;
    const list = async () => postJSON(mcpUrl, { jsonrpc: '2.0', id: 1, method: 'tools/list' });
    // 1) initial list
    let r = await list();
    const find = name => r && r.result && Array.isArray(r.result.tools) && r.result.tools.find(t => t.name === name);
    const usersGetTool = find('api__users_get');
    expect(usersGetTool).toBeDefined();
    expect(usersGetTool.inputSchema).toBeDefined();
    expect(usersGetTool.inputSchema.properties).toBeDefined();
    // JSON-RPC tools/list uses flat format (properties.active), not nested (properties.query.properties.active)
    // This differs from HTTP /mcp/tools which uses nested format
    expect(usersGetTool.inputSchema.properties.active).toBeDefined();
    // 2) simulate selecting another tool (no-op, but we re-list)
    r = await list();
    expect(find('api__users_post')).toBeDefined();
    // 3) list again and re-check users_get
    r = await list();
    const usersGetTool2 = find('api__users_get');
    expect(usersGetTool2).toBeDefined();
    expect(usersGetTool2.inputSchema.properties.active).toBeDefined();
  });
});


