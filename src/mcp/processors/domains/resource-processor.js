/**
 * Resource Processor
 * Handles processing of MCP resource-related requests (resources/list, resources/read, resources/templates/list)
 */

class ResourceProcessor {
  constructor(server, { resourceHandler, trackRequest }) {
    this.server = server;
    this.resourceHandler = resourceHandler;
    this.trackRequest = trackRequest;
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
}

module.exports = ResourceProcessor;

