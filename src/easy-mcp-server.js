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
  // Redirect console.log, console.warn, and console.error to stderr in STDIO mode
  // This allows stdout to be used exclusively for JSON-RPC messages
  // Remove emojis to prevent encoding issues that can corrupt JSON-RPC communication
  // Use util.format for proper formatting (it's a built-in Node.js module)
  const util = require('util');
  
  // Helper function to remove emojis from messages
  // This prevents encoding issues that can corrupt JSON-RPC communication on stdout
  const removeEmojis = (text) => {
    // Comprehensive emoji removal covering all Unicode emoji ranges
    return text.replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emoticons & Symbols
      .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport & Map
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols
      .replace(/[\u{1FA00}-\u{1FAFF}]/gu, '') // Chess Symbols & Extended
      .replace(/[\u{200D}]/gu, '')            // Zero Width Joiner
      .replace(/[\u{FE0F}]/gu, '')            // Variation Selector-16
      .replace(/[\u{20E3}]/gu, '')            // Combining Enclosing Keycap
      .replace(/\s+/g, ' ')                   // Normalize whitespace
      .trim();
  };
  
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.log = function(...args) {
    const message = util.format(...args);
    const cleanMessage = removeEmojis(message);
    process.stderr.write(cleanMessage + '\n');
  };
  
  console.warn = function(...args) {
    const message = util.format(...args);
    const cleanMessage = removeEmojis(message);
    process.stderr.write(cleanMessage + '\n');
  };
  
  console.error = function(...args) {
    const message = util.format(...args);
    const cleanMessage = removeEmojis(message);
    process.stderr.write(cleanMessage + '\n');
  };
  
  // CRITICAL: Prevent any accidental writes to stdout in STDIO mode
  // Only the STDIO handler should write to stdout (for JSON-RPC messages)
  // This prevents any code from accidentally writing error messages or other text to stdout
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  let stdoutWriteAllowed = false; // Flag to allow JSON-RPC writes from STDIO handler
  
  process.stdout.write = function(chunk, encoding, callback) {
    // Allow writes if explicitly allowed (for JSON-RPC messages from STDIO handler)
    // This is a safety measure - the STDIO handler should be the only thing writing to stdout
    if (stdoutWriteAllowed) {
      return originalStdoutWrite(chunk, encoding, callback);
    }
    
    // In STDIO mode, redirect any accidental stdout writes to stderr (with emojis removed)
    // This prevents error messages or other text from corrupting the JSON-RPC stream
    try {
      const message = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      const cleanMessage = removeEmojis(message);
      // Only redirect if it's not already a JSON-RPC message (which would start with "Content-Length:")
      if (!message.trim().startsWith('Content-Length:')) {
        process.stderr.write('[STDOUT->STDERR] ' + cleanMessage, encoding || 'utf8', callback);
      } else {
        // If it looks like JSON-RPC, allow it through (STDIO handler should have enabled writes)
        return originalStdoutWrite(chunk, encoding, callback);
      }
    } catch (err) {
      // If there's an error processing, just allow the original write
      return originalStdoutWrite(chunk, encoding, callback);
    }
    return true;
  };
  
  // Export function to allow STDIO handler to enable stdout writes
  // This is necessary to ensure only JSON-RPC goes to stdout
  if (typeof global !== 'undefined') {
    global.__enableStdoutForJSONRPC = function() {
      stdoutWriteAllowed = true;
    };
    // Also store the original write function for direct access if needed
    global.__originalStdoutWrite = originalStdoutWrite;
  }
}

const { showHelp } = require('./utils/cli/help');
const { initProject } = require('./utils/cli/init-project');
const { startServer } = require('./utils/cli/server-start');

// Get command line arguments
const args = process.argv.slice(2);

/**
 * Parse command-line arguments
 * @returns {Object} Parsed arguments with command and options
 */
function parseArguments() {
  const result = {
    command: null,
    options: {},
    positional: []
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // Handle flags
    if (arg === '--help' || arg === '-h') {
      result.options.help = true;
    } else if (arg === '--stdio' || arg === '--stdio-mode') {
      result.options.stdio = true;
      process.env.EASY_MCP_SERVER_STDIO_MODE = 'true';
    } else if (arg === '--cwd' || arg === '--working-dir') {
      if (args[i + 1]) {
        result.options.cwd = args[++i];
      } else {
        const stdioMode = process.env.EASY_MCP_SERVER_STDIO_MODE === 'true';
        if (stdioMode) {
          process.stderr.write('Error: --cwd/--working-dir requires a directory path\n');
        } else {
          console.error('❌ Error: --cwd/--working-dir requires a directory path');
        }
        process.exit(1);
      }
    } else if (arg.startsWith('--')) {
      // Unknown flag
      const stdioMode = process.env.EASY_MCP_SERVER_STDIO_MODE === 'true';
      if (stdioMode) {
        process.stderr.write(`Unknown option: ${arg}\n`);
      } else {
        console.warn(`⚠️  Unknown option: ${arg}`);
      }
    } else if (!result.command && !arg.startsWith('--')) {
      // First non-flag argument is the command
      result.command = arg;
    } else {
      // Positional arguments
      result.positional.push(arg);
    }
  }
  
  return result;
}

/**
 * Main CLI entry point
 * Routes commands to appropriate handlers
 */
async function main() {
  const parsed = parseArguments();
  
  // Handle help flag
  if (parsed.options.help) {
    showHelp();
    return;
  }
  
  // Handle working directory option
  if (parsed.options.cwd) {
    const fs = require('fs');
    const path = require('path');
    const cwd = path.resolve(parsed.options.cwd);
    if (!fs.existsSync(cwd)) {
      const stdioMode = process.env.EASY_MCP_SERVER_STDIO_MODE === 'true';
      if (stdioMode) {
        process.stderr.write(`Error: Directory does not exist: ${cwd}\n`);
      } else {
        console.error(`❌ Error: Directory does not exist: ${cwd}`);
      }
      process.exit(1);
    }
    if (!fs.statSync(cwd).isDirectory()) {
      const stdioMode = process.env.EASY_MCP_SERVER_STDIO_MODE === 'true';
      if (stdioMode) {
        process.stderr.write(`Error: Not a directory: ${cwd}\n`);
      } else {
        console.error(`❌ Error: Not a directory: ${cwd}`);
      }
      process.exit(1);
    }
    process.chdir(cwd);
  }
  
  // Handle command
  if (parsed.command) {
    switch (parsed.command) {
    case 'init': {
      const projectName = parsed.positional[0] || 'easy-mcp-project';
      initProject(projectName);
      break;
    }
      
    case 'start':
      await startServer(parsed.options);
      break;
      
    default:
      if (isStdioMode) {
        process.stderr.write(`Unknown command: ${parsed.command}\n`);
        process.stderr.write('Run "easy-mcp-server --help" for usage information\n');
      } else {
        console.error(`❌ Unknown command: ${parsed.command}`);
        console.log('💡 Run "easy-mcp-server --help" for usage information');
      }
      process.exit(1);
    }
  } else {
    // No command provided, start server
    console.log('[DEBUG] No command, starting server');
    await startServer(parsed.options);
    console.log('[DEBUG] startServer() returned');
  }
}

// Export main function for programmatic use
module.exports.main = main;

// Run the CLI if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    if (isStdioMode) {
      process.stderr.write(`Fatal error: ${error.message}\n`);
      process.stderr.write(`${error.stack}\n`);
    } else {
      console.error('❌ Fatal error:', error.message);
      console.error(error.stack);
    }
    process.exit(1);
  });
}
