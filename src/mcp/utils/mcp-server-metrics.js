/**
 * MCP Server Metrics and Logging
 * 
 * Handles metrics collection, logging, and error handling for MCP server
 */

class MCPServerMetrics {
  constructor(options = {}) {
    this.quiet = options.quiet || false;
    
    // Enhanced performance monitoring and metrics
    this.metrics = {
      startTime: Date.now(),
      requestCount: 0,
      errorCount: 0,
      toolCalls: 0,
      promptRequests: 0,
      resourceRequests: 0,
      bridgeRequests: 0,
      averageResponseTime: 0,
      responseTimes: [],
      errorTypes: new Map(),
      lastActivity: Date.now()
    };
    
    // Enhanced error handling configuration
    this.errorHandling = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      enableDetailedErrors: options.enableDetailedErrors !== false,
      logLevel: options.logLevel || 'info'
    };
  }

  /**
   * Enhanced logging methods with structured logging
   */
  log(level, message, data = {}) {
    if (!this.quiet && this.shouldLog(level)) {
      const timestamp = new Date().toISOString();
      
      if (level === 'error') {
        console.error(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data);
      } else if (level === 'warn') {
        console.warn(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data);
      } else {
        console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data);
      }
    }
  }

  warn(message, data = {}) {
    this.log('warn', message, data);
  }

  error(message, data = {}) {
    this.log('error', message, data);
    this.metrics.errorCount++;
  }

  info(message, data = {}) {
    this.log('info', message, data);
  }

  debug(message, data = {}) {
    this.log('debug', message, data);
  }

  /**
   * Helper method to determine if we should log at this level
   */
  shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.errorHandling.logLevel];
  }

  /**
   * Performance tracking methods
   */
  trackRequest(type, startTime, success = true, errorType = null) {
    const responseTime = Date.now() - startTime;
    this.metrics.requestCount++;
    this.metrics.lastActivity = Date.now();
    
    if (success) {
      // Map type to specific metric counters
      if (type === 'tool') {
        this.metrics.toolCalls++;
      } else if (type === 'prompt') {
        this.metrics.promptRequests++;
      } else if (type === 'resource') {
        this.metrics.resourceRequests++;
      } else if (type === 'bridge') {
        this.metrics.bridgeRequests++;
      } else {
        // Generic counter for other types
        this.metrics[`${type}Requests`] = (this.metrics[`${type}Requests`] || 0) + 1;
      }
    } else {
      this.metrics.errorCount++;
      if (errorType) {
        this.metrics.errorTypes.set(errorType, (this.metrics.errorTypes.get(errorType) || 0) + 1);
      }
    }
    
    // Track response times (keep last 100)
    this.metrics.responseTimes.push(responseTime);
    if (this.metrics.responseTimes.length > 100) {
      this.metrics.responseTimes.shift();
    }
    
    // Calculate average response time
    this.metrics.averageResponseTime = this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length;
  }

  /**
   * Enhanced error handling method
   */
  handleError(error, context = {}) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      server: 'mcp-server'
    };
    
    this.error('MCP Server Error', errorInfo);
    
    // Return structured error response
    return {
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: this.errorHandling.enableDetailedErrors ? error.message : 'Internal Server Error',
        data: this.errorHandling.enableDetailedErrors ? errorInfo : undefined
      }
    };
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Get error handling configuration
   */
  getErrorHandling() {
    return { ...this.errorHandling };
  }
}

module.exports = MCPServerMetrics;

