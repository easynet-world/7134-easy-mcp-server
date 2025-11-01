/**
 * Tests for BaseAPIEnhanced
 */

const BaseAPIEnhanced = require('../src/api/base/base-api-enhanced');

// Mock dependencies
jest.mock('../src/utils/logger');
jest.mock('../src/utils/llm/llm-service');
jest.mock('../src/utils/mcp/resource-loader');

// Mock LLM service
const { createLLMService } = require('../src/utils/llm/llm-service');
createLLMService.mockImplementation(() => ({
  initialize: jest.fn().mockResolvedValue(),
  generate: jest.fn().mockResolvedValue('Mock response'),
  generateStream: jest.fn().mockImplementation(async function* () {
    yield 'Mock';
    yield ' response';
  }),
  getStatus: jest.fn().mockReturnValue({ status: 'ready' })
}));

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
        errorCode: 'INTERNAL_ERROR',
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


  describe('LLM integration', () => {
    beforeEach(async () => {
      await api.initialize();
    });

    it('should generate text using LLM', async () => {
      const prompt = 'Test prompt';
      const options = { maxTokens: 100 };
      const generatedText = 'Generated response';
      if (api.llm && typeof api.llm.generate === 'function' && api.llm.generate._isMockFunction) {
        api.llm.generate.mockResolvedValue(generatedText);
      } else {
        api.llm.generate = jest.fn().mockResolvedValue(generatedText);
      }

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
      
      if (!api.llm || !api.llm.generateStream || !api.llm.generateStream._isMockFunction) {
        api.llm.generateStream = jest.fn();
      }
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


  describe('MCP resources', () => {
    beforeEach(async () => {
      await api.initialize();
    });

    it('should get MCP resource by URI', () => {
      const uri = 'resource://test';
      const resource = { uri, name: 'Test Resource' };

      if (!api.resourceLoader || !api.resourceLoader.getResource || !api.resourceLoader.getResource._isMockFunction) {
        api.resourceLoader.getResource = jest.fn();
      }
      api.resourceLoader.getResource.mockReturnValue(resource);

      const result = api.getMCPResource(uri);

      expect(api.resourceLoader.getResource).toHaveBeenCalledWith(uri);
      expect(result).toEqual(resource);
    });

    it('should get MCP prompt by name', () => {
      const name = 'test-prompt';
      const prompt = { name, description: 'Test prompt' };

      if (!api.resourceLoader || !api.resourceLoader.getPrompt || !api.resourceLoader.getPrompt._isMockFunction) {
        api.resourceLoader.getPrompt = jest.fn();
      }
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

      if (!api.resourceLoader || !api.resourceLoader.createMarkdownResource || !api.resourceLoader.createMarkdownResource._isMockFunction) {
        api.resourceLoader.createMarkdownResource = jest.fn();
      }
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
      // Simulate unhealthy state by setting initialization status to failed
      api.initializationStatus = 'failed';
      api.isInitialized = false;

      await api.healthCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Service initialization failed',
        timestamp: expect.any(String),
        data: expect.objectContaining({
          serviceName: 'test-service',
          isInitialized: false,
          initializationStatus: 'failed'
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
        initializationStatus: 'success',
        initializationError: null,
        retryCount: 0,
        maxRetries: 3,
        components: {
          logger: true,
          llm: expect.any(Object),
          resourceLoader: expect.any(Object),
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
          llm: expect.any(Object),
          resourceLoader: expect.any(Object),
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

    });
  });
});
