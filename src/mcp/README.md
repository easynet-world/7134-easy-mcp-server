# MCP Server Module Structure

This directory contains the Model Context Protocol (MCP) server implementation, organized by functionality.

## Directory Structure

```
src/mcp/
├── core/                    # Core server implementation
│   └── mcp-server.js        # Main MCP server class
├── handlers/                # Request and resource handlers
│   ├── http-handler.js      # HTTP request handling (SSE, MCP HTTP, StreamableHttp)
│   ├── websocket-handler.js # WebSocket message handling
│   ├── prompt-handler.js    # Prompt loading and management
│   └── resource-handler.js  # Resource loading and management
├── processors/              # Request processors
│   └── mcp-request-processor.js # MCP request routing and processing
├── builders/                # Builders and constructors
│   └── tool-builder.js      # Tool definition building
├── executors/               # Execution logic
│   └── tool-executor.js     # Tool execution (API endpoints and bridge tools)
├── utils/                   # Utility classes
│   └── schema-normalizer.js # Schema normalization and flattening
└── index.js                 # Main entry point (re-exports DynamicAPIMCPServer)
```

## Module Descriptions

### Core
- **mcp-server.js**: Main server class that coordinates all MCP functionality. Handles server lifecycle, client connections, and delegates to specialized handlers and processors.

### Handlers
- **http-handler.js**: Handles HTTP-based MCP requests including SSE connections, HTTP MCP requests, and StreamableHttp transport.
- **websocket-handler.js**: Manages WebSocket connections and routes WebSocket messages to appropriate handlers.
- **prompt-handler.js**: Loads and manages MCP prompts from filesystem, handles file watching, and template processing.
- **resource-handler.js**: Loads and manages MCP resources from filesystem, handles MIME type detection, and template processing.

### Processors
- **mcp-request-processor.js**: Routes and processes all MCP protocol requests (tools, prompts, resources, cache, health, metrics).

### Builders
- **tool-builder.js**: Constructs MCP tool definitions from API routes, handles schema normalization, and merges bridge tools.

### Executors
- **tool-executor.js**: Executes MCP tools, handles argument mapping, and delegates to API endpoints or bridge tools.

### Utils
- **schema-normalizer.js**: Normalizes OpenAPI schemas for MCP compatibility, handles nested schema flattening, and ensures proper structure for n8n and other clients.

## Usage

### Basic Usage

```javascript
const DynamicAPIMCPServer = require('./mcp');

const server = new DynamicAPIMCPServer('0.0.0.0', 8888, {
  prompts: { enabled: true },
  resources: { enabled: true }
});

await server.run();
```

### Advanced Usage

```javascript
const { 
  DynamicAPIMCPServer,
  SchemaNormalizer,
  ToolBuilder 
} = require('./mcp');

// Use individual modules if needed
const normalizer = new SchemaNormalizer();
const builder = new ToolBuilder(normalizer);
```

## Module Dependencies

- **Core** depends on: handlers, processors, builders, executors, utils
- **Handlers** depend on: utils (for parsing)
- **Processors** depend on: builders, executors, handlers
- **Builders** depend on: utils
- **Executors** depend on: utils


