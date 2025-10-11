/**
 * Tests for Graceful API Initialization
 * Tests the enhanced BaseAPIEnhanced class with graceful error handling
 */

const BaseAPIEnhanced = require('../src/lib/base-api-enhanced');
const express = require('express');
const request = require('supertest');

describe('Graceful API Initialization', () => {
  let app;
  let server;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  describe('BaseAPIEnhanced Graceful Initialization', () => {
    test('should handle initialization success', async () => {
      class TestAPI extends BaseAPIEnhanced {
        async _initializeLLM() {
          // Mock successful LLM initialization
          this.llm = { getStatus: () => ({ status: 'ready' }) };
        }

        async handleRequest(req, res) {
          res.json({ success: true, message: 'Test API working' });
        }
      }

      const api = new TestAPI('test-api', { llm: { enabled: true } });
      await api.initialize();

      expect(api.initializationStatus).toBe('success');
      expect(api.isInitialized).toBe(true);
      expect(api.initializationError).toBeNull();
    });

    test('should handle initialization failure gracefully', async () => {
      class FailingAPI extends BaseAPIEnhanced {
        async _initializeLLM() {
          throw new Error('LLM service connection failed');
        }

        async handleRequest(req, res) {
          res.json({ success: true, message: 'This should not be called' });
        }
      }

      const api = new FailingAPI('failing-api', { llm: { enabled: true } });
      await api.initialize();

      expect(api.initializationStatus).toBe('failed');
      expect(api.isInitialized).toBe(false);
      expect(api.initializationError).toBeDefined();
      expect(api.initializationError.message).toBe('LLM service connection failed');
    });

    test('should return 503 for failed initialization', async () => {
      class FailingAPI extends BaseAPIEnhanced {
        async _initializeLLM() {
          throw new Error('Database connection failed');
        }

        async handleRequest(req, res) {
          res.json({ success: true, message: 'This should not be called' });
        }
      }

      const api = new FailingAPI('failing-api', { llm: { enabled: true } });
      await api.initialize();

      const mockReq = { url: '/test', method: 'GET' };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      await api.process(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Service temporarily unavailable',
          details: expect.stringContaining('Database connection failed')
        })
      );
    });

    test('should support retry mechanism', async () => {
      let initAttempts = 0;
      
      class RetryableAPI extends BaseAPIEnhanced {
        async _initializeLLM() {
          initAttempts++;
          if (initAttempts < 2) {
            throw new Error('Temporary connection failure');
          }
          this.llm = { getStatus: () => ({ status: 'ready' }) };
        }

        async handleRequest(req, res) {
          res.json({ success: true, message: 'Retry successful' });
        }
      }

      const api = new RetryableAPI('retryable-api', { 
        llm: { enabled: true },
        maxRetries: 3,
        retryDelay: 100
      });

      // First initialization should fail
      await api.initialize();
      expect(api.initializationStatus).toBe('failed');
      expect(api.retryCount).toBe(0);

      // Retry should succeed
      const retryResult = await api.retryInitialization();
      expect(retryResult).toBe(true);
      expect(api.initializationStatus).toBe('success');
      expect(api.retryCount).toBe(1);
    });

    test('should respect max retry limit', async () => {
      class AlwaysFailingAPI extends BaseAPIEnhanced {
        async _initializeLLM() {
          throw new Error('Persistent failure');
        }

        async handleRequest(req, res) {
          res.json({ success: true, message: 'This should not be called' });
        }
      }

      const api = new AlwaysFailingAPI('always-failing-api', { 
        llm: { enabled: true },
        maxRetries: 2,
        retryDelay: 10
      });

      await api.initialize();
      expect(api.initializationStatus).toBe('failed');

      // Try to retry beyond max retries
      const retryResult1 = await api.retryInitialization();
      expect(retryResult1).toBe(false);
      expect(api.retryCount).toBe(1);

      const retryResult2 = await api.retryInitialization();
      expect(retryResult2).toBe(false);
      expect(api.retryCount).toBe(2);

      const retryResult3 = await api.retryInitialization();
      expect(retryResult3).toBe(false);
      expect(api.retryCount).toBe(2); // Should not exceed max retries
    });

    test('should provide detailed service status', async () => {
      class TestAPI extends BaseAPIEnhanced {
        async _initializeLLM() {
          throw new Error('LLM initialization failed');
        }

        async handleRequest(req, res) {
          res.json({ success: true, message: 'Test API working' });
        }
      }

      const api = new TestAPI('test-api', { 
        llm: { enabled: true },
        maxRetries: 3
      });

      await api.initialize();

      const status = api.getServiceStatus();
      expect(status).toEqual({
        serviceName: 'test-api',
        isInitialized: false,
        initializationStatus: 'failed',
        initializationError: 'LLM initialization failed',
        retryCount: 0,
        maxRetries: 3,
        components: expect.objectContaining({
          logger: true,
          llm: null,
          resourceLoader: expect.any(Object)
        }),
        resources: expect.objectContaining({
          prompts: expect.any(Number),
          resources: expect.any(Number)
        })
      });
    });
  });

  describe('Server Integration Tests', () => {
    test('should start server even with failing APIs', async () => {
      // Create a test API that fails initialization
      const fs = require('fs');
      const path = require('path');
      
      const failingApiCode = `
const BaseAPIEnhanced = require('../../src/lib/base-api-enhanced');

class FailingTestAPI extends BaseAPIEnhanced {
  async _initializeLLM() {
    throw new Error('Test API initialization failure');
  }

  async handleRequest(req, res) {
    res.json({ success: true, message: 'This should not be called' });
  }
}

module.exports = FailingTestAPI;
`;

      // Create temp directory
      const tempDir = path.join(__dirname, 'temp-api');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      
      fs.writeFileSync(path.join(tempDir, 'get.js'), failingApiCode);

      // Create Express app with API loader
      const APILoader = require('../src/core/api-loader');
      const apiLoader = new APILoader(app, path.join(__dirname, 'temp-api'));

      // Load APIs (should not crash server)
      const routes = apiLoader.loadAPIs();
      expect(routes.length).toBeGreaterThan(0);

      // Manually trigger initialization to simulate the failure
      for (const route of routes) {
        if (route.processorInstance && typeof route.processorInstance.initialize === 'function') {
          await route.processorInstance.initialize();
        }
      }

      // Add health endpoint
      app.get('/health', (req, res) => {
        const apiStatus = routes.map(route => {
          const processor = route.processorInstance;
          if (processor && typeof processor.getServiceStatus === 'function') {
            return processor.getServiceStatus();
          }
          return {
            serviceName: route.processor,
            path: route.path,
            method: route.method,
            status: 'unknown'
          };
        });
        
        const healthyAPIs = apiStatus.filter(api => 
          api.initializationStatus === 'success' || api.status === 'unknown'
        ).length;
        const failedAPIs = apiStatus.filter(api => 
          api.initializationStatus === 'failed'
        ).length;
        
        const overallStatus = failedAPIs === 0 ? 'healthy' : 
          healthyAPIs > 0 ? 'partial' : 'unhealthy';
        
        res.json({
          status: overallStatus,
          server: 'running',
          apis: {
            total: apiStatus.length,
            healthy: healthyAPIs,
            failed: failedAPIs,
            details: apiStatus
          }
        });
      });

      // Start server
      server = app.listen(0);

      // Test health endpoint
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('unhealthy'); // Should be unhealthy due to failing API
      expect(response.body.apis.failed).toBeGreaterThan(0);

      // Clean up
      fs.unlinkSync(path.join(__dirname, 'temp-api', 'get.js'));
      fs.rmdirSync(path.join(__dirname, 'temp-api'));
    });

    test('should provide retry endpoint', async () => {
      const APILoader = require('../src/core/api-loader');
      const apiLoader = new APILoader(app, null);

      // Mock a route with a processor that supports retry
      const mockProcessor = {
        serviceName: 'test-api',
        retryInitialization: jest.fn().mockResolvedValue(true),
        getServiceStatus: jest.fn().mockReturnValue({
          serviceName: 'test-api',
          initializationStatus: 'success'
        })
      };

      apiLoader.routes = [{
        method: 'GET',
        path: '/test',
        processor: 'TestAPI',
        processorInstance: mockProcessor
      }];

      // Add retry endpoint
      app.post('/admin/retry-initialization', async (req, res) => {
        try {
          const { api } = req.body;
          const routes = apiLoader.getRoutes();
          
          if (!api) {
            return res.status(400).json({
              success: false,
              error: 'API parameter is required',
              timestamp: new Date().toISOString()
            });
          }
          
          const route = routes.find(r => 
            r.processorInstance?.serviceName === api || 
            r.path === api ||
            r.processor === api
          );
          
          if (!route || !route.processorInstance) {
            return res.status(404).json({
              success: false,
              error: `API not found: ${api}`,
              timestamp: new Date().toISOString()
            });
          }
          
          const processor = route.processorInstance;
          
          if (typeof processor.retryInitialization !== 'function') {
            return res.status(400).json({
              success: false,
              error: 'API does not support retry initialization',
              timestamp: new Date().toISOString()
            });
          }
          
          const retryResult = await processor.retryInitialization();
          
          res.json({
            success: retryResult,
            api: api,
            result: retryResult ? 'success' : 'failed',
            status: processor.getServiceStatus(),
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          res.status(500).json({
            success: false,
            error: `Retry initialization failed: ${error.message}`,
            timestamp: new Date().toISOString()
          });
        }
      });

      server = app.listen(0);

      const response = await request(app)
        .post('/admin/retry-initialization')
        .send({ api: 'test-api' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result).toBe('success');
      expect(mockProcessor.retryInitialization).toHaveBeenCalled();
    });

    test('should handle retry endpoint errors', async () => {
      const APILoader = require('../src/core/api-loader');
      const apiLoader = new APILoader(app, null);

      // Add retry endpoint
      app.post('/admin/retry-initialization', async (req, res) => {
        try {
          const { api } = req.body;
          const routes = apiLoader.getRoutes();
          
          if (!api) {
            return res.status(400).json({
              success: false,
              error: 'API parameter is required',
              timestamp: new Date().toISOString()
            });
          }
          
          const route = routes.find(r => 
            r.processorInstance?.serviceName === api || 
            r.path === api ||
            r.processor === api
          );
          
          if (!route || !route.processorInstance) {
            return res.status(404).json({
              success: false,
              error: `API not found: ${api}`,
              timestamp: new Date().toISOString()
            });
          }
          
          const processor = route.processorInstance;
          
          if (typeof processor.retryInitialization !== 'function') {
            return res.status(400).json({
              success: false,
              error: 'API does not support retry initialization',
              timestamp: new Date().toISOString()
            });
          }
          
          const retryResult = await processor.retryInitialization();
          
          res.json({
            success: retryResult,
            api: api,
            result: retryResult ? 'success' : 'failed',
            status: processor.getServiceStatus(),
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          res.status(500).json({
            success: false,
            error: `Retry initialization failed: ${error.message}`,
            timestamp: new Date().toISOString()
          });
        }
      });

      server = app.listen(0);

      // Test missing API parameter
      await request(app)
        .post('/admin/retry-initialization')
        .send({})
        .expect(400);

      // Test API not found
      await request(app)
        .post('/admin/retry-initialization')
        .send({ api: 'nonexistent-api' })
        .expect(404);
    });
  });

  describe('Health Check Enhancement', () => {
    test('should show detailed API status in health check', async () => {
      const APILoader = require('../src/core/api-loader');
      const apiLoader = new APILoader(app, null);

      // Mock routes with different statuses
      const mockRoutes = [
        {
          method: 'GET',
          path: '/healthy',
          processor: 'HealthyAPI',
          processorInstance: {
            getServiceStatus: () => ({
              serviceName: 'healthy-api',
              initializationStatus: 'success',
              isInitialized: true
            })
          }
        },
        {
          method: 'GET',
          path: '/failing',
          processor: 'FailingAPI',
          processorInstance: {
            getServiceStatus: () => ({
              serviceName: 'failing-api',
              initializationStatus: 'failed',
              isInitialized: false,
              initializationError: 'Connection failed'
            })
          }
        }
      ];

      apiLoader.routes = mockRoutes;

      // Add health endpoint
      app.get('/health', (req, res) => {
        const routes = apiLoader.getRoutes();
        
        const apiStatus = routes.map(route => {
          const processor = route.processorInstance;
          if (processor && typeof processor.getServiceStatus === 'function') {
            return processor.getServiceStatus();
          }
          return {
            serviceName: route.processor,
            path: route.path,
            method: route.method,
            status: 'unknown'
          };
        });
        
        const healthyAPIs = apiStatus.filter(api => 
          api.initializationStatus === 'success' || api.status === 'unknown'
        ).length;
        const totalAPIs = apiStatus.length;
        const failedAPIs = apiStatus.filter(api => 
          api.initializationStatus === 'failed'
        ).length;
        
        const overallStatus = failedAPIs === 0 ? 'healthy' : 
          healthyAPIs > 0 ? 'partial' : 'unhealthy';
        
        res.json({
          status: overallStatus,
          server: 'running',
          apis: {
            total: totalAPIs,
            healthy: healthyAPIs,
            failed: failedAPIs,
            details: apiStatus
          }
        });
      });

      server = app.listen(0);

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('partial');
      expect(response.body.apis.total).toBe(2);
      expect(response.body.apis.healthy).toBe(1);
      expect(response.body.apis.failed).toBe(1);
      expect(response.body.apis.details).toHaveLength(2);
    });
  });
});
