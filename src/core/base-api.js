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
      
      // Get the source code as a string
      const sourceCode = constructor.toString();
      
      // Look for JSDoc comment above the class
      const jsDocMatch = sourceCode.match(/\/\*\*([\s\S]*?)\*\/\s*class\s+\w+/);
      
      if (jsDocMatch) {
        const jsDoc = jsDocMatch[1];
        
        // Look for the specific annotation
        const annotationRegex = new RegExp(`@${annotationName}\\s+(.+)`, 'i');
        const match = jsDoc.match(annotationRegex);
        
        if (match) {
          return match[1].trim();
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
