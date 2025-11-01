/**
 * Prompt Processor
 * Handles processing of MCP prompt-related requests (prompts/list, prompts/get)
 */

class PromptProcessor {
  constructor(server, { promptHandler, trackRequest }) {
    this.server = server;
    this.promptHandler = promptHandler;
    this.trackRequest = trackRequest;
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
}

module.exports = PromptProcessor;

