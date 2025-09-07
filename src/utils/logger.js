/**
 * Logger - Structured Logging Utility
 * 
 * Provides structured logging functionality with:
 * - JSON and text log formatting
 * - Context-aware logging
 * - Request/response logging
 * - Cache operation logging
 * - MCP call logging
 * 
 * @author EasyNet World
 * @version 1.0.0
 */

const EventEmitter = require('events');

class Logger extends EventEmitter {
  /**
   * Create a new Logger instance
   * @param {Object} options - Logger configuration options
   * @param {string} options.level - Log level (debug, info, warn, error) (default: 'info')
   * @param {string} options.format - Log format ('json' or 'text') (default: 'text')
   * @param {string} options.service - Service name for context (optional)
   * @param {boolean} options.enableColors - Enable colored output (default: true)
   * @param {boolean} options.enableTimestamp - Include timestamp in logs (default: true)
   * @param {Object} options.transports - Custom transport functions (optional)
   */
  constructor(options = {}) {
    super();
    
    this.options = {
      level: options.level || process.env.LOG_LEVEL || 'info',
      format: options.format || process.env.LOG_FORMAT || 'text',
      service: options.service || process.env.SERVICE_NAME || 'easy-mcp-server',
      enableColors: options.enableColors !== false,
      enableTimestamp: options.enableTimestamp !== false,
      transports: options.transports || {}
    };

    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    this.colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
      reset: '\x1b[0m'   // Reset
    };

