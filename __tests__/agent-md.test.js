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
    expect(response.text).toContain('# Easy MCP Server - Agent Context');
    expect(response.text).toContain('## Overview');
    expect(response.text).toContain('## Core Principles');
    expect(response.text).toContain('## MCP Integration');
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
    expect(content).toContain('## Core Principles');
    expect(content).toContain('## API Development Pattern');
    expect(content).toContain('## MCP Integration');
    expect(content).toContain('## Available MCP Commands');
    expect(content).toContain('## Server Endpoints');
    expect(content).toContain('## Annotation System');
    expect(content).toContain('## Development Workflow');
    expect(content).toContain('## AI Agent Usage');
    expect(content).toContain('## Configuration');
    expect(content).toContain('## Best Practices');
    expect(content).toContain('## Error Handling');
    expect(content).toContain('## Common Issues & Solutions');
    expect(content).toContain('## Testing');
    expect(content).toContain('## Deployment');

    // Check for MCP commands
    expect(content).toContain('tools/list');
    expect(content).toContain('tools/call');
    expect(content).toContain('prompts/list');
    expect(content).toContain('prompts/get');
    expect(content).toContain('resources/list');
    expect(content).toContain('resources/read');
    expect(content).toContain('ping');

    // Check for code examples
    expect(content).toContain('```javascript');
    expect(content).toContain('const BaseAPI = require');
    expect(content).toContain('class MyAPI extends BaseAPI');
    expect(content).toContain('process(req, res)');

    // Check for MCP examples
    expect(content).toContain('this.prompts = [');
    expect(content).toContain('this.resources = [');
    expect(content).toContain('{{name}}');
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

    // Check for all three MCP capabilities
    expect(content).toContain('### Tools');
    expect(content).toContain('### Prompts');
    expect(content).toContain('### Resources');

    // Check for transport information
    expect(content).toContain('Streamable HTTP');
    expect(content).toContain('WebSocket');
    expect(content).toContain('Server-Sent Events');
  });
});
