/**
 * Easy MCP Server - Main Entry Point
 * Re-exports core modules for easy access
 */

// Export main CLI entry point (main export)
const CLIModule = require('./easy-mcp-server');
module.exports = CLIModule;

// Export core classes for programmatic usage
module.exports.APILoader = require('./utils/loaders/api-loader');
module.exports.BaseAPI = require('./api/base/base-api');
module.exports.DynamicAPIServer = require('./api/api-server');
module.exports.OpenAPIGenerator = require('./api/openapi/openapi-generator');

// Export MCP server
module.exports.DynamicAPIMCPServer = require('./mcp');

// Export library modules
module.exports.APIResponseUtils = require('./api/utils/api-response-utils');

// Export utilities (commonly used ones)
module.exports.Logger = require('./utils/logger');
module.exports.HotReloader = require('./utils/loaders/hot-reloader');
module.exports.EnvHotReloader = require('./utils/loaders/env-hot-reloader');
module.exports.MCPBridgeReloader = require('./utils/loaders/mcp-bridge-reloader');

// For backward compatibility: also export as default
module.exports.default = CLIModule;

