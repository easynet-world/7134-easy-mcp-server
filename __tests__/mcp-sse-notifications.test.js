/**
 * End-to-end tests for MCP SSE notifications on hot reload
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const DynamicAPIMCPServer = require('../src/mcp/mcp-server');

describe('MCP SSE Notifications', () => {
  jest.setTimeout(30000);

  let server;
  let tempDir;
  let promptsDir;
  let resourcesDir;
  let port;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-sse-test-'));
    promptsDir = path.join(tempDir, 'prompts');
    resourcesDir = path.join(tempDir, 'resources');
    await fs.mkdir(promptsDir, { recursive: true });
    await fs.mkdir(resourcesDir, { recursive: true });

    // Use port 0 to bind to a random free port
    server = new DynamicAPIMCPServer('127.0.0.1', 0, {
      mcp: {
        basePath: tempDir
      },
      prompts: { enabled: true, watch: true, formats: ['*'] },
      resources: { enabled: true, watch: true, formats: ['*'] }
    });

    await server.loadPromptsAndResourcesFromFilesystem();
    await server.run();
    // Extract the bound port from underlying HTTP server
    port = server.server.address().port;
    // Allow watchers to initialize
    await new Promise(r => setTimeout(r, 500));
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (_) {}
  });

  function connectSSE() {
    return new Promise((resolve, reject) => {
      const req = http.request({
        host: '127.0.0.1',
        port,
        path: '/sse',
        method: 'GET',
        headers: {
          Accept: 'text/event-stream'
        }
      });

      req.on('response', (res) => {
        let buffer = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          buffer += chunk;
          // SSE events are separated by double newlines
          const events = buffer.split('\n\n');
          // Keep the last partial chunk in buffer
          buffer = events.pop();
          for (const event of events) {
            const line = event.split('\n').find(l => l.startsWith('data: '));
            if (line) {
              try {
                const payload = JSON.parse(line.slice(6));
                resolve({ res, req, onEvent: (handler) => {
                  res.removeAllListeners('data');
                  res.on('data', (ch) => {
                    const parts = ch.split('\n\n');
                    for (const part of parts) {
                      const l = part.split('\n').find(s => s.startsWith('data: '));
                      if (l) {
                        try { handler(JSON.parse(l.slice(6))); } catch(_) {}
                      }
                    }
                  });
                }, close: () => {
                  try { res.destroy(); } catch(_) {}
                  try { req.destroy(); } catch(_) {}
                }});
              } catch (_) {}
            }
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  test('receives promptsChanged on prompt file write', async () => {
    const { onEvent, close } = await connectSSE();
    const received = [];
    onEvent(msg => received.push(msg));

    const promptFile = path.join(promptsDir, 'hello.md');
    await fs.writeFile(promptFile, '# Hello\nContent with {{name}}');

    // Wait for watcher + event propagation
    await new Promise(r => setTimeout(r, 800));

    expect(received.some(m => m.method === 'notifications/promptsChanged')).toBe(true);
    const evt = received.find(m => m.method === 'notifications/promptsChanged');
    expect(Array.isArray(evt.params.prompts)).toBe(true);
    // Should include cached items (from cache manager) or static
    expect(evt.params.prompts.length).toBeGreaterThan(0);

    // Close SSE to avoid open handle
    close();
  });

  test('receives resourcesChanged on resource file write', async () => {
    const { onEvent, close } = await connectSSE();
    const received = [];
    onEvent(msg => received.push(msg));

    const resourceFile = path.join(resourcesDir, 'guide.md');
    await fs.writeFile(resourceFile, '# Guide\nSome content');

    await new Promise(r => setTimeout(r, 800));

    expect(received.some(m => m.method === 'notifications/resourcesChanged')).toBe(true);
    const evt = received.find(m => m.method === 'notifications/resourcesChanged');
    expect(Array.isArray(evt.params.resources)).toBe(true);
    expect(evt.params.resources.length).toBeGreaterThan(0);

    // Close SSE to avoid open handle
    close();
  });

  test('receives toolsChanged on setRoutes', async () => {
    const { onEvent, close } = await connectSSE();
    const received = [];
    onEvent(msg => received.push(msg));

    server.setRoutes([
      { method: 'GET', path: '/ping', processorInstance: {} }
    ]);

    await new Promise(r => setTimeout(r, 300));

    expect(received.some(m => m.method === 'notifications/toolsChanged')).toBe(true);
    const evt = received.find(m => m.method === 'notifications/toolsChanged');
    expect(Array.isArray(evt.params.tools)).toBe(true);

    // Close SSE to avoid open handle
    close();
  });
});


