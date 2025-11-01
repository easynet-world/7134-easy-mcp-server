/**
 * WebSocket Handler
 * Handles WebSocket messages for MCP server
 */

class WebSocketHandler {
  constructor(server, { 
    getLoadedRoutes, 
    toolBuilder, 
    toolExecutor, 
    promptHandler, 
    resourceHandler,
    schemaNormalizer 
  }) {
    this.server = server;
    this.getLoadedRoutes = getLoadedRoutes;
    this.toolBuilder = toolBuilder;
    this.toolExecutor = toolExecutor;
    this.promptHandler = promptHandler;
    this.resourceHandler = resourceHandler;
    this.schemaNormalizer = schemaNormalizer;
  }

  /**
   * Handle WebSocket messages
   */
  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
      case 'list_tools':
        this.handleListTools(ws, data);
        break;
      case 'call_tool':
        this.handleCallTool(ws, data);
        break;
      case 'list_prompts':
        this.handleListPrompts(ws, data);
        break;
      case 'get_prompt':
        this.handleGetPrompt(ws, data);
        break;
      case 'list_resources':
        this.handleListResources(ws, data);
        break;
      case 'read_resource':
        this.handleReadResource(ws, data);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', id: data.id }));
        break;
      default:
        ws.send(JSON.stringify({
          type: 'error',
          id: data.id,
          error: `Unknown message type: ${data.type}`
        }));
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        error: `Invalid JSON: ${error.message}`
      }));
    }
  }

  /**
   * Handle WebSocket tools/list request
   */
  async handleListTools(ws, data) {
    try {
      const routes = this.getLoadedRoutes();
      console.log('🔍 MCP Server: Routes loaded:', routes.length);
      console.log('🔍 MCP Server: Route details:', routes.map(r => ({ method: r.method, path: r.path })));
      
      const tools = await this.toolBuilder.buildToolsList(routes, {
        bridgeReloader: this.server.bridgeReloader,
        warn: this.server.warn.bind(this.server)
      });
      
      ws.send(JSON.stringify({
        type: 'list_tools_response',
        id: data.id,
        tools,
        totalTools: tools.length
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        id: data.id,
        error: `Failed to list tools: ${error.message}`
      }));
    }
  }

  /**
   * Handle WebSocket tools/call request
   */
  async handleCallTool(ws, data) {
    try {
      const { name, arguments: args } = data;
      
      // Parse the tool name to get method and path (format: [full_path]/[http_method])
      const lastSlashIndex = name.lastIndexOf('/');
      const method = name.substring(lastSlashIndex + 1); // Everything after the last slash is the method
      const path = name.substring(0, lastSlashIndex); // Everything before the last slash is the path
      
      console.log('🔍 MCP Server: Tool call request:', { name, method, path });
      
      // Find the route
      const routes = this.getLoadedRoutes();
      console.log('🔍 MCP Server: Available routes:', routes.map(r => ({ method: r.method, path: r.path })));
      
      const route = routes.find(r => 
        r.method.toUpperCase() === method.toUpperCase() && 
        r.path === path
      );
      
      console.log('🔍 MCP Server: Found route:', route);
      
      if (!route) {
        throw new Error(`API endpoint not found: ${method.toUpperCase()} ${path}`);
      }
      
      // Execute the API endpoint
      const result = await this.toolExecutor.executeAPIEndpoint(route, args, {
        schemaNormalizer: this.schemaNormalizer
      });
      
      ws.send(JSON.stringify({
        type: 'call_tool_response',
        id: data.id,
        result
      }));
      
    } catch (error) {
      console.error('❌ MCP Server: Error in handleCallTool:', error.message);
      ws.send(JSON.stringify({
        type: 'error',
        id: data.id,
        error: `Error executing API endpoint: ${error.message}`
      }));
    }
  }

  /**
   * Handle WebSocket prompts/list request
   */
  async handleListPrompts(ws, data) {
    try {
      const staticPrompts = this.promptHandler.getAllPrompts().map(prompt => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments || [],
        source: 'static'
      }));

      let cachedPrompts = [];
      if (this.server.cacheManager) {
        cachedPrompts = await this.server.cacheManager.getPrompts();
      }

      const allPrompts = [...staticPrompts, ...cachedPrompts];

      ws.send(JSON.stringify({
        type: 'list_prompts_response',
        id: data.id,
        prompts: allPrompts,
        total: allPrompts.length
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        id: data.id,
        error: `Failed to list prompts: ${error.message}`
      }));
    }
  }

  /**
   * Handle WebSocket prompts/get request
   */
  async handleGetPrompt(ws, data) {
    try {
      const { name, arguments: args } = data;
      
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
        ws.send(JSON.stringify({
          type: 'error',
          id: data.id,
          error: `Prompt not found: ${name}`
        }));
        return;
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
      
      ws.send(JSON.stringify({
        type: 'get_prompt_response',
        id: data.id,
        prompt: {
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
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        id: data.id,
        error: `Failed to get prompt: ${error.message}`
      }));
    }
  }

  /**
   * Handle WebSocket resources/list request
   */
  async handleListResources(ws, data) {
    try {
      const staticResources = this.resourceHandler.getAllResources().map(resource => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
        source: 'static'
      }));

      let cachedResources = [];
      if (this.server.cacheManager) {
        cachedResources = await this.server.cacheManager.getResources();
      }

      const allResources = [...staticResources, ...cachedResources];

      ws.send(JSON.stringify({
        type: 'list_resources_response',
        id: data.id,
        resources: allResources,
        total: allResources.length
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        id: data.id,
        error: `Failed to list resources: ${error.message}`
      }));
    }
  }

  /**
   * Handle WebSocket resources/read request
   */
  async handleReadResource(ws, data) {
    try {
      const { uri, arguments: args } = data;
      
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
        ws.send(JSON.stringify({
          type: 'error',
          id: data.id,
          error: `Resource not found: ${uri}`
        }));
        return;
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
      
      ws.send(JSON.stringify({
        type: 'read_resource_response',
        id: data.id,
        resource: {
          uri: resource.uri,
          mimeType: resource.mimeType,
          contents: [
            {
              uri: resource.uri,
              mimeType: resource.mimeType,
              text: processedContent
            }
          ]
        }
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        id: data.id,
        error: `Failed to read resource: ${error.message}`
      }));
    }
  }
}

module.exports = WebSocketHandler;

