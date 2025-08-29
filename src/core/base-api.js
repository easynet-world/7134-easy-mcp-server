const AnnotationParser = require('../utils/annotation-parser');

/**
 * Base API Class
 * Provides common OpenAPI structure and MCP integration for all API endpoints
 */

class BaseAPI {
  /**
   * Process the request and generate response
   * Must be implemented by subclasses
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  process(_req, _res) {
    throw new Error('process method must be implemented by subclass');
  }

  /**
   * Get OpenAPI specification
   * Auto-generates response schema from runtime analysis and annotations
   * @returns {Object} OpenAPI specification
   */
  get openApi() {
    const baseSpec = {
      summary: this.summary || 'API endpoint summary',
      description: this.description || 'API endpoint description',
      tags: this.tags || ['api'],
      // Response schema auto-generated from runtime analysis and annotations!
    };

    // Add request body schema if available
    const requestBody = this.requestBodySchema;
    if (requestBody) {
      baseSpec.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: requestBody
          }
        }
      };
    }

    // Add response schemas if available
    const responseSchema = this.responseSchema;
    const errorResponses = this.errorResponses;
    
    if (responseSchema || errorResponses) {
      baseSpec.responses = {};
      
      // Add success response
      if (responseSchema) {
        baseSpec.responses['200'] = {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: responseSchema
            }
          }
        };
      }
      
      // Add error responses
      if (errorResponses) {
        Object.assign(baseSpec.responses, errorResponses);
      }
    }

    return baseSpec;
  }

  /**
   * Get description from JSDoc annotations or fallback to default
   * @returns {string} Description from @description annotation or default
   */
  get description() {
    return this._getAnnotationValue('description') || 'API endpoint description';
  }

  /**
   * Get summary from JSDoc annotations or fallback to default
   * @returns {string} Summary from @summary annotation or default
   */
  get summary() {
    return this._getAnnotationValue('summary') || 'API endpoint summary';
  }

  /**
   * Get tags from JSDoc annotations or fallback to default
   * @returns {Array} Tags from @tags annotation or default
   */
  get tags() {
    const tagsValue = this._getAnnotationValue('tags');
    if (tagsValue && Array.isArray(tagsValue)) {
      return tagsValue;
    }
    return ['api'];
  }

  /**
   * Get request body schema from JSDoc annotations
   * @returns {Object|null} Request body schema or null if not specified
   */
  get requestBodySchema() {
    return this._getAnnotationValue('requestBody');
  }

  /**
   * Get response schema from JSDoc annotations
   * @returns {Object|null} Response schema or null if not specified
   */
  get responseSchema() {
    return this._getAnnotationValue('responseSchema');
  }

  /**
   * Get error responses from JSDoc annotations
   * @returns {Object|null} Error responses or null if not specified
   */
  get errorResponses() {
    const responsesValue = this._getAnnotationValue('errorResponses');
    if (responsesValue) {
      const formattedResponses = {};
      
      // Format error responses for OpenAPI
      Object.entries(responsesValue).forEach(([statusCode, response]) => {
        formattedResponses[statusCode] = {
          description: response.description || `Error ${statusCode}`,
          content: {
            'application/json': {
              schema: response.schema || {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string' }
                }
              }
            }
          }
        };
      });
      
      return formattedResponses;
    }
    return null;
  }

  /**
   * Get MCP description (uses OpenAPI description)
   * @returns {string} Description for MCP
   */
  get mcpDescription() {
    return this.openApi.description;
  }

  /**
   * Extract value from JSDoc annotation using AnnotationParser
   * @param {string} annotationName - Name of the annotation (e.g., 'description', 'summary')
   * @returns {any} Value of the annotation or null if not found
   * @private
   */
  _getAnnotationValue(annotationName) {
    try {
      // Get the constructor function
      const constructor = this.constructor;
      
      // Find the module that contains this class
      let modulePath = null;
      for (const key in require.cache) {
        const module = require.cache[key];
        if (module && module.exports && module.exports === constructor) {
          modulePath = key;
          break;
        }
      }
      
      // If not found in require.cache, try to find it in the current module
      if (!modulePath) {
        const stackTrace = new Error().stack;
        const stackLines = stackTrace.split('\n');
        
        // Find the first line that's not from BaseAPI
        for (const line of stackLines) {
          if (!line.includes('base-api.js') && line.includes('(')) {
            const fileMatch = line.match(/\((.+):\d+:\d+\)/);
            if (fileMatch) {
              modulePath = fileMatch[1];
              break;
            }
          }
        }
      }
      
      if (modulePath) {
        const className = constructor.name;
        return AnnotationParser.getAnnotationValue(className, annotationName, modulePath);
      }
      
      return null;
    } catch (error) {
      // If anything goes wrong, return null
      return null;
    }
  }
}

module.exports = BaseAPI;
