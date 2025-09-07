/**
 * Tests for BaseAPIEnhanced
 */

const BaseAPIEnhanced = require('../src/lib/base-api-enhanced');

// Mock dependencies
jest.mock('../src/lib/redis-client');
jest.mock('../src/utils/logger');
jest.mock('../src/lib/llm-service');
jest.mock('../src/utils/resource-loader');
jest.mock('../src/lib/wordpress-source-manager');

describe('BaseAPIEnhanced', () => {
  let api;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Mock request and response objects
    mockReq = {
      method: 'GET',
      url: '/test',
      body: {},
      headers: {},
      ip: '127.0.0.1'
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      statusCode: 200
    };

    // Create API instance
    api = new BaseAPIEnhanced('test-service', {
      redis: { host: 'localhost', port: 6379 },
      logger: { level: 'info' },
      llm: { provider: 'mock' }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create BaseAPIEnhanced instance', () => {
      expect(api.serviceName).toBe('test-service');
      expect(api.options).toBeDefined();
      expect(api.isInitialized).toBe(false);
      expect(api.prompts).toEqual([]);
      expect(api.resources).toEqual([]);
    });
  });

  describe('initialize', () => {
    it('should initialize all components', async () => {
      await api.initialize();

      expect(api.isInitialized).toBe(true);
      expect(api.logger).toBeDefined();
      expect(api.redis).toBeDefined();
      expect(api.llm).toBeDefined();
      expect(api.resourceLoader).toBeDefined();
    });

    it('should not initialize twice', async () => {
      await api.initialize();
      const firstInit = api.isInitialized;

      await api.initialize();
      const secondInit = api.isInitialized;

      expect(firstInit).toBe(true);
      expect(secondInit).toBe(true);
    });
  });

  describe('process', () => {
    beforeEach(async () => {
      await api.initialize();
    });

    it('should process request and call handleRequest', async () => {
      // Mock handleRequest method
      api.handleRequest = jest.fn().mockResolvedValue({ success: true });

      await api.process(mockReq, mockRes);

      expect(api.handleRequest).toHaveBeenCalledWith(mockReq, mockRes);
    });

    it('should handle errors in request processing', async () => {
      // Mock handleRequest to throw error
      api.handleRequest = jest.fn().mockRejectedValue(new Error('Test error'));

      await api.process(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test error',
        timestamp: expect.any(String)
      });
    });
  });

  describe('response utilities', () => {
    beforeEach(async () => {
      await api.initialize();
    });

    it('should send success response', () => {
      const data = { id: 1 };
      const message = 'Success';
      const statusCode = 200;

      api.sendSuccessResponse(mockRes, data, message, statusCode);

      expect(mockRes.status).toHaveBeenCalledWith(statusCode);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message,
        timestamp: expect.any(String),
        data
      });
    });

    it('should send error response', () => {
      const message = 'Error occurred';
      const statusCode = 400;

      api.sendErrorResponse(mockRes, message, statusCode);

      expect(mockRes.status).toHaveBeenCalledWith(statusCode);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: message,
        timestamp: expect.any(String)
      });
    });

    it('should validate request body', () => {
      const body = { email: 'test@example.com' };
      const schema = {
        required: ['email'],
        properties: {
          email: { type: 'string' }
        }
      };

      const result = api.validateRequestBody(body, schema);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('caching', () => {
    beforeEach(async () => {
      await api.initialize();
    });

    it('should cache data', async () => {
      const key = 'test-key';
      const data = { test: 'data' };
      const ttl = 3600;

      const result = await api.cacheData(key, data, ttl);

      expect(api.redis.set).toHaveBeenCalledWith(key, data, ttl);
      expect(result).toBe(true);
    });

    it('should get cached data', async () => {
      const key = 'test-key';
      const cachedData = { test: 'data' };
      
      api.redis.get.mockResolvedValue(cachedData);

      const result = await api.getCachedData(key);

      expect(api.redis.get).toHaveBeenCalledWith(key);
      expect(result).toEqual(cachedData);
    });

    it('should return false when Redis is not available', async () => {
      api.redis = null;

      const result = await api.cacheData('key', 'data');

      expect(result).toBe(false);
    });
  });

  describe('LLM integration', () => {
    beforeEach(async () => {
      await api.initialize();
    });

    it('should generate text using LLM', async () => {
      const prompt = 'Test prompt';
      const options = { maxTokens: 100 };
      const generatedText = 'Generated response';

      api.llm.generate.mockResolvedValue(generatedText);

      const result = await api.generateText(prompt, options);

      expect(api.llm.generate).toHaveBeenCalledWith(prompt, options);
      expect(result).toBe(generatedText);
    });

    it('should throw error when LLM is not available', async () => {
      api.llm = null;

      await expect(api.generateText('prompt')).rejects.toThrow('LLM service not available');
    });

    it('should generate streaming text', async () => {
      const prompt = 'Test prompt';
      const chunks = ['Hello', ' ', 'World'];
      
      api.llm.generateStream.mockImplementation(async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
      });

      const result = [];
      for await (const chunk of api.generateStreamingText(prompt)) {
        result.push(chunk);
      }

      expect(result).toEqual(chunks);
    });
  });

  describe('WordPress integration', () => {
    beforeEach(async () => {
      await api.initialize();
    });

    it('should check for WordPress duplicate', async () => {
      const content = 'Test content';
      const metadata = { source: 'test' };
      const duplicateResult = { isDuplicate: false };

      api.wordpressSourceManager.checkForDuplicate.mockResolvedValue(duplicateResult);

      const result = await api.checkWordPressDuplicate(content, metadata);

      expect(api.wordpressSourceManager.checkForDuplicate).toHaveBeenCalledWith(content, metadata);
      expect(result).toEqual(duplicateResult);
    });

    it('should register WordPress content', async () => {
      const content = 'Test content';
      const metadata = { source: 'test' };
      const registerResult = { success: true };

      api.wordpressSourceManager.registerContent.mockResolvedValue(registerResult);

      const result = await api.registerWordPressContent(content, metadata);

      expect(api.wordpressSourceManager.registerContent).toHaveBeenCalledWith(content, metadata, null);
      expect(result).toEqual(registerResult);
    });
  });

  describe('MCP resources', () => {
    beforeEach(async () => {
      await api.initialize();
    });

    it('should get MCP resource by URI', () => {
      const uri = 'resource://test';
      const resource = { uri, name: 'Test Resource' };

      api.resourceLoader.getResource.mockReturnValue(resource);

      const result = api.getMCPResource(uri);

      expect(api.resourceLoader.getResource).toHaveBeenCalledWith(uri);
      expect(result).toEqual(resource);
    });

    it('should get MCP prompt by name', () => {
      const name = 'test-prompt';
      const prompt = { name, description: 'Test prompt' };

      api.resourceLoader.getPrompt.mockReturnValue(prompt);

      const result = api.getMCPPrompt(name);

      expect(api.resourceLoader.getPrompt).toHaveBeenCalledWith(name);
      expect(result).toEqual(prompt);
    });

    it('should create markdown resource', () => {
      const uri = 'resource://test';
      const name = 'Test Resource';
      const description = 'Test description';
      const content = '# Test Content';
      const resource = { uri, name, description, content };

      api.resourceLoader.createMarkdownResource.mockReturnValue(resource);

      const result = api.createMarkdownResource(uri, name, description, content);

      expect(api.resourceLoader.createMarkdownResource).toHaveBeenCalledWith(uri, name, description, content);
      expect(result).toEqual(resource);
    });
  });

  describe('health check', () => {
    beforeEach(async () => {
      await api.initialize();
    });

    it('should return healthy status', async () => {
      api.redis.getStatus.mockReturnValue({ isConnected: true });

      await api.healthCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Service is healthy',
        timestamp: expect.any(String),
        data: expect.objectContaining({
          serviceName: 'test-service',
          isInitialized: true
        })
      });
    });

    it('should return unhealthy status', async () => {
      api.redis.getStatus.mockReturnValue({ isConnected: false });

      await api.healthCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Service has issues',
        timestamp: expect.any(String),
        data: expect.objectContaining({
          serviceName: 'test-service',
          isInitialized: true
        })
      });
    });
  });

  describe('service status', () => {
    beforeEach(async () => {
      await api.initialize();
    });

    it('should return service status', () => {
      const status = api.getServiceStatus();

      expect(status).toEqual({
        serviceName: 'test-service',
        isInitialized: true,
        components: {
          logger: true,
          redis: expect.any(Object),
          llm: expect.any(Object),
          resourceLoader: expect.any(Object),
          wordpressSourceManager: expect.any(Object)
        },
        resources: {
          prompts: 0,
          resources: 0
        }
      });
    });
  });

  describe('metrics', () => {
    beforeEach(async () => {
      await api.initialize();
    });

    it('should return service metrics', () => {
      const metrics = api.getMetrics();

      expect(metrics).toEqual({
        serviceName: 'test-service',
        uptime: expect.any(Number),
        memory: expect.any(Object),
        timestamp: expect.any(String),
        components: {
          redis: expect.any(Object),
          llm: expect.any(Object),
          resourceLoader: expect.any(Object),
          wordpressSourceManager: expect.any(Object)
        }
      });
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      await api.initialize();
    });

    it('should cleanup resources', async () => {
      await api.cleanup();

      expect(api.redis.disconnect).toHaveBeenCalled();
    });
  });
});
