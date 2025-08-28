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
  process(req, res) {
    throw new Error('process method must be implemented by subclass');
  }

  /**
   * Get OpenAPI specification
   * Auto-generates response schema from runtime analysis
   * @returns {Object} OpenAPI specification
   */
  get openApi() {
    return {
      summary: this.description || 'API endpoint description',
      description: this.description || 'API endpoint description',
      // Response schema auto-generated from runtime analysis!
    };
  }

  /**
   * Get description for OpenAPI and MCP
   * Must be overridden by subclasses
   * @returns {string} Detailed description
   */
  get description() {
    throw new Error('description getter must be implemented by subclass');
  }

  /**
   * Get MCP description (uses OpenAPI description)
   * @returns {string} Description for MCP
   */
  get mcpDescription() {
    return this.openApi.description;
  }
}

module.exports = BaseAPI;
