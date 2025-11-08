/**
 * MCP Notification Manager
 * 
 * Handles broadcasting notifications to all connected clients
 * across different transport types (STDIO, WebSocket, HTTP/SSE)
 */

class MCPNotificationManager {
  constructor(server) {
    this.server = server;
  }

  /**
   * Broadcast notification to all connected clients
   */
  broadcast(notification) {
    // Notify STDIO client (if in STDIO mode)
    if (this.server.stdioMode && this.server.stdioHandler) {
      this.server.stdioHandler.sendNotification(notification);
    }
    
    // Notify WebSocket clients
    if (this.server.clients) {
      this.server.clients.forEach(client => {
        if (client.readyState === require('ws').OPEN) {
          client.send(JSON.stringify(notification));
        }
      });
    }

    // Notify HTTP clients
    if (this.server.httpClients) {
      this.server.httpClients.forEach((res, clientId) => {
        try {
          res.write(`data: ${JSON.stringify(notification)}\n\n`);
        } catch (error) {
          // Remove disconnected clients
          this.server.httpClients.delete(clientId);
        }
      });
    }
  }

  /**
   * Notify clients about prompts changes
   */
  async notifyPromptsChanged() {
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/promptsChanged',
      params: {
        prompts: []
      }
    };

    try {
      const staticPrompts = Array.from(this.server.prompts.values()).map(prompt => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments || [],
        source: 'static'
      }));
      
      let cachedPrompts = [];
      if (this.server.cacheManager) {
        cachedPrompts = await this.server.cacheManager.getPrompts();
      }
      
      notification.params.prompts = [...staticPrompts, ...cachedPrompts];
    } catch (e) {
      // Fallback to static only
      notification.params.prompts = Array.from(this.server.prompts.values()).map(prompt => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments || [],
        source: 'static'
      }));
    }
    
    this.broadcast(notification);
  }

  /**
   * Notify clients about resources changes
   */
  async notifyResourcesChanged() {
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/resourcesChanged',
      params: {
        resources: []
      }
    };

    try {
      const staticResources = Array.from(this.server.resources.values()).map(resource => ({
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
      
      notification.params.resources = [...staticResources, ...cachedResources];
    } catch (e) {
      // Fallback to static only
      notification.params.resources = Array.from(this.server.resources.values()).map(resource => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
        source: 'static'
      }));
    }
    
    this.broadcast(notification);
  }

  /**
   * Notify clients about route/tools changes
   */
  async notifyRouteChanges() {
    const tools = await this.server.buildMergedToolsList();
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/toolsChanged',
      params: { tools }
    };
    this.broadcast(notification);
  }
}

module.exports = MCPNotificationManager;

