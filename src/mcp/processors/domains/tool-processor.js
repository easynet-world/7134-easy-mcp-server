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
}

module.exports = ToolProcessor;

