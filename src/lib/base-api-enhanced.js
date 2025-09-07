/**
 * BaseAPIEnhanced - Enhanced Base API Class
 * 
 * Enhanced version of BaseAPI with:
 * - MCP resource and prompt management
 * - Standardized response handling
 * - Service initialization utilities
 * - LLM service integration
 * 
 * @author EasyNet World
 * @version 1.0.0
 */

const BaseAPI = require('../core/base-api');
const APIResponseUtils = require('./api-response-utils');
const Logger = require('../utils/logger');
const MCPResourceLoader = require('../utils/resource-loader');
const { createLLMService } = require('./llm-service');

class BaseAPIEnhanced extends BaseAPI {
  /**
   * Create a new BaseAPIEnhanced instance
   * @param {string} serviceName - Name of the service
   * @param {Object} options - Configuration options
   * @param {Object} options.logger - Logger configuration
   * @param {Object} options.llm - LLM service configuration
   * @param {string} options.resourcePath - Path to MCP resources
   */
  constructor(serviceName, options = {}) {
    super();
    
    this.serviceName = serviceName;
    this.options = options;
    
    // Initialize components
    this.logger = null;
    this.llm = null;
    this.resourceLoader = null;
    this.responseUtils = APIResponseUtils;
    
    // MCP resources and prompts
    this.prompts = [];
    this.resources = [];
    
    // Service state
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  /**
   * Initialize the enhanced API service
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization();
    await this.initializationPromise;
  }

  /**
   * Perform the actual initialization
   * @returns {Promise<void>}
   * @private
   */
  async _performInitialization() {
    try {
      // Initialize logger first
      await this._initializeLogger();
      
      // Initialize LLM service
      await this._initializeLLM();
      
      // Initialize resource loader
      await this._initializeResourceLoader();
      
      // Setup MCP resources and prompts
      await this.setupMCPResources();
      
      this.isInitialized = true;
      this.logger.info(`Enhanced API service initialized: ${this.serviceName}`);
    } catch (error) {
      this.logger?.error(`Failed to initialize enhanced API service: ${error.message}`);
      throw error;
    }
  }

  /**
   * Initialize logger
   * @private
   */
  async _initializeLogger() {
    const loggerOptions = {
      service: this.serviceName,
      ...this.options.logger
    };
    
    this.logger = new Logger(loggerOptions);
    this.logger.info(`Logger initialized for service: ${this.serviceName}`);
  }


  /**
   * Initialize LLM service
   * @private
   */
  async _initializeLLM() {
    if (this.options.llm !== false) {
      const llmOptions = {
        serviceName: this.serviceName,
        ...this.options.llm
      };
      
      this.llm = createLLMService(llmOptions, this.logger);
      await this.llm.initialize();
      this.logger.info('LLM service initialized');
    }
  }

  /**
   * Initialize resource loader
   * @private
   */
  async _initializeResourceLoader() {
    const resourcePath = this.options.resourcePath || './src';
    this.resourceLoader = new MCPResourceLoader(resourcePath, this.logger);
    this.logger.info('Resource loader initialized');
  }


  /**
   * Setup MCP resources and prompts
   * Override this method in subclasses to define custom resources
   * @returns {Promise<void>}
   */
  async setupMCPResources() {
    try {
      // Load default resources and prompts
      const defaults = await this.resourceLoader.loadDefaults();
      this.resources = defaults.resources;
      this.prompts = defaults.prompts;
      
      this.logger.info(`Loaded ${this.resources.length} resources and ${this.prompts.length} prompts`);
    } catch (error) {
      this.logger.warn(`Failed to load default MCP resources: ${error.message}`);
    }
  }

  /**
   * Process the request and generate response
   * Enhanced version with automatic initialization and error handling
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async process(req, res) {
    try {
      // Ensure service is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Log request
      this.logger?.logRequest(req);

      // Process the request
      const result = await this.handleRequest(req, res);

      // Log response
      this.logger?.logResponse(res);

      return result;
    } catch (error) {
      this.logger?.error(`Request processing error: ${error.message}`, {
        error: error.stack,
        url: req.url,
        method: req.method
      });

      return this.responseUtils.sendInternalErrorResponse(res, error.message);
    }
  }

  /**
   * Handle the actual request
   * Must be implemented by subclasses
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<any>} Response
   */
  async handleRequest(_req, _res) {
    throw new Error('handleRequest method must be implemented by subclass');
  }

  /**
   * Validate request body against schema
   * @param {Object} body - Request body
   * @param {Object} schema - Validation schema
   * @returns {Object} Validation result
   */
  validateRequestBody(body, schema) {
    return this.responseUtils.validateRequestBody(body, schema);
  }

  /**
   * Send success response
   * @param {Object} res - Express response object
   * @param {Object} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code
   */
  sendSuccessResponse(res, data, message, statusCode) {
    return this.responseUtils.sendSuccessResponse(res, data, message, statusCode);
  }

  /**
   * Send error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {Object} details - Error details
   */
  sendErrorResponse(res, message, statusCode, details) {
    return this.responseUtils.sendErrorResponse(res, message, statusCode, details);
  }

  /**
   * Send validation error response
   * @param {Object} res - Express response object
   * @param {Array|Object} errors - Validation errors
   * @param {string} message - Error message
   */
  sendValidationErrorResponse(res, errors, message) {
    return this.responseUtils.sendValidationErrorResponse(res, errors, message);
  }


  /**
   * Generate text using LLM service
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Generated text
   */
  async generateText(prompt, options = {}) {
    if (!this.llm) {
      throw new Error('LLM service not available');
    }

    const startTime = Date.now();
    try {
      const result = await this.llm.generate(prompt, options);
      const duration = Date.now() - startTime;
      
      this.logger?.logMCPCall('llm.generate', { prompt: prompt.substring(0, 100) + '...' }, result, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger?.logMCPCall('llm.generate', { prompt: prompt.substring(0, 100) + '...' }, error, duration);
      throw error;
    }
  }

  /**
   * Generate streaming text using LLM service
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {AsyncGenerator<string>} Streaming text generator
   */
  async *generateStreamingText(prompt, options = {}) {
    if (!this.llm) {
      throw new Error('LLM service not available');
    }

    const startTime = Date.now();
    try {
      let fullResponse = '';
      for await (const chunk of this.llm.generateStream(prompt, options)) {
        fullResponse += chunk;
        yield chunk;
      }
      
      const duration = Date.now() - startTime;
      this.logger?.logMCPCall('llm.generateStream', { prompt: prompt.substring(0, 100) + '...' }, fullResponse, duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger?.logMCPCall('llm.generateStream', { prompt: prompt.substring(0, 100) + '...' }, error, duration);
      throw error;
    }
  }


  /**
   * Get MCP resource by URI
   * @param {string} uri - Resource URI
   * @returns {Object|null} Resource object or null
   */
  getMCPResource(uri) {
    return this.resourceLoader?.getResource(uri) || null;
  }

  /**
   * Get MCP prompt by name
   * @param {string} name - Prompt name
   * @returns {Object|null} Prompt object or null
   */
  getMCPPrompt(name) {
    return this.resourceLoader?.getPrompt(name) || null;
  }

  /**
   * Create a markdown resource
   * @param {string} uri - Resource URI
   * @param {string} name - Resource name
   * @param {string} description - Resource description
   * @param {string} content - Markdown content
   * @returns {Object} MCP resource object
   */
  createMarkdownResource(uri, name, description, content) {
    return this.resourceLoader?.createMarkdownResource(uri, name, description, content);
  }

  /**
   * Create a JSON resource
   * @param {string} uri - Resource URI
   * @param {string} name - Resource name
   * @param {string} description - Resource description
   * @param {Object} data - JSON data
   * @returns {Object} MCP resource object
   */
  createJSONResource(uri, name, description, data) {
    return this.resourceLoader?.createJSONResource(uri, name, description, data);
  }

  /**
   * Create a prompt
   * @param {string} name - Prompt name
   * @param {string} description - Prompt description
   * @param {string} instructions - Prompt instructions
   * @param {Object} args - Prompt arguments schema
   * @returns {Object} MCP prompt object
   */
  createPrompt(name, description, instructions, args) {
    return this.resourceLoader?.createPrompt(name, description, instructions, args);
  }

  /**
   * Get service status
   * @returns {Object} Service status information
   */
  getServiceStatus() {
    return {
      serviceName: this.serviceName,
      isInitialized: this.isInitialized,
      components: {
        logger: !!this.logger,
        llm: this.llm?.getStatus() || null,
        resourceLoader: this.resourceLoader?.getStats() || null
      },
      resources: {
        prompts: this.prompts.length,
        resources: this.resources.length
      }
    };
  }

  /**
   * Health check endpoint
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} Health check response
   */
  async healthCheck(req, res) {
    const status = this.getServiceStatus();
    const isHealthy = status.isInitialized && 
                     status.components.logger;

    return this.sendSuccessResponse(res, status, 
      isHealthy ? 'Service is healthy' : 'Service has issues', 
      isHealthy ? 200 : 503);
  }

  /**
   * Get service metrics
   * @returns {Object} Service metrics
   */
  getMetrics() {
    return {
      serviceName: this.serviceName,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      components: {
        llm: this.llm?.getStatus() || null,
        resourceLoader: this.resourceLoader?.getStats() || null
      }
    };
  }

  /**
   * Cleanup resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      
      this.logger?.info(`Service cleanup completed: ${this.serviceName}`);
    } catch (error) {
      this.logger?.error(`Service cleanup error: ${error.message}`);
    }
  }
}

module.exports = BaseAPIEnhanced;