    this.context = {};
  }

  /**
   * Set logging context
   * @param {Object} context - Context object to include in all logs
   */
  setContext(context) {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear logging context
   */
  clearContext() {
    this.context = {};
  }

  /**
   * Add to logging context
   * @param {string} key - Context key
   * @param {any} value - Context value
   */
  addContext(key, value) {
    this.context[key] = value;
  }

  /**
   * Remove from logging context
   * @param {string} key - Context key to remove
   */
  removeContext(key) {
    delete this.context[key];
  }

  /**
   * Check if a log level should be logged
   * @param {string} level - Log level to check
   * @returns {boolean} True if should log
   * @private
   */
  shouldLog(level) {
    return this.levels[level] >= this.levels[this.options.level];
  }

  /**
   * Format log message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @returns {string|Object} Formatted log entry
   * @private
   */
  formatLog(level, message, meta = {}) {
    const timestamp = this.options.enableTimestamp ? new Date().toISOString() : undefined;
    
    const logEntry = {
      timestamp,
      level,
      service: this.options.service,
      message,
      ...this.context,
      ...meta
    };

    if (this.options.format === 'json') {
      return JSON.stringify(logEntry);
    }

    // Text format
    let formatted = '';
    
    if (timestamp) {
      formatted += `[${timestamp}] `;
    }
    
    const levelStr = level.toUpperCase().padEnd(5);
    if (this.options.enableColors) {
      formatted += `${this.colors[level]}${levelStr}${this.colors.reset} `;
    } else {
      formatted += `${levelStr} `;
    }
    
    formatted += `[${this.options.service}] `;
    
    if (Object.keys(this.context).length > 0) {
      formatted += `[${Object.entries(this.context).map(([k, v]) => `${k}=${v}`).join(', ')}] `;
    }
    
    formatted += message;
    
    if (Object.keys(meta).length > 0) {
      formatted += ` ${JSON.stringify(meta)}`;
    }
    
    return formatted;
  }

  /**
   * Write log entry
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @private
   */
  writeLog(level, message, meta = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedLog = this.formatLog(level, message, meta);
    
    // Emit log event
    this.emit('log', { level, message, meta, formatted: formattedLog });
    
    // Write to console
    if (level === 'error') {
      console.error(formattedLog);
    } else {
      console.log(formattedLog);
    }
    
    // Custom transports
    if (this.options.transports[level]) {
      try {
        this.options.transports[level](formattedLog, { level, message, meta });
      } catch (error) {
        console.error(`Logger transport error: ${error.message}`);
      }
    }
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {Object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    this.writeLog('debug', message, meta);
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {Object} meta - Additional metadata
   */
  info(message, meta = {}) {
    this.writeLog('info', message, meta);
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {Object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    this.writeLog('warn', message, meta);
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {Object} meta - Additional metadata
   */
  error(message, meta = {}) {
    this.writeLog('error', message, meta);
  }

  /**
   * Log request details
   * @param {Object} req - Express request object
   * @param {Object} meta - Additional metadata
   */
  logRequest(req, meta = {}) {
    const requestMeta = {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      ...meta
    };

    this.info(`Request: ${req.method} ${req.url}`, requestMeta);
  }

  /**
   * Log response details
   * @param {Object} res - Express response object
   * @param {Object} meta - Additional metadata
   */
  logResponse(res, meta = {}) {
    const responseMeta = {
      statusCode: res.statusCode,
      ...meta
    };

    const level = res.statusCode >= 400 ? 'error' : 'info';
    this.writeLog(level, `Response: ${res.statusCode}`, responseMeta);
  }

  /**
   * Log cache operation
   * @param {string} operation - Cache operation (GET, SET, DEL, etc.)
   * @param {string} key - Cache key
   * @param {Object} meta - Additional metadata
   */
  logCacheOperation(operation, key, meta = {}) {
    const cacheMeta = {
      operation,
      key,
      ...meta
    };

    this.debug(`Cache ${operation}: ${key}`, cacheMeta);
  }

  /**
   * Log MCP call
   * @param {string} tool - MCP tool name
   * @param {Object} params - MCP call parameters
   * @param {Object} result - MCP call result
   * @param {number} duration - Call duration in ms
   * @param {Object} meta - Additional metadata
   */
  logMCPCall(tool, params, result, duration, meta = {}) {
    const mcpMeta = {
      tool,
      params: this.sanitizeParams(params),
      resultType: typeof result,
      duration,
      success: !(result instanceof Error),
      ...meta
    };

    const level = result instanceof Error ? 'error' : 'info';
    this.writeLog(level, `MCP Call: ${tool}`, mcpMeta);
  }

  /**
   * Log database operation
   * @param {string} operation - Database operation
   * @param {string} table - Table/collection name
   * @param {Object} meta - Additional metadata
   */
  logDatabaseOperation(operation, table, meta = {}) {
    const dbMeta = {
      operation,
      table,
      ...meta
    };

    this.debug(`Database ${operation}: ${table}`, dbMeta);
  }

  /**
   * Log external API call
   * @param {string} service - External service name
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {number} statusCode - Response status code
   * @param {number} duration - Call duration in ms
   * @param {Object} meta - Additional metadata
   */
  logExternalAPICall(service, endpoint, method, statusCode, duration, meta = {}) {
    const apiMeta = {
      service,
      endpoint,
      method,
      statusCode,
      duration,
      success: statusCode >= 200 && statusCode < 400,
      ...meta
    };

    const level = apiMeta.success ? 'info' : 'warn';
    this.writeLog(level, `External API: ${service} ${method} ${endpoint}`, apiMeta);
  }

  /**
   * Log performance metrics
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in ms
   * @param {Object} meta - Additional metadata
   */
  logPerformance(operation, duration, meta = {}) {
    const perfMeta = {
      operation,
      duration,
      ...meta
    };

    const level = duration > 1000 ? 'warn' : 'info';
    this.writeLog(level, `Performance: ${operation} took ${duration}ms`, perfMeta);
  }

  /**
   * Log security event
   * @param {string} event - Security event type
   * @param {string} message - Security message
   * @param {Object} meta - Additional metadata
   */
  logSecurity(event, message, meta = {}) {
    const securityMeta = {
      event,
      ...meta
    };

    this.warn(`Security: ${event} - ${message}`, securityMeta);
  }

  /**
   * Sanitize parameters for logging (remove sensitive data)
   * @param {Object} params - Parameters to sanitize
   * @returns {Object} Sanitized parameters
   * @private
   */
  sanitizeParams(params) {
    if (!params || typeof params !== 'object') {
      return params;
    }

    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'authorization'];
    const sanitized = { ...params };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Create a child logger with additional context
   * @param {Object} context - Additional context for child logger
   * @returns {Logger} Child logger instance
   */
  child(context = {}) {
    const childLogger = new Logger(this.options);
    childLogger.setContext({ ...this.context, ...context });
    return childLogger;
  }

  /**
   * Create a request-scoped logger
   * @param {Object} req - Express request object
   * @returns {Logger} Request-scoped logger
   */
  requestLogger(req) {
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return this.child({
      requestId,
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress
    });
  }

  /**
   * Get current log level
   * @returns {string} Current log level
   */
  getLevel() {
    return this.options.level;
  }

  /**
   * Set log level
   * @param {string} level - New log level
   */
  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.options.level = level;
    } else {
      throw new Error(`Invalid log level: ${level}`);
    }
  }

  /**
   * Get logger configuration
   * @returns {Object} Logger configuration
   */
  getConfig() {
    return { ...this.options };
  }
}

// Create default logger instance
const defaultLogger = new Logger();

// Export both class and default instance
module.exports = Logger;
module.exports.default = defaultLogger;
module.exports.createLogger = (options) => new Logger(options);
