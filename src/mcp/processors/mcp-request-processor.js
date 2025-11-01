/**
 * MCP Request Processor
 * 
 * Main router that handles MCP protocol request routing and delegates
 * to domain-specific processors based on the request method.
 * 
 * Responsibilities:
 * - Routes JSON-RPC 2.0 requests to appropriate domain processors
 * - Coordinates between handlers, builders, and executors
 * - Formats JSON-RPC 2.0 responses
 * - Error handling and response formatting
 * 
 * Domain Processors:
 * - ToolProcessor: tools/list, tools/call
 * - PromptProcessor: prompts/list, prompts/get
 * - ResourceProcessor: resources/list, resources/read, resources/templates/list
 * - SystemProcessor: cache/stats, cache/clear, health, metrics, ping
 * 
 * Request Flow:
 * 1. Receive JSON-RPC 2.0 request
 * 2. Route by method to domain processor
 * 3. Domain processor coordinates business logic
 * 4. Format and return JSON-RPC 2.0 response
 * 
 * @class MCPRequestProcessor
 */

const ToolProcessor = require('./domains/tool-processor');
const PromptProcessor = require('./domains/prompt-processor');
const ResourceProcessor = require('./domains/resource-processor');
const SystemProcessor = require('./domains/system-processor');

class MCPRequestProcessor {
  constructor(server, {
    toolBuilder,
    toolExecutor,
    promptHandler,
    resourceHandler,
    schemaNormalizer,
    getLoadedRoutes,
    trackRequest,
    handleError
  }) {
    this.server = server;
    
    // Initialize domain processors
    this.toolProcessor = new ToolProcessor(server, {
      toolBuilder,
      toolExecutor,
      schemaNormalizer,
      getLoadedRoutes,
      trackRequest
    });
    
    this.promptProcessor = new PromptProcessor(server, {
      promptHandler,
      trackRequest
    });
    
    this.resourceProcessor = new ResourceProcessor(server, {
      resourceHandler,
      trackRequest
    });
    
    this.systemProcessor = new SystemProcessor(server, {
      getLoadedRoutes,
      trackRequest,
      handleError
    });
    
    this.trackRequest = trackRequest;
    this.handleError = handleError;
  }

  /**
   * Process MCP requests - main routing logic
   */
  async processMCPRequest(data) {
    const startTime = Date.now();
    
    try {
      let result;
      
      // Route to appropriate domain processor
      if (data.method === 'tools/list') {
        result = await this.toolProcessor.processListTools(data);
        this.trackRequest('tool', startTime, true);
      } else if (data.method === 'tools/call') {
        result = await this.toolProcessor.processCallTool(data);
        this.trackRequest('tool', startTime, true);
      } else if (data.method === 'prompts/list') {
        result = await this.promptProcessor.processListPrompts(data);
        this.trackRequest('prompt', startTime, true);
      } else if (data.method === 'prompts/get') {
        result = await this.promptProcessor.processGetPrompt(data);
        this.trackRequest('prompt', startTime, true);
      } else if (data.method === 'resources/list') {
        result = await this.resourceProcessor.processListResources(data);
        this.trackRequest('resource', startTime, true);
      } else if (data.method === 'resources/read') {
        result = await this.resourceProcessor.processReadResource(data);
        this.trackRequest('resource', startTime, true);
      } else if (data.method === 'resources/templates/list') {
        result = await this.resourceProcessor.processListResourceTemplates(data);
        this.trackRequest('resource', startTime, true);
      } else if (data.method === 'ping') {
        result = await this.systemProcessor.processPing(data);
        this.trackRequest('ping', startTime, true);
      } else if (data.method === 'cache/stats') {
        result = await this.systemProcessor.processCacheStats(data);
        this.trackRequest('cache', startTime, true);
      } else if (data.method === 'cache/clear') {
        result = await this.systemProcessor.processCacheClear(data);
        this.trackRequest('cache', startTime, true);
      } else if (data.method === 'health') {
        result = await this.systemProcessor.processHealth(data);
        this.trackRequest('health', startTime, true);
      } else if (data.method === 'metrics') {
        result = await this.systemProcessor.processMetrics(data);
        this.trackRequest('metrics', startTime, true);
      } else {
        this.trackRequest('unknown', startTime, false, 'method_not_found');
        return { 
          jsonrpc: '2.0', 
          id: data.id, 
          error: { 
            code: -32601, 
            message: `Method not found: ${data.method}` 
          } 
        };
      }
      
      return result;
    } catch (error) {
      this.trackRequest('error', startTime, false, 'internal_error');
      return this.handleError(error, { method: data.method, id: data.id });
    }
  }
}

module.exports = MCPRequestProcessor;
