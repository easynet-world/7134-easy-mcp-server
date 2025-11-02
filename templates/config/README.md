# {{PROJECT_NAME}}

This is an Easy MCP Server project that provides a dynamic API framework with MCP (Model Context Protocol) integration.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server using any of these methods:

   **Using shell script (recommended):**
   ```bash
   ./start.sh
   ```

   **Using npm scripts:**
   ```bash
   npm start
   npm run dev
   ```

   **Direct command:**
   ```bash
   easy-mcp-server
   ```

   **Without installation:**
   ```bash
   npx easy-mcp-server
   ```

## Shell Scripts

This project includes convenient shell scripts for common operations:

- **`./start.sh`** - Start the server
  - Stops existing processes
  - Clears ports if in use
  - Loads environment variables from .env
  - Starts the server with proper configuration

- **`./stop.sh`** - Stop the server
  - Gracefully stops running server processes
  - Cleans up background processes

- **`./build.sh`** - Build npm package
  - Cleans previous builds
  - Installs dependencies
  - Runs tests
  - Creates distributable .tgz package
  - Shows installation instructions

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

## Building and Publishing as npm Package

This project is configured to be built and published as an npm package:

1. **Build the package:**
   ```bash
   ./build.sh
   # or
   npm run build
   ```

2. **Install locally for testing:**
   ```bash
   npm install ./{{PROJECT_NAME}}-1.0.0.tgz
   ```

3. **Install in another project:**
   ```bash
   cd /path/to/another/project
   npm install /path/to/{{PROJECT_NAME}}-1.0.0.tgz
   ```

4. **Start the installed package with npx:**
   ```bash
   npx easy-mcp-server
   ```

5. **Publish to npm registry:**
   ```bash
   npm publish {{PROJECT_NAME}}-1.0.0.tgz
   ```

## Learn More

- [Easy MCP Server Documentation](https://github.com/easynet-world/7134-easy-mcp-server)
- [Model Context Protocol](https://modelcontextprotocol.io/)

