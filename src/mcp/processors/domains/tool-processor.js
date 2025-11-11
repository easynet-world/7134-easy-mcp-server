/**
 * Tool Processor
 * Handles processing of MCP tool-related requests (tools/list, tools/call)
 */

class ToolProcessor {
  constructor(server, { toolBuilder, toolExecutor, schemaNormalizer, getLoadedRoutes, trackRequest }) {
    this.server = server;
    this.toolBuilder = toolBuilder;
    this.toolExecutor = toolExecutor;
    this.schemaNormalizer = schemaNormalizer;
    this.getLoadedRoutes = getLoadedRoutes;
    this.trackRequest = trackRequest;
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
        tools: tools
      }
    };
  }

  /**
   * Process tools/call request
   * Returns result with content array as per MCP specification
   */
  async processCallTool(data) {
    const { name, arguments: args } = data.params || data;

    try {
      // Get tools list to access _bridgeToolName metadata
      const getToolsList = async () => {
        const routes = this.getLoadedRoutes();
        return await this.toolBuilder.buildToolsList(routes, {
          bridgeReloader: this.server.bridgeReloader,
          warn: this.server.warn.bind(this.server)
        });
      };
      
      // Execute tool and get result with content array
      const result = await this.toolExecutor.executeTool(name, args, {
        getLoadedRoutes: this.getLoadedRoutes,
        bridgeReloader: this.server.bridgeReloader,
        executeAPIEndpoint: (route, args) => this.toolExecutor.executeAPIEndpoint(route, args, {
          schemaNormalizer: this.schemaNormalizer
        }),
        getToolsList: getToolsList
      });

      // Ensure result has content array (MCP requirement)
      // MCP spec requires: { content: [...] }
      if (!result.content || !Array.isArray(result.content)) {
        throw new Error('Tool execution must return content array');
      }

      return {
        jsonrpc: '2.0',
        id: data.id,
        result: result
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
}

module.exports = ToolProcessor;

