/**
 * MCP (Model Context Protocol) Server
 * Main entry point for MCP server functionality
 */

const DynamicAPIMCPServer = require('./core/mcp-server');

module.exports = DynamicAPIMCPServer;

// Export individual modules for advanced usage
module.exports.SchemaNormalizer = require('./utils/schema-normalizer');
module.exports.ToolBuilder = require('./builders/tool-builder');
module.exports.ToolExecutor = require('./executors/tool-executor');
module.exports.PromptHandler = require('./handlers/prompt-handler');
module.exports.ResourceHandler = require('./handlers/resource-handler');
module.exports.HTTPHandler = require('./handlers/http-handler');
module.exports.WebSocketHandler = require('./handlers/websocket-handler');
module.exports.MCPRequestProcessor = require('./processors/mcp-request-processor');


