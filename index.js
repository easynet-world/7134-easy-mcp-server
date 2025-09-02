/**
 * Easy MCP Server - Main Package Entry Point
 * 
 * This package provides a dynamic API framework with easy MCP (Model Context Protocol) 
 * integration for AI models. Write one function, get REST API + MCP Tool + OpenAPI docs automatically!
 */

// Export the BaseAPI class for easy inheritance
const BaseAPI = require('./src/core/base-api');

// Export key utilities
const APILoader = require('./src/core/api-loader');
const OpenAPIGenerator = require('./src/core/openapi-generator');
const DynamicAPIMCPServer = require('./src/mcp/mcp-server');

// Export the server class
const DynamicAPIServer = require('./src/core/dynamic-api-server');

module.exports = {
  // Main classes
  BaseAPI,
  DynamicAPIServer,
  APILoader,
  OpenAPIGenerator,
  DynamicAPIMCPServer,
  
  // Convenience exports
  default: DynamicAPIServer
};
