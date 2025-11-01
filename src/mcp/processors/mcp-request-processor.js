/**
 * MCP Request Processor
 * Handles routing and processing of MCP requests
 */

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
    this.toolBuilder = toolBuilder;
    this.toolExecutor = toolExecutor;
    this.promptHandler = promptHandler;
    this.resourceHandler = resourceHandler;
    this.schemaNormalizer = schemaNormalizer;
    this.getLoadedRoutes = getLoadedRoutes;
    this.trackRequest = trackRequest;
    this.handleError = handleError;
  }

  /**
   * Process MCP requests
   */
  async processMCPRequest(data) {
    const startTime = Date.now();
    
    try {
      let result;
      
      if (data.method === 'tools/list') {
        result = await this.processListTools(data);
        this.trackRequest('tool', startTime, true);
      } else if (data.method === 'tools/call') {
        result = await this.processCallTool(data);
        this.trackRequest('tool', startTime, true);
      } else if (data.method === 'prompts/list') {
        result = await this.processListPrompts(data);
        this.trackRequest('prompt', startTime, true);
      } else if (data.method === 'prompts/get') {
        result = await this.processGetPrompt(data);
        this.trackRequest('prompt', startTime, true);
      } else if (data.method === 'resources/list') {
        result = await this.processListResources(data);
        this.trackRequest('resource', startTime, true);
      } else if (data.method === 'resources/read') {
        result = await this.processReadResource(data);
        this.trackRequest('resource', startTime, true);
      } else if (data.method === 'resources/templates/list') {
        result = await this.processListResourceTemplates(data);
        this.trackRequest('resource', startTime, true);
      } else if (data.method === 'ping') {
        result = { 
          jsonrpc: '2.0', 
          id: data.id, 
          result: { type: 'pong' } 
        };
        this.trackRequest('ping', startTime, true);
      } else if (data.method === 'cache/stats') {
        result = await this.processCacheStats(data);
        this.trackRequest('cache', startTime, true);
      } else if (data.method === 'cache/clear') {
        result = await this.processCacheClear(data);
        this.trackRequest('cache', startTime, true);
      } else if (data.method === 'health') {
        result = await this.processHealth(data);
        this.trackRequest('health', startTime, true);
      } else if (data.method === 'metrics') {
        result = await this.processMetrics(data);
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

  /**
   * Process tools/list request
   */
  async processListTools(data) {
    const routes = this.getLoadedRoutes();
    this.server.debug('MCP HTTP: Routes loaded', { count: routes.length });
    
    const tools = await this.toolBuilder.buildToolsList(routes, {
      bridgeReloader: this.server.bridgeReloader,
      warn: this.server.warn.bind(this.server)
    });

    return {
      jsonrpc: '2.0',
      id: data.id,
      result: {
        tools
      }
    };
  }

  /**
   * Process tools/call request
   */
  async processCallTool(data) {
    const { name, arguments: args } = data.params || data;
    
    try {
      const result = await this.toolExecutor.executeTool(name, args, {
        getLoadedRoutes: this.getLoadedRoutes,
        bridgeReloader: this.server.bridgeReloader,
        executeAPIEndpoint: (route, args) => this.toolExecutor.executeAPIEndpoint(route, args, {
          schemaNormalizer: this.schemaNormalizer
        })
      });
      
      return {
        jsonrpc: '2.0',
        id: data.id,
        result
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: data.id,
        error: {
          code: -32602,
          message: error.message || `Tool not found: ${name}`
        }
      };
    }
  }

  /**
   * Process prompts/list request
   */
  async processListPrompts(data) {
    try {
      // Get static prompts from memory
      const staticPrompts = this.promptHandler.getAllPrompts().map(prompt => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments || [],
        source: 'static'
      }));

      // Get cached prompts (with hot swapping)
      const cachedPrompts = await this.server.cacheManager.getPrompts();

      // Combine static and cached prompts
      const allPrompts = [...staticPrompts, ...cachedPrompts];
      
      return {
        jsonrpc: '2.0',
        id: data.id,
        result: {
          prompts: allPrompts,
          total: allPrompts.length,
          static: staticPrompts.length,
          cached: cachedPrompts.length,
          cacheStats: this.server.cacheManager.getCacheStats().prompts
        }
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: data.id,
        error: {
          code: -32603,
          message: `Failed to list prompts: ${error.message}`
        }
      };
    }
  }

  /**
   * Process prompts/get request
   */
  async processGetPrompt(data) {
    const { name, arguments: args } = data.params || data;
    let prompt = null;
    
    // Try to get from cache first (if available)
    if (this.server.cacheManager) {
      try {
        const cachedPrompts = await this.server.cacheManager.getPrompts();
        prompt = cachedPrompts.find(p => p.name === name);
      } catch (error) {
        console.warn('⚠️  MCP Server: Failed to get cached prompts:', error.message);
      }
    }
    
    // If not found in cache, try static prompts
    if (!prompt) {
      prompt = this.promptHandler.getPrompt(name);
    }
    
    if (!prompt) {
      return {
        jsonrpc: '2.0',
        id: data.id,
        error: {
          code: -32602,
          message: `Prompt not found: ${name}`
        }
      };
    }
    
    // Process template with arguments if provided
    let processedTemplate = prompt.template || prompt.content || '';
    if (args && prompt.arguments && processedTemplate) {
      prompt.arguments.forEach(arg => {
        if (args[arg.name] !== undefined) {
          const placeholder = new RegExp(`{{${arg.name}}}`, 'g');
          processedTemplate = processedTemplate.replace(placeholder, args[arg.name]);
        }
      });
    }
    
    return {
      jsonrpc: '2.0',
      id: data.id,
      result: {
        description: prompt.description,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: processedTemplate
            }
          }
        ]
      }
    };
  }

  /**
   * Process resources/list request
   */
  async processListResources(data) {
    try {
      // Get static resources from memory
      const staticResources = this.resourceHandler.getAllResources().map(resource => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
        source: 'static'
      }));

      // Get cached resources (with hot swapping)
      const cachedResources = await this.server.cacheManager.getResources();

      // Combine static and cached resources
      const allResources = [...staticResources, ...cachedResources];
      
      return {
        jsonrpc: '2.0',
        id: data.id,
        result: {
          resources: allResources,
          total: allResources.length,
          static: staticResources.length,
          cached: cachedResources.length,
          cacheStats: this.server.cacheManager.getCacheStats().resources
        }
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: data.id,
        error: {
          code: -32603,
          message: `Failed to list resources: ${error.message}`
        }
      };
    }
  }

  /**
   * Process resources/templates/list request
   */
  async processListResourceTemplates(data) {
    try {
      // Get all resources that have template parameters
      const allResources = this.resourceHandler.getAllResources();
      const templateResources = allResources.filter(resource => resource.hasParameters);
      
      return {
        jsonrpc: '2.0',
        id: data.id,
        result: {
          resourceTemplates: templateResources.map(resource => ({
            uri: resource.uri,
            uriTemplate: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType,
            parameters: resource.parameters,
            parameterCount: resource.parameterCount,
            isTemplate: resource.isTemplate
          })),
          total: templateResources.length
        }
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: data.id,
        error: {
          code: -32603,
          message: `Failed to list resource templates: ${error.message}`
        }
      };
    }
  }

  /**
   * Process resources/read request
   */
  async processReadResource(data) {
    const { uri, arguments: args } = data.params || data;
    let resource = null;
    
    // Try to get from cache first (if available)
    if (this.server.cacheManager) {
      try {
        const cachedResources = await this.server.cacheManager.getResources();
        resource = cachedResources.find(r => r.uri === uri);
      } catch (error) {
        console.warn('⚠️  MCP Server: Failed to get cached resources:', error.message);
      }
    }
    
    // If not found in cache, try static resources
    if (!resource) {
      resource = this.resourceHandler.getResource(uri);
    }
    
    if (!resource) {
      return {
        jsonrpc: '2.0',
        id: data.id,
        error: {
          code: -32602,
          message: `Resource not found: ${uri}`
        }
      };
    }
    
    // Process template with arguments if provided
    let processedContent = resource.content || resource.template || '';
    if (args && resource.hasParameters && this.server.config.mcp.resources.enableTemplates && processedContent) {
      resource.parameters.forEach(param => {
        if (args[param] !== undefined) {
          const placeholder = new RegExp(`{{${param}}}`, 'g');
          processedContent = processedContent.replace(placeholder, args[param]);
        }
      });
    }
    
    return {
      jsonrpc: '2.0',
      id: data.id,
      result: {
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: processedContent
          }
        ],
        // Add template metadata if available
        ...(resource.hasParameters && {
          template: {
            hasParameters: resource.hasParameters,
            parameters: resource.parameters,
            parameterCount: resource.parameterCount
          }
        })
      }
    };
  }

  /**
   * Process cache/stats request
   */
  async processCacheStats(data) {
    try {
      const stats = this.server.cacheManager.getCacheStats();
      
      return {
        jsonrpc: '2.0',
        id: data.id,
        result: {
          cache: stats,
          server: {
            staticPrompts: this.server.prompts.size,
            staticResources: this.server.resources.size,
            uptime: process.uptime()
          }
        }
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: data.id,
        error: {
          code: -32603,
          message: `Failed to get cache stats: ${error.message}`
        }
      };
    }
  }

  /**
   * Process cache/clear request
   */
  async processCacheClear(data) {
    try {
      const { type = 'all' } = data.params || {};
      
      this.server.cacheManager.clearCache(type);
      
      return {
        jsonrpc: '2.0',
        id: data.id,
        result: {
          success: true,
          message: `Cache cleared: ${type}`,
          cleared: type
        }
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: data.id,
        error: {
          code: -32603,
          message: `Failed to clear cache: ${error.message}`
        }
      };
    }
  }

  /**
   * Process health check request
   */
  async processHealth(data) {
    const startTime = Date.now();
    
    try {
      const uptime = Date.now() - this.server.metrics.startTime;
      const routes = this.getLoadedRoutes();
      const isHealthy = this.server.metrics.errorCount < this.server.metrics.requestCount * 0.1; // Less than 10% error rate
      
      const health = {
        status: isHealthy ? 'healthy' : 'degraded',
        uptime,
        server: {
          host: this.server.host,
          port: this.server.port,
          clients: this.server.clients.size,
          httpClients: this.server.httpClients.size
        },
        metrics: {
          totalRequests: this.server.metrics.requestCount,
          errorRate: this.server.metrics.requestCount > 0 ? (this.server.metrics.errorCount / this.server.metrics.requestCount) * 100 : 0,
          averageResponseTime: this.server.metrics.averageResponseTime,
          lastActivity: new Date(this.server.metrics.lastActivity).toISOString()
        },
        resources: {
          prompts: this.server.prompts.size,
          resources: this.server.resources.size,
          routes: routes.length
        },
        cache: this.server.cacheManager ? await this.server.cacheManager.getCacheStats() : null
      };
      
      this.trackRequest('health', startTime, true);
      
      return {
        jsonrpc: '2.0',
        id: data.id,
        result: health
      };
    } catch (error) {
      this.trackRequest('health', startTime, false, 'health_check_error');
      return this.handleError(error, { method: 'health' });
    }
  }

  /**
   * Process metrics request
   */
  async processMetrics(data) {
    const startTime = Date.now();
    
    try {
      const uptime = Date.now() - this.server.metrics.startTime;
      const routes = this.getLoadedRoutes();
      
      const metrics = {
        server: {
          uptime,
          startTime: new Date(this.server.metrics.startTime).toISOString(),
          lastActivity: new Date(this.server.metrics.lastActivity).toISOString(),
          host: this.server.host,
          port: this.server.port
        },
        performance: {
          totalRequests: this.server.metrics.requestCount,
          averageResponseTime: this.server.metrics.averageResponseTime,
          responseTimes: {
            min: Math.min(...this.server.metrics.responseTimes),
            max: Math.max(...this.server.metrics.responseTimes),
            avg: this.server.metrics.averageResponseTime,
            count: this.server.metrics.responseTimes.length
          }
        },
        requests: {
          toolCalls: this.server.metrics.toolCalls,
          promptRequests: this.server.metrics.promptRequests,
          resourceRequests: this.server.metrics.resourceRequests,
          bridgeRequests: this.server.metrics.bridgeRequests
        },
        errors: {
          total: this.server.metrics.errorCount,
          errorRate: this.server.metrics.requestCount > 0 ? (this.server.metrics.errorCount / this.server.metrics.requestCount) * 100 : 0,
          types: Object.fromEntries(this.server.metrics.errorTypes)
        },
        resources: {
          prompts: this.server.prompts.size,
          resources: this.server.resources.size,
          routes: routes.length,
          clients: this.server.clients.size,
          httpClients: this.server.httpClients.size
        },
        cache: this.server.cacheManager ? await this.server.cacheManager.getCacheStats() : null
      };
      
      this.trackRequest('metrics', startTime, true);
      
      return {
        jsonrpc: '2.0',
        id: data.id,
        result: metrics
      };
    } catch (error) {
      this.trackRequest('metrics', startTime, false, 'metrics_error');
      return this.handleError(error, { method: 'metrics' });
    }
  }
}

module.exports = MCPRequestProcessor;

