/**
 * CLI Help Text
 * Displays usage information and command help
 */

function showHelp() {
  console.log(`
Easy MCP Server - Dynamic API Framework with MCP Integration

Usage:
  easy-mcp-server                    # Start the server (uses server.js if exists, otherwise auto-starts)
  easy-mcp-server init               # Initialize a new project
  easy-mcp-server start              # Start the server (alias)
  easy-mcp-server --help             # Show this help

Commands:
  init    Create a new Easy MCP Server project with example files
  start   Start the server (same as running without arguments)
  --help  Show this help message

Options:
  (No CLI options - use environment variables)

Environment Variables:
  EASY_MCP_SERVER_PORT   REST API server port
  EASY_MCP_SERVER_MCP_PORT MCP server port
  EASY_MCP_SERVER_HOST   REST API server host
  EASY_MCP_SERVER_MCP_HOST MCP server host
  EASY_MCP_SERVER_STATIC_DIRECTORY Static files directory (auto-enabled if exists)
  EASY_MCP_SERVER_DEFAULT_FILE Default file to serve at root (optional)

Features:
  • Auto .env loading     Automatically loads .env, .env.development, .env.local files
  • Auto npm install      Automatically runs npm install before starting server
  • Port auto-detection   Automatically finds available ports if configured port is busy
  • Graceful error handling  Continues running even with some broken APIs
  • Clear error reporting  Detailed error messages with helpful suggestions

Server Starting Behavior:
  • If server.js exists: Uses your custom server configuration
  • If api/ directory exists: Automatically starts server with discovered APIs
  • If neither exists: Shows error and helpful tips

Examples:
  easy-mcp-server                    # Start server (custom or auto)
  easy-mcp-server init               # Create new project
  npx easy-mcp-server                # Run without installation
  
  # Using environment variables (recommended)
  EASY_MCP_SERVER_PORT=8887 EASY_MCP_SERVER_MCP_PORT=8888 easy-mcp-server

For more information, visit: https://github.com/easynet-world/7134-easy-mcp-server
`);
}

module.exports = { showHelp };

