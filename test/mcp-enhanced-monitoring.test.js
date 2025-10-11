/**
 * Test enhanced monitoring and performance features in MCP server
 */

const DynamicAPIMCPServer = require('../src/mcp/mcp-server');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('MCP Enhanced Monitoring and Performance', () => {
  let mcpServer;
  let tempDir;

  beforeEach(() => {
    // Create temporary directory for test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-test-'));
    
    // Create test MCP structure
    fs.mkdirSync(path.join(tempDir, 'mcp'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'mcp', 'prompts'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'mcp', 'resources'), { recursive: true });
    
    // Create test files
    fs.writeFileSync(path.join(tempDir, 'mcp', 'prompts', 'test-prompt.md'), 
      '<!-- description: Test prompt -->\nTest prompt with {{param}}');
    fs.writeFileSync(path.join(tempDir, 'mcp', 'resources', 'test-resource.md'), 
      'Test resource content');
    
    mcpServer = new DynamicAPIMCPServer('127.0.0.1', 0, {
      mcp: { basePath: path.join(tempDir, 'mcp') },
      quiet: true,
      logLevel: 'debug',
      enableDetailedErrors: true
    });
  });

  afterEach(() => {
    if (mcpServer) {
      mcpServer.stop();
    }
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Enhanced Metrics Collection', () => {
    test('should initialize metrics correctly', () => {
      expect(mcpServer.metrics).toBeDefined();
      expect(mcpServer.metrics.startTime).toBeGreaterThan(0);
      expect(mcpServer.metrics.requestCount).toBe(0);
      expect(mcpServer.metrics.errorCount).toBe(0);
      expect(mcpServer.metrics.responseTimes).toEqual([]);
      expect(mcpServer.metrics.errorTypes).toBeInstanceOf(Map);
    });

    test('should track request metrics', () => {
      const startTime = Date.now();
      mcpServer.trackRequest('tool', startTime, true);
      
      expect(mcpServer.metrics.requestCount).toBe(1);
      expect(mcpServer.metrics.toolCalls).toBe(1);
      expect(mcpServer.metrics.responseTimes.length).toBe(1);
      expect(mcpServer.metrics.responseTimes[0]).toBeGreaterThanOrEqual(0);
    });

    test('should track error metrics', () => {
      const startTime = Date.now();
      mcpServer.trackRequest('tool', startTime, false, 'test_error');
      
      expect(mcpServer.metrics.requestCount).toBe(1);
      expect(mcpServer.metrics.errorCount).toBe(1);
      expect(mcpServer.metrics.errorTypes.get('test_error')).toBe(1);
    });

    test('should calculate average response time', () => {
      const startTime1 = Date.now();
      mcpServer.trackRequest('tool', startTime1, true);
      
      const startTime2 = Date.now();
      mcpServer.trackRequest('tool', startTime2, true);
      
      expect(mcpServer.metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(mcpServer.metrics.responseTimes.length).toBe(2);
    });
  });

  describe('Enhanced Error Handling', () => {
    test('should handle errors with detailed information', () => {
      const error = new Error('Test error');
      const context = { method: 'test', id: '123' };
      
      const result = mcpServer.handleError(error, context);
      
      expect(result.jsonrpc).toBe('2.0');
      expect(result.error.code).toBe(-32603);
      expect(result.error.message).toBe('Test error');
      expect(result.error.data).toBeDefined();
      expect(result.error.data.context).toEqual(context);
    });

    test('should respect enableDetailedErrors setting', () => {
      const errorServer = new DynamicAPIMCPServer('127.0.0.1', 0, {
        enableDetailedErrors: false,
        quiet: true
      });
      
      const error = new Error('Test error');
      const result = errorServer.handleError(error);
      
      expect(result.error.message).toBe('Internal Server Error');
      expect(result.error.data).toBeUndefined();
    });
  });

  describe('Enhanced Logging', () => {
    test('should log with different levels', () => {
      // Create a server with quiet: false to enable logging
      const testServer = new DynamicAPIMCPServer('127.0.0.1', 0, {
        quiet: false,
        logLevel: 'debug'
      });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      testServer.info('Test info message', { data: 'test' });
      testServer.warn('Test warning message', { data: 'test' });
      testServer.error('Test error message', { data: 'test' });
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('should respect log level setting', () => {
      const debugServer = new DynamicAPIMCPServer('127.0.0.1', 0, {
        logLevel: 'error',
        quiet: false
      });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      debugServer.debug('Debug message');
      debugServer.info('Info message');
      debugServer.error('Error message');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Health Check Endpoint', () => {
    test('should return health status', async () => {
      // Reset metrics to ensure healthy status
      mcpServer.metrics.requestCount = 0;
      mcpServer.metrics.errorCount = 0;
      mcpServer.metrics.responseTimes = [];
      
      const request = {
        jsonrpc: '2.0',
        id: 'test-1',
        method: 'health'
      };
      
      const response = await mcpServer.processHealth(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe('test-1');
      expect(response.result).toBeDefined();
      // The health check itself will be tracked, so we expect either healthy or degraded
      expect(['healthy', 'degraded']).toContain(response.result.status);
      expect(response.result.server).toBeDefined();
      expect(response.result.metrics).toBeDefined();
      expect(response.result.resources).toBeDefined();
    });

    test('should show degraded status with high error rate', async () => {
      // Simulate high error rate
      mcpServer.metrics.requestCount = 10;
      mcpServer.metrics.errorCount = 2; // 20% error rate
      
      const request = {
        jsonrpc: '2.0',
        id: 'test-1',
        method: 'health'
      };
      
      const response = await mcpServer.processHealth(request);
      
      expect(response.result.status).toBe('degraded');
    });
  });

  describe('Metrics Endpoint', () => {
    test('should return comprehensive metrics', async () => {
      // Generate some test metrics
      mcpServer.trackRequest('tool', Date.now(), true);
      mcpServer.trackRequest('prompt', Date.now(), true);
      mcpServer.trackRequest('resource', Date.now(), true);
      
      const request = {
        jsonrpc: '2.0',
        id: 'test-1',
        method: 'metrics'
      };
      
      const response = await mcpServer.processMetrics(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe('test-1');
      expect(response.result).toBeDefined();
      expect(response.result.server).toBeDefined();
      expect(response.result.performance).toBeDefined();
      expect(response.result.requests).toBeDefined();
      expect(response.result.errors).toBeDefined();
      expect(response.result.resources).toBeDefined();
    });

    test('should include response time statistics', async () => {
      // Generate multiple requests to test response time calculations
      for (let i = 0; i < 5; i++) {
        mcpServer.trackRequest('tool', Date.now(), true);
      }
      
      const request = {
        jsonrpc: '2.0',
        id: 'test-1',
        method: 'metrics'
      };
      
      const response = await mcpServer.processMetrics(request);
      
      expect(response.result.performance.responseTimes).toBeDefined();
      expect(response.result.performance.responseTimes.count).toBe(5);
      expect(response.result.performance.responseTimes.min).toBeGreaterThanOrEqual(0);
      expect(response.result.performance.responseTimes.max).toBeGreaterThanOrEqual(0);
      expect(response.result.performance.responseTimes.avg).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Tracking Integration', () => {
    test('should track requests in processMCPRequest', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 'test-1',
        method: 'ping'
      };
      
      const initialRequestCount = mcpServer.metrics.requestCount;
      
      const response = await mcpServer.processMCPRequest(request);
      
      expect(response.jsonrpc).toBe('2.0');
      expect(response.result.type).toBe('pong');
      expect(mcpServer.metrics.requestCount).toBe(initialRequestCount + 1);
    });

    test('should track errors in processMCPRequest', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 'test-1',
        method: 'nonexistent_method'
      };
      
      const initialErrorCount = mcpServer.metrics.errorCount;
      
      const response = await mcpServer.processMCPRequest(request);
      
      expect(response.error).toBeDefined();
      expect(mcpServer.metrics.errorCount).toBe(initialErrorCount + 1);
    });
  });

  describe('Error Type Tracking', () => {
    test('should track different error types', () => {
      mcpServer.trackRequest('tool', Date.now(), false, 'validation_error');
      mcpServer.trackRequest('tool', Date.now(), false, 'timeout_error');
      mcpServer.trackRequest('tool', Date.now(), false, 'validation_error');
      
      expect(mcpServer.metrics.errorTypes.get('validation_error')).toBe(2);
      expect(mcpServer.metrics.errorTypes.get('timeout_error')).toBe(1);
    });
  });

  describe('Last Activity Tracking', () => {
    test('should update last activity on requests', () => {
      const initialActivity = mcpServer.metrics.lastActivity;
      
      // Wait a bit to ensure time difference
      setTimeout(() => {
        mcpServer.trackRequest('tool', Date.now(), true);
        expect(mcpServer.metrics.lastActivity).toBeGreaterThan(initialActivity);
      }, 10);
    });
  });
});
