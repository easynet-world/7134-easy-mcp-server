// Easy MCP Server Project
// 
// This project uses the easy-mcp-server package to provide a dynamic API framework
// with MCP (Model Context Protocol) integration.
//
// To start the server, run:
//   easy-mcp-server
//   npm start
//   npx easy-mcp-server
//
// The server will automatically discover and load API files from the api/ directory.
// Each API file should export a class that extends BaseAPI from easy-mcp-server.

const { BaseAPI } = require('easy-mcp-server');

// Example API class (you can modify or remove this)
class ExampleAPI extends BaseAPI {
  process(req, res) {
    res.json({
      message: 'Welcome to Easy MCP Server!',
      timestamp: Date.now(),
      description: 'This is an example API endpoint'
    });
  }
}

module.exports = {
  ExampleAPI
};

