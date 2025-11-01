/**
 * System Processor
 * Handles processing of MCP system-related requests (cache/stats, cache/clear, health, metrics, ping)
 */

class SystemProcessor {
  constructor(server, { getLoadedRoutes, trackRequest, handleError }) {
    this.server = server;
    this.getLoadedRoutes = getLoadedRoutes;
    this.trackRequest = trackRequest;
    this.handleError = handleError;
  }

  /**
   * Process ping request
   */
  async processPing(data) {
    return { 
      jsonrpc: '2.0', 
      id: data.id, 
      result: { type: 'pong' } 
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

module.exports = SystemProcessor;

