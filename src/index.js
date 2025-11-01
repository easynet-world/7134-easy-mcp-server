/**
 * Easy MCP Server - Main Entry Point
 * Re-exports core modules for easy access
 */

// Export main CLI entry point (main export)
const CLIModule = require('./easy-mcp-server');
module.exports = CLIModule;

// Export core classes for programmatic usage
module.exports.APILoader = require('./core/api-loader');
module.exports.BaseAPI = require('./core/base-api');
module.exports.DynamicAPIServer = require('./core/dynamic-api-server');
module.exports.OpenAPIGenerator = require('./core/openapi-generator');

// Export MCP server
module.exports.DynamicAPIMCPServer = require('./mcp');

// Export library modules
module.exports.BaseAPIEnhanced = require('./lib/api/base-api-enhanced');
module.exports.APIResponseUtils = require('./lib/api/api-response-utils');
module.exports.createLLMService = require('./lib/llm/llm-service').createLLMService;

// Export utilities (commonly used ones)
module.exports.Logger = require('./utils/logger');
module.exports.HotReloader = require('./utils/hot-reloader');
module.exports.EnvHotReloader = require('./utils/env-hot-reloader');
module.exports.MCPBridgeReloader = require('./utils/mcp/mcp-bridge-reloader');

// For backward compatibility: also export as default
module.exports.default = CLIModule;

