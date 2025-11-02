# Development Guide

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Server Architecture](#server-architecture)
- [Source Code Structure](#source-code-structure)
- [JSDoc Annotations](#jsdoc-annotations)
- [MCP Module Architecture](#mcp-module-architecture)
- [OpenAPI Generation](#openapi-generation)
- [Configuration Management](#configuration-management)
- [Development Features](#development-features)
- [Validation Tools](#validation-tools)
- [MCP Specification Compliance](#mcp-specification-compliance)
- [Testing](#testing)
- [Contributing](#contributing)

---

## Architecture Overview

### Framework Architecture

easy-mcp-server follows a convention-over-configuration approach with automatic generation of OpenAPI specifications, Swagger UI, and MCP tools from code annotations and class definitions.

### Component Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        WebClient[Web Browser]
        AIClient[AI Agent]
        APIClient[API Client]
    end

    subgraph "easy-mcp-server"
        subgraph "API Server (Port 8887)"
            APIServer[DynamicAPIServer]
            APILoader[API Loader]
            OpenAPIGen[OpenAPI Generator]
            SwaggerUI[Swagger UI]
        end

        subgraph "MCP Server (Port 8888)"
            MCPServer[DynamicAPIMCPServer]
            HTTPHandler[HTTP Handler]
            WSHandler[WebSocket Handler]
            MCPProcessor[MCP Request Processor]
        end

        subgraph "Core Services"
            AnnotationParser[Annotation Parser]
            ToolBuilder[Tool Builder]
            ToolExecutor[Tool Executor]
            HotReloader[Hot Reloader]
        end

        subgraph "MCP Bridge"
            BridgeManager[Bridge Manager]
            ChromeBridge[Chrome DevTools]
            iTermBridge[iTerm2]
            OtherBridges[Other MCP Servers]
        end
    end

    subgraph "File System"
        APIFiles[api/**/*.js]
        Prompts[mcp/prompts/**]
        Resources[mcp/resources/**]
        Config[mcp-bridge.json]
    end

    WebClient -->|HTTP| APIServer
    APIClient -->|REST API| APIServer
    AIClient -->|JSON-RPC| MCPServer

    APIServer --> APILoader
    APILoader --> AnnotationParser
    AnnotationParser --> OpenAPIGen
    OpenAPIGen --> SwaggerUI
    APIServer --> SwaggerUI

    MCPServer --> HTTPHandler
    MCPServer --> WSHandler
    HTTPHandler --> MCPProcessor
    WSHandler --> MCPProcessor

    MCPProcessor --> ToolBuilder
    ToolBuilder --> AnnotationParser
    MCPProcessor --> ToolExecutor
    ToolExecutor --> APILoader

    MCPServer --> BridgeManager
    BridgeManager --> ChromeBridge
    BridgeManager --> iTermBridge
    BridgeManager --> OtherBridges

    APILoader --> APIFiles
    MCPServer --> Prompts
    MCPServer --> Resources
    BridgeManager --> Config

    HotReloader --> APILoader
    HotReloader --> MCPServer
```

### Request Sequence Diagram

```mermaid
sequenceDiagram
    participant Client
    participant APIServer as API Server
    participant APILoader as API Loader
    participant AnnotationParser as Annotation Parser
    participant OpenAPIGen as OpenAPI Generator
    participant RouteHandler as Route Handler

    Client->>APIServer: HTTP Request (GET /users)
    APIServer->>APILoader: Load route
    APILoader->>AnnotationParser: Parse annotations
    AnnotationParser-->>APILoader: Return parsed data
    APILoader->>OpenAPIGen: Generate OpenAPI spec
    OpenAPIGen-->>APILoader: Return OpenAPI spec
    APILoader-->>APIServer: Return route handler
    APIServer->>RouteHandler: Execute process(req, res)
    RouteHandler-->>APIServer: Return response
    APIServer-->>Client: HTTP Response
```

### MCP Tool Execution Sequence

```mermaid
sequenceDiagram
    participant AIClient as AI Client
    participant MCPServer as MCP Server
    participant HTTPHandler as HTTP Handler
    participant MCPProcessor as MCP Processor
    participant ToolProcessor as Tool Processor
    participant ToolExecutor as Tool Executor
    participant APILoader as API Loader
    participant APIHandler as API Handler

    AIClient->>MCPServer: tools/call (JSON-RPC)
    MCPServer->>HTTPHandler: Receive request
    HTTPHandler->>MCPProcessor: Route request
    MCPProcessor->>ToolProcessor: Process tool call
    ToolProcessor->>ToolExecutor: Execute tool
    ToolExecutor->>APILoader: Get API route
    APILoader-->>ToolExecutor: Return route
    ToolExecutor->>APIHandler: Call process(req, res)
    APIHandler-->>ToolExecutor: Return result
    ToolExecutor-->>ToolProcessor: Format result
    ToolProcessor-->>MCPProcessor: JSON-RPC response
    MCPProcessor-->>HTTPHandler: Response
    HTTPHandler-->>MCPServer: JSON-RPC response
    MCPServer-->>AIClient: Return result
```

### OpenAPI Generation Sequence

```mermaid
sequenceDiagram
    participant APILoader as API Loader
    participant AnnotationParser as Annotation Parser
    participant OpenAPIGen as OpenAPI Generator
    participant SourceCode as Source Code
    participant FileSystem as File System

    Note over APILoader: Hot reload detects file change
    FileSystem->>APILoader: File changed event
    APILoader->>FileSystem: Read source file
    FileSystem-->>APILoader: Source code (Request/Response classes + handler)
    APILoader->>SourceCode: Extract Request class
    SourceCode-->>APILoader: Request class definition
    APILoader->>SourceCode: Extract Response class
    SourceCode-->>APILoader: Response class definition
    APILoader->>SourceCode: Extract handler function
    SourceCode-->>APILoader: Handler function
    APILoader->>AnnotationParser: Parse JSDoc annotations from handler
    AnnotationParser-->>APILoader: Parsed annotations (@description, @tags, etc.)
    APILoader->>OpenAPIGen: Generate OpenAPI spec
    OpenAPIGen->>AnnotationParser: Get annotations
    AnnotationParser-->>OpenAPIGen: Annotations data
    OpenAPIGen->>SourceCode: Get Request/Response classes
    SourceCode-->>OpenAPIGen: Class definitions with types
    OpenAPIGen-->>APILoader: OpenAPI spec ready
    APILoader->>OpenAPIGen: Update global spec
    OpenAPIGen-->>APILoader: Complete OpenAPI spec
    APILoader-->>FileSystem: Route handler registered
```

### Core Principles

| Principle | Implementation | Result |
|-----------|----------------|--------|
| **Convention over Configuration** | `api/users/profile/get.js` | `GET /users/profile` |
| **HTTP Method Mapping** | `post.js` | `POST` method |
| **Dynamic Routes** | `api/users/[id]/get.js` | `GET /users/:id` |
| **Single Responsibility** | `process(req, res)` | Complete API ecosystem |
| **Annotation-Driven** | JSDoc annotations | Auto-generated specs |

---

## Server Architecture

### Server Components

This project has **3 different server-related components** serving different purposes:

#### 1. Server Orchestrator (`src/orchestrator.js`)
**Type**: Procedural orchestrator (not a class)

**Purpose**: Coordinates both API server and MCP server to provide a unified application server

**Responsibilities:**
- ✅ Express app initialization
- ✅ Middleware setup (CORS, body parsing, static files)
- ✅ API loading and routing
- ✅ OpenAPI documentation endpoints
- ✅ Integration with MCP server
- ✅ Hot reloading support

**Port**: `EASY_MCP_SERVER_PORT` (default: 8887)

---

#### 2. DynamicAPI Server (`src/api/api-server.js`)
**Type**: Class-based wrapper (`DynamicAPIServer`)

**Purpose**: Class-based Express server wrapper for REST API

**Responsibilities:**
- ✅ Express app wrapper
- ✅ API loading and routing
- ✅ OpenAPI specification generation
- ✅ Health check endpoints
- ✅ Hot reloading support
- ✅ Static file serving
- ✅ Optional features (LLM files, admin endpoints)

**Usage:**
```javascript
const { DynamicAPIServer } = require('easy-mcp-server');
const server = new DynamicAPIServer({
  port: 8887,
  apiPath: './api'
});
await server.start();
```

**Port**: `EASY_MCP_SERVER_PORT` (default: 8887)

---

#### 3. MCP Server (`src/mcp/mcp-server.js`)
**Type**: Class-based MCP protocol server (`DynamicAPIMCPServer`)

**Purpose**: Model Context Protocol server for AI model communication

**Responsibilities:**
- ✅ MCP protocol implementation (JSON-RPC 2.0)
- ✅ WebSocket and HTTP transport
- ✅ Tool execution (API endpoints as tools)
- ✅ Prompt and resource management
- ✅ Bridge integration (external MCP servers)
- ✅ Metrics and health monitoring

**Usage:**
```javascript
const { DynamicAPIMCPServer } = require('easy-mcp-server');
const mcpServer = new DynamicAPIMCPServer('0.0.0.0', 8888);
await mcpServer.run();
```

**Port**: `EASY_MCP_SERVER_MCP_PORT` (default: 8888)

---

## Source Code Structure

### Directory Organization

```
src/
├── orchestrator.js        # Server orchestrator (coordinates API + MCP)
├── easy-mcp-server.js     # CLI entry point
├── index.js               # Module exports
│
├── api/                   # API core functionality
│   ├── api-server.js      # API server class
│   ├── base/              # Base API classes
│   │   ├── base-api.js
│   │   └── base-api-enhanced.js
│   ├── openapi/           # OpenAPI generation
│   │   ├── openapi-generator.js
│   │   └── openapi-helper.js
│   └── utils/             # API utilities
│       └── api-response-utils.js
│
├── mcp/                   # MCP Server implementation
│   ├── mcp-server.js      # Main MCP server class
│   ├── index.js           # MCP module entry point
│   ├── handlers/          # Request handlers
│   │   ├── transport/     # Transport protocol handlers
│   │   │   ├── http-handler.js
│   │   │   └── websocket-handler.js
│   │   └── content/       # Content management handlers
│   │       ├── prompt-handler.js
│   │       └── resource-handler.js
│   ├── processors/        # Request processors
│   │   ├── mcp-request-processor.js  # Main router
│   │   └── domains/       # Domain-specific processors
│   │       ├── tool-processor.js
│   │       ├── prompt-processor.js
│   │       ├── resource-processor.js
│   │       └── system-processor.js
│   ├── builders/          # Builders
│   │   └── tool-builder.js
│   ├── executors/         # Executors
│   │   └── tool-executor.js
│   └── utils/             # MCP utilities
│       ├── mcp-bridge.js
│       ├── mcp-cache-manager.js
│       ├── mcp-schema-adapter.js
│       └── schema-normalizer.js
│
├── utils/                 # Utility modules
│   ├── llm/               # LLM utilities
│   │   └── llm-service.js
│   ├── loaders/           # Loader utilities
│   │   ├── api-loader.js
│   │   ├── env-hot-reloader.js
│   │   ├── hot-reloader.js
│   │   ├── mcp-bridge-reloader.js
│   │   └── resource-loader.js
│   ├── parsers/           # Parser utilities
│   │   ├── annotation-parser.js
│   │   └── parameter-template-parser.js
│   ├── dev/               # Development utilities
│   │   ├── package-detector.js
│   │   └── package-installer.js
│   ├── logger.js
│   └── test-utils.js
│
└── templates/             # HTML templates
    └── public-index.html
```

### Module Categories

#### Server Orchestrator (`orchestrator.js`)
- Main server orchestrator that coordinates REST API and MCP server

#### API Core Layer (`api/`)
- **`api-server.js`**: Class-based REST API server
- **`base/`**: Base API classes for endpoints
- **`openapi/`**: OpenAPI specification generation
- **`utils/`**: API response utilities

#### MCP Server (`mcp/`)
- **`mcp-server.js`**: Main MCP server class
- **`handlers/`**: Request handlers (transport and content)
- **`processors/`**: Request processors (domain-specific)
- **`builders/`**: Tool builders
- **`executors/`**: Tool executors
- **`utils/`**: MCP-specific utilities

#### Utilities (`utils/`)
- **`llm/`**: LLM service abstractions
- **`loaders/`**: Dynamic loading utilities
- **`parsers/`**: Parsing utilities (JSDoc, templates)
- **`dev/`**: Development utilities

---

## JSDoc Annotations

### Annotation Reference

#### Core Annotations

| Annotation | Purpose | Format | Example |
|------------|---------|--------|---------|
| `@description` | API endpoint description | String | `@description Get user information with optional filtering` |
| `@summary` | Brief summary for documentation | String | `@summary Retrieve user details` |
| `@tags` | Categorization tags | Comma-separated | `@tags users,data-access` |

#### Request/Response Annotations

| Annotation | Purpose | Format | Aliases |
|------------|---------|--------|---------|
| `@requestBody` | Request body JSON schema | JSON Schema object | `@body` |
| `@responseSchema` | Response JSON schema | JSON Schema object | `@response` |
| `@query` | Query parameters schema | JSON Schema object | `@queryParameters` |
| `@param` | Path parameters schema | JSON Schema object | - |
| `@errorResponses` | Error response definitions | Object with status codes | - |

### Annotation Examples

#### Basic Endpoint

```javascript
// api/users/get.js
class Request {
  // @description('Filter by active status')
  active: boolean;
}

class Response {
  id: number;
  name: string;
  active: boolean = true;
  email: string = '';
}

// @description('Get user information with optional filtering')
// @summary('Retrieve user details')
// @tags('users,data-access')
function handler(req: any, res: any) {
  res.json({ users: [] });
}

module.exports = handler;
```

#### With Request/Response Classes

```javascript
// api/users/post.js
class Request {
  // @description('User name (2-50 characters)')
  name: string;
  
  // @description('User email address')
  email: string;
  
  // @description('User age (must be 18+)')
  age: number;
}

class Response {
  success: boolean;
  data: {
    id: string;
    name: string;
    email: string;
    age: number;
  };
}

// @description('Create a new user with validation')
// @summary('Create user endpoint')
// @tags('users,authentication')
function handler(req: any, res: any) {
  const { name, email, age } = req.body;
  res.json({ 
    success: true, 
    data: { 
      id: '123',
      name, 
      email, 
      age 
    } 
  });
}

module.exports = handler;
```

#### With Response Class

```javascript
// api/users/[id]/get.js
class Request {
  // Path parameter is automatically detected from [id] folder
}

class Response {
  // @description('User unique identifier')
  id: string;
  
  // @description('User full name')
  name: string;
  
  // @description('User email address')
  email: string;
  
  // @description('Account creation timestamp')
  createdAt: string;
}

// @description('Get user by ID')
// @summary('Retrieve user details')
// @tags('users')
function handler(req: any, res: any) {
  res.json({
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date().toISOString()
  });
}

module.exports = handler;
```

#### With Query Parameters

```javascript
// api/products/get.js
class Request {
  // @description('Number of items per page (1-100)')
  limit: number = 10;
  
  // @description('Number of items to skip')
  offset: number = 0;
  
  // @description('Filter by category')
  category: string;
}

class Response {
  products: Array<{
    id: number;
    name: string;
    category: string;
  }>;
  limit: number;
  offset: number;
  category?: string;
}

// @description('List products with filtering')
// @summary('Get products list')
// @tags('products')
function handler(req: any, res: any) {
  const { limit = 10, offset = 0, category } = req.query;
  res.json({ products: [], limit, offset, category });
}

module.exports = handler;
```

#### With Error Handling

```javascript
// api/products/post.js
class Request {
  // @description('Product name')
  name: string;
  
  // @description('Product price (must be positive)')
  price: number;
}

class Response {
  success: boolean;
  data: {
    id: string;
    name: string;
    price: number;
  };
  error?: string;
  details?: string[];
}

// @description('Create product with validation')
// @summary('Create product endpoint')
// @tags('products')
function handler(req: any, res: any) {
  const { name, price } = req.body;
  
  if (!name || price < 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: ['Name is required', 'Price must be positive']
    });
  }
  
  res.json({ 
    success: true, 
    data: { 
      id: '456',
      name, 
      price 
    } 
  });
}

module.exports = handler;
```

### Supported Data Types

| Type | Description | Example |
|------|-------------|---------|
| `string` | Text data | `"name": { "type": "string", "description": "User name" }` |
| `integer` | Whole numbers | `"age": { "type": "integer", "description": "User age" }` |
| `number` | Decimal numbers | `"price": { "type": "number", "description": "Product price" }` |
| `boolean` | True/false values | `"active": { "type": "boolean", "description": "Active status" }` |
| `array` | List of items | `"items": { "type": "array", "items": { "type": "string" } }` |
| `object` | Complex data structure | `"user": { "type": "object", "properties": {...} }` |

### Required Property Logic

- ✅ **Default**: All fields are `required: true` by default
- ✅ **Explicit False**: Only specify `"required": false` when field is optional
- ✅ **Never Specify True**: Don't write `"required": true` (it's redundant)

---

## MCP Module Architecture

### Overview

The MCP (Model Context Protocol) module follows a layered architecture with clear separation of concerns:
- **Handlers**: Transport layer (I/O) - HTTP and WebSocket communication
- **Processors**: Business logic layer - Protocol processing and request routing
- **Executors**: Execution layer - Actual work execution

### Component Roles

#### 1. Handlers (Transport & Content Layer)

**Transport Handlers** (`handlers/transport/`):
- **`http-handler.js`**: Handles HTTP-based MCP requests (SSE, HTTP MCP, StreamableHttp)
- **`websocket-handler.js`**: Manages WebSocket connections and message routing

**Content Handlers** (`handlers/content/`):
- **`prompt-handler.js`**: Loads and manages MCP prompts from filesystem
- **`resource-handler.js`**: Loads and manages MCP resources from filesystem

**Key Responsibilities:**
- ✅ Protocol-level communication (HTTP, WebSocket)
- ✅ Content management (filesystem operations, file watching)
- ✅ Format conversion (WebSocket ↔ JSON-RPC)
- ✅ Delegation to processors

#### 2. Processors (Business Logic Layer)

**Main Router** (`processors/mcp-request-processor.js`):
- Routes MCP protocol requests to domain-specific processors

**Domain Processors** (`processors/domains/`):
- **`tool-processor.js`**: Handles tool-related requests (`tools/list`, `tools/call`)
- **`prompt-processor.js`**: Handles prompt-related requests (`prompts/list`, `prompts/get`)
- **`resource-processor.js`**: Handles resource-related requests (`resources/list`, `resources/read`, `resources/templates/list`)
- **`system-processor.js`**: Handles system-related requests (`cache/stats`, `cache/clear`, `health`, `metrics`, `ping`)

**Key Responsibilities:**
- ✅ MCP protocol request processing
- ✅ JSON-RPC response formatting
- ✅ Error handling
- ✅ Coordination between handlers, builders, and executors

#### 3. Executors (Execution Layer)

**`executors/tool-executor.js`**:
- **Purpose**: Execute actual work - runs API endpoints and bridge tools
- **Responsibilities**:
  - ✅ Argument mapping (flat → nested structure)
  - ✅ Create mock request/response objects
  - ✅ Call actual API processor to execute code
  - ✅ Handle bridge tool execution
  - ✅ Format execution results

**Key Methods:**
- `executeAPIEndpoint()` - Executes an API route
- `executeTool()` - Finds and executes a tool (API or bridge)

#### 4. Builders

**`builders/tool-builder.js`**:
- **Purpose**: Construct MCP tool definitions from API routes
- **Responsibilities**:
  - ✅ Schema normalization
  - ✅ Tool definition building
  - ✅ Merges bridge tools

#### 5. Utils

**`utils/schema-normalizer.js`**:
- Normalizes OpenAPI schemas for MCP compatibility
- Handles nested schema flattening

**`utils/mcp-cache-manager.js`**:
- Manages MCP cache with hot reloading
- Handles prompts and resources caching

**`utils/mcp-bridge.js`**:
- MCP bridge client for external MCP servers
- Handles RPC communication with bridge servers

**`utils/mcp-schema-adapter.js`**:
- MCP schema adapter for tool parameter translation

### Key Differences

| Component | Layer | Purpose | Responsibility |
|-----------|-------|---------|----------------|
| **Handlers** | Transport/Content | Protocol I/O & Content Management | Receive requests, convert formats, manage filesystem |
| **Processors** | Business Logic | Protocol Processing | Format responses, coordinate logic, error handling |
| **Executors** | Execution | Actual Work | Execute tools, map arguments, format results |

### Example Flow: `tools/call`

The flow follows this sequence:
1. HTTPHandler receives request and converts HTTP to JSON-RPC format
2. MCPRequestProcessor routes to ToolProcessor
3. ToolProcessor coordinates with ToolBuilder (builds tool definition) and ToolExecutor (executes the tool)
4. ToolExecutor runs code by calling the route handler
5. Response flows back through layers and is formatted as JSON-RPC response

### Architecture Best Practices

1. **Handlers should only handle transport/content concerns**:
   - Protocol parsing
   - Format conversion
   - Filesystem operations
   - Delegation to processors

2. **Processors should contain all business logic**:
   - Request routing
   - Domain-specific processing
   - Error handling
   - Response formatting

3. **Executors should only execute**:
   - Tool execution
   - Argument transformation
   - Result formatting

4. **Avoid duplication**:
   - If multiple transports need the same logic, it belongs in processors
   - If multiple processors need the same logic, it belongs in executors or utils

---

## OpenAPI Generation

### Automatic Specification Generation

OpenAPI 3.0.0 specifications are automatically generated from:
- File structure (paths and methods)
- Request/Response class definitions
- JSDoc annotations
- TypeScript type definitions (if available)

### Generation Process

OpenAPI 3.0.0 specifications are automatically generated from source code through annotation parsing and schema extraction from Request/Response classes.

### Mapping Rules

| Source | OpenAPI Target | Example |
|--------|---------------|---------|
| File path | `paths` key | `api/users/get.js` → `/users` |
| File name | HTTP method | `get.js` → `GET` |
| `@summary` | `summary` | `@summary List users` |
| `@description` | `description` | `@description Get all users` |
| `@tags` | `tags` array | `@tags users` → `["users"]` |
| `@requestBody` | `requestBody` | JSON schema → OpenAPI body |
| `@responseSchema` | `responses.200` | JSON schema → OpenAPI response |
| `@query` | `parameters` (query) | JSON schema → query params |
| `@param` | `parameters` (path) | JSON schema → path params |

### OpenAPI Endpoints

- **Specification**: `http://localhost:8887/openapi.json`
- **Swagger UI**: `http://localhost:8887/docs`

---

## Configuration Management

### Environment Variables

The Easy MCP Server **exclusively supports environment variables prefixed with `EASY_MCP_SERVER_`**. This approach ensures security, consistency, and prevents conflicts with other applications.

#### Security & Consistency
- ✅ **Only `EASY_MCP_SERVER_` prefixed variables are supported**
- ✅ **Non-prefixed variables are ignored** (e.g., `PORT`, `HOST`)
- ✅ **Prevents conflicts** with other applications
- ✅ **Centralized configuration** management

#### Server Configuration Variables

```bash
# Server Settings
EASY_MCP_SERVER_PORT=8887
EASY_MCP_SERVER_HOST=0.0.0.0

# CORS Settings
EASY_MCP_SERVER_CORS_ORIGIN=*
EASY_MCP_SERVER_CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE
EASY_MCP_SERVER_CORS_CREDENTIALS=true

# Static File Serving (auto-enabled if directory exists)
EASY_MCP_SERVER_STATIC_DIRECTORY=./public
EASY_MCP_SERVER_DEFAULT_FILE=index.html

# API Configuration
EASY_MCP_SERVER_API_PATH=api

# MCP Server Settings
EASY_MCP_SERVER_MCP_ENABLED=true
EASY_MCP_SERVER_MCP_HOST=0.0.0.0
EASY_MCP_SERVER_MCP_PORT=8888
EASY_MCP_SERVER_MCP_BASE_PATH=mcp

# Bridge Configuration
EASY_MCP_SERVER_BRIDGE_CONFIG_PATH=mcp-bridge.json

# Logging
EASY_MCP_SERVER_LOG_LEVEL=info
EASY_MCP_SERVER_LOG_FORMAT=text
EASY_MCP_SERVER_SERVICE_NAME=easy-mcp-server

# Development/Production
EASY_MCP_SERVER_QUIET=false
EASY_MCP_SERVER_PRODUCTION_MODE=false
EASY_MCP_SERVER_TEST_MODE=false
```

#### MCP Bridge Server Variables

For external MCP servers, use the dot notation pattern:

```bash
# Pattern: EASY_MCP_SERVER.<server_name>.<parameter>
# Example: EASY_MCP_SERVER.github.token -> GITHUB_TOKEN

# GitHub MCP Server
EASY_MCP_SERVER.github.token=ghp_your_github_token
EASY_MCP_SERVER.github.owner=your-organization
EASY_MCP_SERVER.github.repo=your-repository

# Slack MCP Server
EASY_MCP_SERVER.slack.token=xoxb-your-slack-token
EASY_MCP_SERVER.slack.channel=#general

# Chrome DevTools MCP Server
EASY_MCP_SERVER.chrome.debug_port=9222
EASY_MCP_SERVER.chrome.headless=true
```

### MCP Bridge Configuration

**Complete MCP Bridge Example:**

```json
{
  "mcpServers": {
    "chrome": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp"],
      "description": "Browser automation & testing"
    },
    "iterm2": {
      "command": "npx",
      "args": ["-y", "iterm-mcp"],
      "description": "Terminal automation"
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "" },
      "description": "GitHub operations"
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": { "POSTGRES_CONNECTION_STRING": "" },
      "description": "Database operations"
    }
  }
}
```

**💡 Pro Tip**: Use `"disabled": true` to temporarily disable servers without removing them from config.

---

## Development Features

### Real-time Development

- ✅ **API Files**: Instant detection of `api/**/*.js` file modifications
- ✅ **Middleware**: Immediate application of `middleware.js` changes
- ✅ **Prompts**: Real-time updates for `mcp/prompts/` file changes
- ✅ **Resources**: Automatic reload of `mcp/resources/` modifications
- ✅ **Environment**: Seamless `.env` file change detection
- ✅ **MCP Bridge**: Automatic bridge restart on configuration changes

### Development Benefits

- 🔄 **Zero Restart**: Immediate change application
- 📦 **Dependency Management**: Automatic installation of missing packages
- 🚀 **Rapid Development**: Instant feedback loop
- 🛡️ **Error Handling**: Graceful management of invalid configurations
- 🧹 **Resource Management**: Automatic cleanup of deprecated middleware

### Hot Reload Mechanism

The hot reload system uses file watching to detect changes and automatically:
1. Detects file changes
2. Parses the new file
3. Validates syntax
4. Loads into memory
5. Updates routes and specifications
6. Makes changes available immediately

---

## Validation Tools

### Quick Validation

```bash
# Validate everything (recommended)
npm run validate

# Validate OpenAPI specification
npm run validate:openapi

# Validate MCP implementation (static analysis)
npm run validate:mcp:static

# Validate MCP implementation (runtime, requires running server)
npm run validate:mcp
```

### OpenAPI Validator

Validates that generated API specifications comply with OpenAPI 3.0.0 standards.

**What it validates:**
- ✅ Required fields (openapi, info, paths)
- ✅ OpenAPI version compliance
- ✅ Path parameter consistency
- ✅ Response object structure
- ✅ Schema definitions
- ✅ Operation uniqueness

**Output:**
```
✅ Perfect! OpenAPI specification is fully compliant with OpenAPI 3.0 standards.

Specification saved to: openapi-spec.json
```

### MCP Validator (Static)

Analyzes code structure to verify MCP protocol compliance (no server required).

**What it validates:**
- ✅ JSON-RPC 2.0 protocol usage
- ✅ Required MCP methods (tools, prompts, resources)
- ✅ Error code standards
- ✅ Response format compliance
- ✅ Domain processor architecture
- ✅ Notification support

**Result:** 100% MCP 2024-11-05 Specification Compliance

### MCP Validator (Runtime)

Tests actual MCP requests and responses (requires running server).

**What it tests:**
- ✅ tools/list, tools/call
- ✅ prompts/list, prompts/get
- ✅ resources/list, resources/read
- ✅ Error handling
- ✅ JSON-RPC 2.0 compliance

### Validation Best Practices

1. **Run validations regularly**
   ```bash
   npm run validate
   ```

2. **Validate before commits**
   - Add to pre-commit hook
   - Ensures quality before code review

3. **Validate in CI/CD**
   - Automated checks on every push
   - Prevents broken specs from merging

4. **Review validation output**
   - Address all errors immediately
   - Consider fixing warnings

5. **Keep validators updated**
   - Update when specs change
   - Add new checks as needed

---

## MCP Specification Compliance

### Overview

Our MCP server implementation complies with the official Model Context Protocol specification (2024-11-05).

### JSON-RPC 2.0 Compliance

✅ **All responses follow JSON-RPC 2.0 format:**
- `jsonrpc: "2.0"` (required)
- `id: <request_id>` (required for requests with id)
- `result: {...}` (success response)
- `error: {...}` (error response with code and message)

### tools/list Response

#### Required Structure
```json
{
  "jsonrpc": "2.0",
  "id": <id>,
  "result": {
    "tools": [...]
  }
}
```

#### Tool Definition Structure

**Required Fields** ✅
- **name** (string): Unique identifier for the tool
- **description** (string): Detailed explanation of the tool's functionality
- **inputSchema** (object): JSON Schema Draft 2020-12 for input parameters

**Optional but Recommended Fields** ✅
- **summary** (string): Brief overview for quick scanning
- **responseSchema** (object): JSON Schema Draft 2020-12 for response structure

**Additional Metadata (Allowed by Spec)** ✅
- **method** (string): HTTP method (e.g., "GET", "POST") - for API tools
- **path** (string): API path - for API tools
- **tags** (array): Categorization tags

**Status**: ✅ **COMPLIANT** - All required fields present, optional fields included, additional metadata allowed.

### prompts/list Response

#### Required Structure
```json
{
  "jsonrpc": "2.0",
  "id": <id>,
  "result": {
    "prompts": [...]
  }
}
```

#### Prompt Definition Structure

**Required Fields** ✅
- **name** (string): Unique identifier for the prompt
- **description** (string): Description of what the prompt does
- **arguments** (array): Array of argument definitions (optional per spec, but recommended)

**Additional Metadata (Allowed by Spec)** ✅
- **total** (number): Total count of prompts
- **static** (number): Count of static prompts
- **cached** (number): Count of cached prompts
- **cacheStats** (object): Cache statistics
- **source** (string): Source type (e.g., "static", "markdown")
- **parameterCount** (number): Count of parameters

**Status**: ✅ **COMPLIANT** - Required fields present, additional metadata allowed.

### resources/list Response

#### Required Structure
```json
{
  "jsonrpc": "2.0",
  "id": <id>,
  "result": {
    "resources": [...]
  }
}
```

#### Resource Definition Structure

**Required Fields** ✅
- **uri** (string): Unique resource identifier (must start with `resource://` or `file://`)
- **name** (string): Human-readable name for the resource
- **description** (string): Description of the resource content
- **mimeType** (string): MIME type of the resource content

**Additional Metadata (Allowed by Spec)** ✅
- **total** (number): Total count of resources
- **static** (number): Count of static resources
- **cached** (number): Count of cached resources
- **cacheStats** (object): Cache statistics
- **source** (string): Source type (e.g., "static", "markdown")
- **content** (string): Resource content (for cached resources)
- **filePath** (string): File system path (for file-based resources)
- **format** (string): Format type (e.g., "markdown")

**Status**: ✅ **COMPLIANT** - Required fields present, additional metadata allowed.

### Compliance Summary

✅ **All MCP endpoints are compliant with the specification:**
- JSON-RPC 2.0 format correctly implemented
- Required fields present in all responses
- Optional recommended fields included
- Additional metadata fields allowed by spec
- JSON Schema validation ensures proper structure
- Error handling follows JSON-RPC 2.0 error format

### MCP Specification References

- **MCP Specification**: https://modelcontextprotocol.io
- **JSON-RPC 2.0 Specification**: https://www.jsonrpc.net/specification
- **JSON Schema Draft 2020-12**: https://json-schema.org/specification.html
- **Protocol Version**: 2024-11-05

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:validation

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Test Structure

```
test/
├── unit/              # Unit tests for individual modules
├── integration/      # Integration tests
├── validation/       # Compliance validation tests
└── fixtures/         # Test fixtures and mocks
```

### Test Coverage

- ✅ **Unit Tests**: Individual module functionality
- ✅ **Integration Tests**: End-to-end API and MCP flows
- ✅ **Validation Tests**: OpenAPI and MCP specification compliance
- ✅ **Edge Cases**: Error handling and boundary conditions

### Writing Tests

#### Unit Test Example

```javascript
const { AnnotationParser } = require('easy-mcp-server/utils/parsers/annotation-parser');

describe('AnnotationParser', () => {
  test('should parse @description annotation', () => {
    const sourceCode = `
      class Request {
        // @description('Filter parameter')
        filter: string;
      }
      
      class Response {
        id: number;
        name: string;
      }
      
      // @description('Get user information')
      // @summary('Get user')
      // @tags('users')
      function handler(req: any, res: any) {
        res.json({ id: 1, name: 'John' });
      }
      
      module.exports = handler;
    `;
    
    const result = AnnotationParser.parseClassAnnotations('handler', '/test.js');
    expect(result.description).toBe('Get user information');
  });
});
```

#### Integration Test Example

```javascript
const request = require('supertest');
const { DynamicAPIServer } = require('easy-mcp-server');

describe('API Integration', () => {
  let server;
  
  beforeAll(async () => {
    server = new DynamicAPIServer({ port: 8887 });
    await server.start();
  });
  
  afterAll(async () => {
    await server.stop();
  });
  
  test('GET /users should return users', async () => {
    const response = await request(server.app)
      .get('/users')
      .expect(200);
    
    expect(response.body).toHaveProperty('users');
  });
});
```

---

## Contributing

### Development Setup

```bash
# Clone repository
git clone https://github.com/easynet-world/7134-easy-mcp-server.git
cd 7134-easy-mcp-server

# Install dependencies
npm install

# Run tests
npm test

# Run validation
npm run validate
```

### Contribution Guidelines

1. **Fork the repository**
2. **Create feature branch** (`git checkout -b feature/amazing-feature`)
3. **Write tests** for your changes
4. **Run tests and validation** (`npm test && npm run validate`)
5. **Commit changes** (`git commit -m 'Add amazing feature'`)
6. **Push to branch** (`git push origin feature/amazing-feature`)
7. **Open Pull Request**

### Code Style

- Follow existing code style
- Use ESLint for code quality
- Write clear, descriptive commit messages
- Add JSDoc comments for public APIs
- Include tests for new features

### Pull Request Process

1. Ensure all tests pass
2. Run validation tools
3. Update documentation if needed
4. Request review from maintainers
5. Address feedback
6. Merge after approval

---

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Use custom port
EASY_MCP_SERVER_PORT=8888 npx easy-mcp-server
```

#### APIs Not Working
- Check file paths match API structure
- Verify HTTP method naming (get.js, post.js)
- Check console for error messages

#### AI Features Not Showing
- Ensure files in `mcp/prompts/` and `mcp/resources/`
- Check MCP server is running on port 8888
- Verify MCP bridge configuration

#### Hot Reload Not Working
- Hot reload is enabled by default in development
- Only disabled when `EASY_MCP_SERVER_PRODUCTION_MODE=true`
- Check file watching permissions

#### MCP Bridge Tool Issues

**Problem**: Bridge MCP servers returning "Tool not found" errors
```
-32602 error, Tool not found: chrome_new_page
```

**Root Cause**: Tool name prefix conflicts between easy-mcp-server and bridge servers

**Solution**: Use original tool names from bridge MCP servers without prefixes

**Example**:
- ✅ Correct: `new_page` (original tool name)
- ❌ Incorrect: `chrome_new_page` (with prefix)

### Debug Mode

```bash
EASY_MCP_SERVER_LOG_LEVEL=debug npx easy-mcp-server
```

### Health Check

```bash
curl http://localhost:8887/health
curl http://localhost:8888/health
```

---

## Additional Resources

- **Example Project**: See `example-project/` directory
- **API Documentation**: http://localhost:8887/docs
- **OpenAPI Spec**: http://localhost:8887/openapi.json
- **MCP Inspector**: `npx @modelcontextprotocol/inspector`
- **GitHub Issues**: https://github.com/easynet-world/7134-easy-mcp-server/issues

---

## License

MIT License - see [package.json](../package.json) for license details.

