#!/usr/bin/env node

/**
 * Easy MCP Server CLI
 * 
 * Main entry point for the Easy MCP Server command-line interface.
 * Handles command routing and delegates to specialized modules.
 * 
 * Usage:
 *   easy-mcp-server          # Start the server
 *   easy-mcp-server init     # Initialize a new project
 *   easy-mcp-server start    # Start the server (alias)
 *   easy-mcp-server --help   # Show help
 */

// CRITICAL: Redirect console output to stderr in STDIO mode BEFORE any other code runs
// This must happen at the very entry point to catch ALL console output
const isStdioMode = process.env.EASY_MCP_SERVER_STDIO_MODE === 'true';
if (isStdioMode) {
  // Redirect console.log and console.warn to stderr in STDIO mode
  // This allows stdout to be used exclusively for JSON-RPC messages
  // Use util.format for proper formatting (it's a built-in Node.js module)
  const util = require('util');
  const originalLog = console.log;
  const originalWarn = console.warn;
  
  console.log = function(...args) {
    const message = util.format(...args);
    process.stderr.write(message + '\n');
  };
  
  console.warn = function(...args) {
    const message = util.format(...args);
    process.stderr.write(message + '\n');
  };
  // console.error already goes to stderr, so we don't need to redirect it
}

const { showHelp } = require('./utils/cli/help');
const { initProject } = require('./utils/cli/init-project');
const { startServer } = require('./utils/cli/server-start');

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];

/**
 * Main CLI entry point
 * Routes commands to appropriate handlers
 */
async function main() {
  // Handle help flag
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  // Check if first argument is a command or a flag
  const isCommand = command && !command.startsWith('--');
  
  if (isCommand) {
    switch (command) {
    case 'init': {
      const projectName = args[1] || 'easy-mcp-project';
      initProject(projectName);
      break;
    }
      
    case 'start':
      await startServer();
      break;
      
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('💡 Run "easy-mcp-server --help" for usage information');
      process.exit(1);
    }
  } else {
    // No command provided, start server
    await startServer();
  }
}

// Run the CLI if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
}
