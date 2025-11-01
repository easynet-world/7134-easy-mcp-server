/**
 * Easy MCP Server - Package Entry Point
 * Re-exports from src/index.js for backward compatibility
 */

module.exports = require('./src/index.js');

// Re-export everything for convenience
const srcExports = require('./src/index.js');
for (const key in srcExports) {
  if (srcExports.hasOwnProperty(key)) {
    module.exports[key] = srcExports[key];
  }
}
