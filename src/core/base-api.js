const fs = require('fs');

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
   * Auto-generates response schema from runtime analysis
   * @returns {Object} OpenAPI specification
   */
  get openApi() {
    return {
      summary: this.summary || 'API endpoint summary',
      description: this.description || 'API endpoint description',
      // Response schema auto-generated from runtime analysis!
    };
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
   * Get MCP description (uses OpenAPI description)
   * @returns {string} Description for MCP
   */
  get mcpDescription() {
    return this.openApi.description;
  }

  /**
   * Extract value from JSDoc annotation
   * @param {string} annotationName - Name of the annotation (e.g., 'description', 'summary')
   * @returns {string|null} Value of the annotation or null if not found
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
        // Read the source file
        const sourceCode = fs.readFileSync(modulePath, 'utf8');
        
        // Find the class definition and its JSDoc comment
        const className = constructor.name;
        const classRegex = new RegExp(`(\\/\\*\\*[\\s\\S]*?\\*\\/)\\s*class\\s+${className}\\b`, 'i');
        const match = sourceCode.match(classRegex);
        
        if (match) {
          const jsDoc = match[1];
          
          // Look for the specific annotation
          const annotationRegex = new RegExp(`@${annotationName}\\s+(.+)`, 'i');
          const annotationMatch = jsDoc.match(annotationRegex);
          
          if (annotationMatch) {
            return annotationMatch[1].trim();
          }
        }
      }
      
      return null;
    } catch (error) {
      // If anything goes wrong, return null
      return null;
    }
  }
}

module.exports = BaseAPI;
