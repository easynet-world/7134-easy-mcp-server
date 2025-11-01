# test-project-1761975632378-v5dl9d7sb

This is an Easy MCP Server project that provides a dynamic API framework with MCP (Model Context Protocol) integration.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   easy-mcp-server
   ```

3. Or use npm scripts:
   ```bash
   npm start
   npm run dev
   ```

4. Or run without installation:
   ```bash
   npx easy-mcp-server
   ```

## Available Endpoints

- **Health Check**: `GET /health`
- **API Info**: `GET /api-info`
- **OpenAPI Spec**: `GET /openapi.json`
- **API Documentation**: `GET /docs`

## Adding APIs

Create API files in the `api/` directory. Each file should export a class that extends BaseAPI from easy-mcp-server.

Example API file (`api/example/get.js`):
```javascript
const BaseAPI = require('easy-mcp-server/base-api');

class GetExample extends BaseAPI {
  process(req, res) {
    res.json({ 
      message: 'Hello from Easy MCP Server!',
      timestamp: Date.now()
    });
  }
}

module.exports = GetExample;
```

## Environment Variables

Copy `.env.example` to `.env` and configure:
- `EASY_MCP_SERVER_PORT`: Server port (default: 8887)
- `EASY_MCP_SERVER_CORS_ORIGIN`: CORS origin
- `EASY_MCP_SERVER_CORS_METHODS`: Allowed HTTP methods
- `EASY_MCP_SERVER_DEFAULT_FILE`: Default file for root path (optional)
- `EASY_MCP_SERVER_CORS_CREDENTIALS`: Allow credentials

## Learn More

- [Easy MCP Server Documentation](https://github.com/easynet-world/7134-easy-mcp-server)
- [Model Context Protocol](https://modelcontextprotocol.io/)
