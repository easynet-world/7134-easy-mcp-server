/**
 * LLM Service - Language Model Service Framework
 * 
 * Provides LLM service functionality with:
 * - BaseLLMService abstract class
 * - MockLLMService for testing and development
 * - OpenAILLMService implementation
 * - Streaming response support
 * - Non-blocking I/O patterns
 * 
 * @author EasyNet World
 * @version 1.0.0
 */

const EventEmitter = require('events');

/**
 * Base LLM Service abstract class
 */
class BaseLLMService extends EventEmitter {
  /**
   * Create a new BaseLLMService instance
   * @param {Object} config - Service configuration
   * @param {Object} logger - Logger instance (optional)
   */
  constructor(config = {}, logger = null) {
    super();
    this.config = config;
    this.logger = logger;
    this.isInitialized = false;
  }

  /**
   * Log a message with context
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @private
   */
  log(level, message) {
    if (this.logger && typeof this.logger[level] === 'function') {
      this.logger[level](`[LLMService:${this.constructor.name}] ${message}`);
    } else {
      console.log(`[${level.toUpperCase()}] [LLMService:${this.constructor.name}] ${message}`);
    }
  }

  /**
   * Initialize the LLM service
   * Must be implemented by subclasses
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('initialize method must be implemented by subclass');
  }

  /**
   * Generate text completion
   * Must be implemented by subclasses
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Generated text
   */
  async generate(_prompt, _options = {}) {
    throw new Error('generate method must be implemented by subclass');
  }

  /**
   * Generate streaming text completion
   * Must be implemented by subclasses
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {AsyncGenerator<string>} Streaming text generator
   */
  async *generateStream(_prompt, _options = {}) {
    yield 'generateStream method must be implemented by subclass';
    throw new Error('generateStream method must be implemented by subclass');
  }

  /**
   * Get service status
   * @returns {Object} Service status information
   */
  getStatus() {
    return {
      service: this.constructor.name,
      isInitialized: this.isInitialized,
      config: this.config
    };
  }
}

/**
 * Mock LLM Service for testing and development
 */
class MockLLMService extends BaseLLMService {
  /**
   * Create a new MockLLMService instance
   * @param {Object} config - Service configuration
   * @param {Object} logger - Logger instance (optional)
   */
  constructor(config = {}, logger = null) {
    super(config, logger);
    this.responses = config.responses || {};
    this.delay = config.delay || 100;
  }

  /**
   * Initialize the mock service
   * @returns {Promise<void>}
   */
  async initialize() {
    this.log('info', 'Mock LLM service initialized');
    this.isInitialized = true;
  }

  /**
   * Generate mock text completion
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Mock generated text
   */
  async generate(prompt, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, this.delay));

    // Check for predefined responses
    if (this.responses[prompt]) {
      return this.responses[prompt];
    }

    // Generate mock response based on prompt
    const mockResponse = this.generateMockResponse(prompt, options);
    
    this.log('debug', `Generated mock response for prompt: ${prompt.substring(0, 50)}...`);
    return mockResponse;
  }

  /**
   * Generate mock streaming text completion
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {AsyncGenerator<string>} Streaming text generator
   */
  async *generateStream(prompt, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const response = await this.generate(prompt, options);
    const words = response.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      yield words[i] + (i < words.length - 1 ? ' ' : '');
    }
  }

  /**
   * Generate mock response based on prompt
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {string} Mock response
   * @private
   */
  generateMockResponse(prompt, options) {
    const responses = [
      'This is a mock response generated for testing purposes.',
      'The mock LLM service has processed your request successfully.',
      'Here is a simulated response that mimics real LLM behavior.',
      'Mock response: The system is working correctly in test mode.',
      'Generated mock content based on your input prompt.'
    ];

    // Simple hash-based selection for consistency
    const hash = prompt.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    const selectedResponse = responses[Math.abs(hash) % responses.length];
    
    // Add some context if options specify it
    if (options.maxTokens && options.maxTokens > 50) {
      return selectedResponse + ' This is additional mock content to meet the token requirements. The mock service can generate longer responses when needed for testing purposes.';
    }

    return selectedResponse;
  }

  /**
   * Set mock responses for specific prompts
   * @param {Object} responses - Object mapping prompts to responses
   */
  setMockResponses(responses) {
    this.responses = { ...this.responses, ...responses };
    this.log('debug', `Set ${Object.keys(responses).length} mock responses`);
  }

  /**
   * Clear all mock responses
   */
  clearMockResponses() {
    this.responses = {};
    this.log('debug', 'Cleared all mock responses');
  }
}

/**
 * OpenAI LLM Service implementation
 */
class OpenAILLMService extends BaseLLMService {
  /**
   * Create a new OpenAILLMService instance
   * @param {Object} config - Service configuration
   * @param {Object} logger - Logger instance (optional)
   */
  constructor(config = {}, logger = null) {
    super(config, logger);
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.model = config.model || 'gpt-3.5-turbo';
    this.maxTokens = config.maxTokens || 1000;
    this.temperature = config.temperature || 0.7;
    this.client = null;
  }

