// Ensure example APIs are loaded and MCP server is started
process.env.EASY_MCP_SERVER_API_PATH = require('path').join(__dirname, '..', 'example-project', 'api');
jest.resetModules();

const request = require('supertest');
const http = require('http');

// Boot the server app (this also starts MCP server at EASY_MCP_SERVER_MCP_PORT)
const { app } = require('../src/app/server');

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
  beforeAll(async () => {
    // warm up express endpoints
    await request(app).get('/openapi.json').expect(200);
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
    const mcpUrl = 'http://127.0.0.1:8888/mcp';
    const list = async () => postJSON(mcpUrl, { jsonrpc: '2.0', id: 1, method: 'tools/list' });
    // 1) initial list
    let r = await list();
    const find = name => r && r.result && Array.isArray(r.result.tools) && r.result.tools.find(t => t.name === name);
    expect(find('api__users_get').inputSchema.properties.query.properties.active).toBeDefined();
    // 2) simulate selecting another tool (no-op, but we re-list)
    r = await list();
    expect(find('api__users_post')).toBeDefined();
    // 3) list again and re-check users_get
    r = await list();
    expect(find('api__users_get').inputSchema.properties.query.properties.active).toBeDefined();
  });
});


