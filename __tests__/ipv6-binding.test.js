const net = require('net');
const DynamicAPIMCPServer = require('../src/mcp/mcp-server');

describe('IPv6 Binding Fix for Kubernetes Compatibility', () => {
  let mcpServer;
  let testPort;

  beforeEach(() => {
    // Use a random port to avoid conflicts
    testPort = Math.floor(Math.random() * 10000) + 30000;
    mcpServer = new DynamicAPIMCPServer('0.0.0.0', testPort);
  });

  afterEach(async () => {
    if (mcpServer) {
      try {
        await mcpServer.stop();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  test('MCP server binds to all interfaces by default', async () => {
    // Start the MCP server
    await mcpServer.run();
    
    // Wait a moment for the server to fully start
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Try to connect from localhost (IPv4)
    const localhostConnection = new Promise((resolve) => {
      const client = net.createConnection(testPort, '127.0.0.1');
      client.on('connect', () => {
        client.destroy();
        resolve(true);
      });
      client.on('error', () => {
        client.destroy();
        resolve(false);
      });
      // Add timeout to prevent hanging
      setTimeout(() => {
        client.destroy();
        resolve(false);
      }, 2000);
    });

    // Try to connect from localhost (IPv6) - this might fail on some systems
    const ipv6Connection = new Promise((resolve) => {
      const client = net.createConnection(testPort, '::1');
      client.on('connect', () => {
        client.destroy();
        resolve(true);
      });
      client.on('error', () => {
        client.destroy();
        resolve(false);
      });
      // Add timeout to prevent hanging
      setTimeout(() => {
        client.destroy();
        resolve(false);
      }, 2000);
    });

    // Wait for both connection attempts with timeout
    const [localhostSuccess, ipv6Success] = await Promise.all([
      localhostConnection,
      ipv6Connection
    ]);

    // IPv4 localhost should definitely succeed since we're binding to 0.0.0.0
    expect(localhostSuccess).toBe(true);
    
    // IPv6 might fail on some systems, but the important thing is that
    // we're binding to all interfaces, not just IPv6 localhost
    console.log(`IPv4 localhost connection: ${localhostSuccess ? 'SUCCESS' : 'FAILED'}`);
    console.log(`IPv6 localhost connection: ${ipv6Success ? 'SUCCESS' : 'FAILED'}`);
    
    // The key fix is that we're no longer binding to 'localhost' which would
    // bind to IPv6 ::1 only, but instead binding to '0.0.0.0' which binds
    // to all IPv4 interfaces
  }, 10000); // Increase timeout to 10 seconds

  test('MCP server constructor defaults to 0.0.0.0', () => {
    const defaultServer = new DynamicAPIMCPServer();
    expect(defaultServer.host).toBe('0.0.0.0');
  });

  test('MCP server can still bind to specific interfaces when needed', () => {
    const localhostServer = new DynamicAPIMCPServer('localhost', 3001);
    expect(localhostServer.host).toBe('localhost');
    
    const customServer = new DynamicAPIMCPServer('192.168.1.100', 3001);
    expect(customServer.host).toBe('192.168.1.100');
  });

  test('Server startup logs show correct binding address', async () => {
    // Capture console.log output
    const originalLog = console.log;
    const logs = [];
    console.log = (...args) => {
      logs.push(args.join(' '));
    };

    try {
      await mcpServer.run();
      
      // Wait a moment for the server to fully start
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check that the startup message shows the correct binding
      const startupLog = logs.find(log => log.includes('WebSocket server listening'));
      expect(startupLog).toBeDefined();
      expect(startupLog).toContain('0.0.0.0');
    } finally {
      console.log = originalLog;
      // Ensure cleanup
      try {
        await mcpServer.stop();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }, 10000); // Increase timeout to 10 seconds
});