  /**
   * Initialize the OpenAI service
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    try {
      // Try to require OpenAI package
      const { OpenAI } = require('openai');
      this.client = new OpenAI({
        apiKey: this.apiKey
      });

      this.log('info', 'OpenAI LLM service initialized');
      this.isInitialized = true;
    } catch (error) {
      this.log('warn', 'OpenAI package not available, falling back to mock service');
      // Fallback to mock service if OpenAI package is not available
      const mockService = new MockLLMService(this.config, this.logger);
      Object.setPrototypeOf(this, Object.getPrototypeOf(mockService));
      Object.assign(this, mockService);
      await this.initialize();
    }
  }

  /**
   * Generate text completion using OpenAI
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Generated text
   */
  async generate(prompt, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.client) {
      // Fallback to mock if client is not available
      return super.generate(prompt, options);
    }

    try {
      const response = await this.client.chat.completions.create({
        model: options.model || this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature,
        ...options
      });

      const generatedText = response.choices[0]?.message?.content || '';
      
      this.log('debug', `Generated response using ${this.model}`);
      return generatedText;
    } catch (error) {
      this.log('error', `OpenAI API error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate streaming text completion using OpenAI
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {AsyncGenerator<string>} Streaming text generator
   */
  async *generateStream(prompt, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.client) {
      // Fallback to mock streaming
      yield* super.generateStream(prompt, options);
      return;
    }

    try {
      const stream = await this.client.chat.completions.create({
        model: options.model || this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature,
        stream: true,
        ...options
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      this.log('error', `OpenAI streaming error: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Create an LLM service instance based on configuration
 * @param {Object} config - Service configuration
 * @param {string} config.provider - Provider type ('openai', 'mock', or 'auto')
 * @param {Object} logger - Logger instance (optional)
 * @returns {BaseLLMService} LLM service instance
 */
function createLLMService(config = {}, logger = null) {
  const provider = config.provider || 'auto';

  switch (provider) {
  case 'openai':
    return new OpenAILLMService(config, logger);
  
  case 'mock':
    return new MockLLMService(config, logger);
  
  case 'auto':
  default:
    // Auto-detect based on available API keys
    if (config.apiKey || process.env.OPENAI_API_KEY) {
      return new OpenAILLMService(config, logger);
    } else {
      return new MockLLMService(config, logger);
    }
  }
}

/**
 * LLM Service Manager for handling multiple services
 */
class LLMServiceManager {
  /**
   * Create a new LLMServiceManager instance
   * @param {Object} logger - Logger instance (optional)
   */
  constructor(logger = null) {
    this.logger = logger;
    this.services = new Map();
    this.defaultService = null;
  }

  /**
   * Add an LLM service
   * @param {string} name - Service name
   * @param {BaseLLMService} service - LLM service instance
   * @param {boolean} isDefault - Whether this is the default service
   */
  addService(name, service, isDefault = false) {
    this.services.set(name, service);
    
    if (isDefault || !this.defaultService) {
      this.defaultService = service;
    }

    if (this.logger) {
      this.logger.info(`Added LLM service: ${name}${isDefault ? ' (default)' : ''}`);
    }
  }

  /**
   * Get an LLM service by name
   * @param {string} name - Service name
   * @returns {BaseLLMService|null} LLM service instance or null if not found
   */
  getService(name) {
    return this.services.get(name) || null;
  }

  /**
   * Get the default LLM service
   * @returns {BaseLLMService|null} Default LLM service instance
   */
  getDefaultService() {
    return this.defaultService;
  }

  /**
   * Generate text using a specific service
   * @param {string} serviceName - Service name (optional, uses default if not provided)
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Generated text
   */
  async generate(serviceName, prompt, options = {}) {
    const service = serviceName ? this.getService(serviceName) : this.getDefaultService();
    
    if (!service) {
      throw new Error(`LLM service not found: ${serviceName || 'default'}`);
    }

    return await service.generate(prompt, options);
  }

  /**
   * Generate streaming text using a specific service
   * @param {string} serviceName - Service name (optional, uses default if not provided)
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {AsyncGenerator<string>} Streaming text generator
   */
  async *generateStream(serviceName, prompt, options = {}) {
    const service = serviceName ? this.getService(serviceName) : this.getDefaultService();
    
    if (!service) {
      throw new Error(`LLM service not found: ${serviceName || 'default'}`);
    }

    yield* service.generateStream(prompt, options);
  }

  /**
   * Get all service names
   * @returns {Array<string>} Array of service names
   */
  getServiceNames() {
    return Array.from(this.services.keys());
  }

  /**
   * Get service status for all services
   * @returns {Object} Status information for all services
   */
  getAllStatus() {
    const status = {};
    
    for (const [name, service] of this.services) {
      status[name] = service.getStatus();
    }
    
    return status;
  }
}

module.exports = {
  BaseLLMService,
  MockLLMService,
  OpenAILLMService,
  LLMServiceManager,
  createLLMService
};
