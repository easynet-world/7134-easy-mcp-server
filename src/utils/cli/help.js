/**
 * CLI Help Text
 * Displays usage information and command help
 */

function showHelp() {
  console.log(`
Easy MCP Server - Dynamic API Framework with MCP Integration

Usage:
  easy-mcp-server                    # Start the server (uses server.js if exists, otherwise auto-starts)
  easy-mcp-server init [name]        # Initialize a new project
  easy-mcp-server start              # Start the server (alias)
  easy-mcp-server --help             # Show this help

Commands:
  init    Create a new Easy MCP Server project with example files
  start   Start the server (same as running without arguments)
  --help  Show this help message

Options:
  --cwd, --working-dir <dir>         Set the working directory
                                      - For local installs: loads API, MCP, and .env from this directory
                                      - For global installs: loads .env from this directory (API/MCP from package)
  --stdio, --stdio-mode              Enable STDIO mode for MCP communication
  --help, -h                         Show this help message

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
  
  # Using command-line options
  easy-mcp-server --cwd /path/to/project    # Set working directory (works for both local and global installs)
  easy-mcp-server --stdio                   # Enable STDIO mode
  easy-mcp-server --cwd /path/to/project --stdio  # Combine options
  
  # Local install: --cwd loads everything from that directory
  cd /somewhere && easy-mcp-server --cwd /path/to/project  # Uses /path/to/project/.env, api/, mcp/
  
  # Global install: --cwd only affects .env location
  cd /somewhere && test --cwd /path/to/project  # Uses /path/to/project/.env, but API/MCP from package
  
  # Using npx (no installation needed):
  npx -y xxx_test --cwd /path/to/project --stdio  # Works with both --cwd and --stdio
  npx -y xxx_test --cwd /path/to/project          # Uses /path/to/project/.env
  
  # Using environment variables (recommended)
  EASY_MCP_SERVER_PORT=8887 EASY_MCP_SERVER_MCP_PORT=8888 easy-mcp-server

For more information, visit: https://github.com/easynet-world/7134-easy-mcp-server
`);
}

module.exports = { showHelp };

