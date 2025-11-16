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

## Using as MCP Server in mcp-bridge.json

Once published, this package can be used as an MCP server in any easy-mcp-server project's `mcp-bridge.json`. It **automatically detects** the transport mode based on your `.env` configuration.

### Automatic Mode Detection

The server automatically chooses the transport mode:

- **HTTP/Streamable Mode**: If `EASY_MCP_SERVER_MCP_PORT` is set in `.env`
- **STDIO Mode**: If `EASY_MCP_SERVER_MCP_PORT` is not set in `.env`

The mode is displayed in the startup logs.

### STDIO Mode (Default when no port configured)

STDIO mode uses stdin/stdout for JSON-RPC communication, which is the standard for MCP bridge servers.

**Configuration:**
- Don't set `EASY_MCP_SERVER_MCP_PORT` in `.env` (or remove it)
- Server will automatically start in STDIO mode

**Usage in mcp-bridge.json:**

```json
{
  "mcpServers": {
    "{{PROJECT_NAME}}": {
      "command": "npx",
      "args": ["-y", "{{PROJECT_NAME}}@latest"],
      "description": "Your {{PROJECT_NAME}} MCP server (STDIO mode)"
    }
  }
}
```

### HTTP/Streamable Mode (When port is configured)

HTTP mode provides HTTP endpoints for MCP communication, useful for:
- Direct HTTP connections
- MCP Inspector compatibility
- Network-based MCP servers

**Configuration:**
- Set `EASY_MCP_SERVER_MCP_PORT=8888` in your `.env` file
- Server will automatically start in HTTP/Streamable mode

**HTTP Endpoints:**
- `POST /mcp` - Standard HTTP MCP requests
- `POST /` - StreamableHttp for MCP Inspector
- `GET /sse` - Server-Sent Events for Inspector

**Connect via HTTP:**

```bash
# Example: Call tools/list via HTTP
curl -X POST http://localhost:8888/mcp \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Environment Variables

You can pass environment variables to the MCP server:

```json
{
  "mcpServers": {
    "{{PROJECT_NAME}}": {
      "command": "npx",
      "args": ["-y", "{{PROJECT_NAME}}@latest", "--stdio"],
      "env": {
        "EASY_MCP_SERVER_API_PATH": "./api",
        "EASY_MCP_SERVER_MCP_BASE_PATH": "./mcp",
        "EASY_MCP_SERVER_MCP_PORT": "8888"
      },
      "description": "Your {{PROJECT_NAME}} MCP server"
    }
  }
}
```

### Transport Mode Comparison

| Feature | STDIO Mode | HTTP/Streamable Mode |
|---------|-----------|---------------------|
| **Transport** | stdin/stdout | HTTP POST requests |
| **Use Case** | MCP bridge (mcp-bridge.json) | Direct HTTP, Inspector |
| **Port Required** | No | Yes (must be in .env) |
| **Network Access** | No | Yes |
| **Configuration** | Don't set `EASY_MCP_SERVER_MCP_PORT` | Set `EASY_MCP_SERVER_MCP_PORT` in .env |
| **Endpoint** | N/A | `POST /mcp` or `POST /` |
| **Auto-detection** | ✅ Automatic | ✅ Automatic |

**Note:** 
- Mode is **automatically detected** based on `.env` configuration
- No command-line flags needed - just configure your `.env` file
- The active mode is displayed in the startup logs
- STDIO mode: Don't set `EASY_MCP_SERVER_MCP_PORT` in `.env`
- HTTP mode: Set `EASY_MCP_SERVER_MCP_PORT=8888` in `.env`

## Learn More

- [Easy MCP Server Documentation](https://github.com/easynet-world/7134-easy-mcp-server)
- [Model Context Protocol](https://modelcontextprotocol.io/)

