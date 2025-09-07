const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Import the server
const server = require('../src/server');

describe('Agent.md Endpoint', () => {
  let app;

  beforeAll(() => {
    app = server.app;
  });

  test('GET /Agent.md should return agent context file', async () => {
    const response = await request(app)
      .get('/Agent.md')
      .expect(200);

    expect(response.headers['content-type']).toMatch(/text\/markdown/);
    expect(response.text).toContain('# easy-mcp-server - Agent Context');
    expect(response.text).toContain('## Agent Integration Overview');
    expect(response.text).toContain('## Core Agent Capabilities');
    expect(response.text).toContain('## Agent Development Workflow');
  });

  test('GET /Agent.md should return 404 if file does not exist', async () => {
    // Temporarily rename the file to test 404 case
    const agentPath = path.join(__dirname, '..', 'Agent.md');
    const backupPath = path.join(__dirname, '..', 'Agent.md.backup');
    
    if (fs.existsSync(agentPath)) {
      fs.renameSync(agentPath, backupPath);
    }

    const response = await request(app)
      .get('/Agent.md')
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Agent.md file not found');

    // Restore the file
    if (fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, agentPath);
    }
  });

  test('Agent.md should contain comprehensive framework information', async () => {
    const response = await request(app)
      .get('/Agent.md')
      .expect(200);

    const content = response.text;

    // Check for key sections
    expect(content).toContain('## Agent Integration Overview');
    expect(content).toContain('## Core Agent Capabilities');
    expect(content).toContain('## Agent Development Workflow');
    expect(content).toContain('## Agent Tool Categories');
    expect(content).toContain('## Agent Error Handling');
    expect(content).toContain('## Agent Configuration');
    expect(content).toContain('## Agent Monitoring');
    expect(content).toContain('## Agent Best Practices');
    expect(content).toContain('## Agent Integration Examples');
    expect(content).toContain('## Troubleshooting for Agents');

    // Check for MCP commands
    expect(content).toContain('tools/list');
    expect(content).toContain('tools/call');

    // Check for code examples
    expect(content).toContain('```javascript');
    expect(content).toContain('const BaseAPI = require');
    expect(content).toContain('class GetUsers extends BaseAPI');
    expect(content).toContain('process(req, res)');

    // Check for JSON examples
    expect(content).toContain('"jsonrpc": "2.0"');
    expect(content).toContain('"method": "tools/list"');
  });

  test('Agent.md should be accessible alongside other documentation endpoints', async () => {
    // Test that all documentation endpoints are accessible
    const endpoints = [
      '/LLM.txt',
      '/Agent.md',
      '/openapi.json',
      '/docs'
    ];

    for (const endpoint of endpoints) {
      const response = await request(app)
        .get(endpoint)
        .expect(200);
      
      expect(response.status).toBe(200);
    }
  });

  test('Agent.md should contain up-to-date MCP information', async () => {
    const response = await request(app)
      .get('/Agent.md')
      .expect(200);

    const content = response.text;

    // Check for MCP 2024-11-05 compliance
    expect(content).toContain('MCP) 2024-11-05');
    expect(content).toContain('Model Context Protocol');

    // Check for MCP capabilities (updated to match new Agent.md structure)
    expect(content).toContain('Automatic Tool Discovery');
    expect(content).toContain('Agent-Optimized Features');
    expect(content).toContain('Agent Development Workflow');

    // Check for transport information
    expect(content).toContain('HTTP');
    expect(content).toContain('WebSocket');
    expect(content).toContain('Server-Sent Events');
  });
});
