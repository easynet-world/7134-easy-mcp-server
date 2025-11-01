# easy-mcp-server
## Enterprise-Grade Node.js Server with AI Integration

[![npm version](https://img.shields.io/npm/v/easy-mcp-server.svg)](https://www.npmjs.com/package/easy-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![AI-Ready](https://img.shields.io/badge/AI-Ready-brightgreen.svg)](https://modelcontextprotocol.io)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)

> **Enterprise Development Simplified**  
> 
> **Traditional Approach**: Manual routing → Middleware configuration → AI SDK integration → Documentation → Deployment  
> **easy-mcp-server**: Single function implementation → Complete API ecosystem with AI integration  
> 
> **Streamlined development workflow: Focus on business logic while the framework manages infrastructure.**

---

## Table of Contents

- [Architectural Advantages](#architectural-advantages)
- [Quick Start](#quick-start)
- [Installation & Setup](#installation--setup)
- [Core Features](#core-features)
- [Project Structure](#project-structure)
- [Framework Architecture](#framework-architecture)
- [AI Integration (MCP Protocol)](#ai-integration-mcp-protocol)
- [Development Features](#development-features)
- [Configuration Management](#configuration-management)
- [Server Architecture](#server-architecture)
- [Source Code Structure](#source-code-structure)
- [MCP Module Architecture](#mcp-module-architecture)
- [MCP Specification Compliance](#mcp-specification-compliance)
- [Scripts & Utilities](#scripts--utilities)
- [Changelog](#changelog)
- [Production Deployment](#production-deployment)
- [Troubleshooting Guide](#troubleshooting-guide)
- [Contributing](#contributing)
- [License](#license)

---

## **Architectural Advantages**

| Traditional Development | **easy-mcp-server** |
|------------------------|-------------------|
| Manual AI integration | ✅ **Native AI Support** - Built-in MCP protocol |
| Manual routing & middleware | ✅ **Convention-based** - Zero configuration required |
| Limited AI agent access | ✅ **AI-Ready APIs** - Automatic tool generation |
| Complex learning curve | ✅ **Intuitive Design** - File structure maps to API endpoints |
| Manual maintenance | ✅ **Hot Reload** - Real-time development updates |
| Legacy architecture patterns | ✅ **AI-Optimized** - Modern architectural approach |

**Development Efficiency**: Traditional setup → easy-mcp-server = **Streamlined workflow**

---

## **Quick Start**

### ⚡ **Fastest Way: Create Your Own Project** (Recommended)
```bash
# Create a new project with everything configured
npx easy-mcp-server init my-api-project
cd my-api-project
npm install
./start.sh

# Your API is now running at http://localhost:8887 🚀
```

**What you get instantly:**
- ✅ Working API endpoints (GET & POST examples)
- ✅ AI integration (MCP) pre-configured
- ✅ Professional landing page
- ✅ Complete documentation
- ✅ Hot reload enabled
- ✅ Scripts for easy server management (`start.sh`, `stop.sh`)
- ✅ Test suite template

**🎯 You're ready to build! Just edit `api/` folder to add your endpoints.**

---

### Option 1: Try the Example Project
```bash
# Clone and explore the complete example project
git clone https://github.com/easynet-world/7134-easy-mcp-server.git
cd 7134-easy-mcp-server/example-project
npx easy-mcp-server
# Open http://localhost:8887 for interactive demo
```

**Example Project Features:**
- Complete API implementation with users and products endpoints
- AI prompts and resources for MCP integration
- JSDoc annotations for automated documentation
- Real-world development patterns and best practices

### Option 2: Manual Setup
```bash
# Install the framework
npm install easy-mcp-server

# Create your first API endpoint
mkdir -p api/users
echo "const BaseAPI = require('easy-mcp-server/api/base-api');
class GetUsers extends BaseAPI {
  process(req, res) {
    res.json({ users: [] });
  }
}
module.exports = GetUsers;" > api/users/get.js

# Launch the server
npx easy-mcp-server
```

---

## **Installation & Setup**

### Quick Installation
```bash
# Option 1: Direct execution (recommended)
npx easy-mcp-server

# Option 2: Local installation
npm install easy-mcp-server
```

### Server Configuration
```bash
# Standard execution
npx easy-mcp-server

# Custom port configuration
EASY_MCP_SERVER_PORT=8887 npx easy-mcp-server
```

**Service Endpoints:**
- 🌐 **REST API**: http://localhost:8887
- 🤖 **AI Server**: http://localhost:8888
- 📚 **API Documentation**: http://localhost:8887/docs
- 📁 **Static Assets**: http://localhost:8887/

---

## **Core Features**

### Core Architecture Principles

| Principle | Implementation | Result |
|-----------|----------------|--------|
| **Convention over Configuration** | `api/users/profile/get.js` | `GET /users/profile` |
| **HTTP Method Mapping** | `post.js` | `POST` method |
| **Dynamic Routes** | `api/users/[id]/get.js` | `GET /users/:id` |
| **Single Responsibility** | `process(req, res)` | Complete API ecosystem |

### File Structure Mapping

```
api/                    # API endpoints
├── users/
│   ├── get.js         # GET /users
│   └── post.js          # POST /users
└── products/
    ├── get.js         # GET /products
    ├── post.js        # POST /products
    └── [id]/          # Dynamic route
        └── get.js     # GET /products/:id
```

### Endpoint Export Options

You can define endpoints in three ways:

1) Extend the `BaseAPI` class (recommended for OpenAPI and schema features):
```javascript
const BaseAPI = require('easy-mcp-server/api/base-api');

class GetUsers extends BaseAPI {
  process(req, res) {
    res.json({ users: [] });
  }
}

module.exports = GetUsers;
```

2) Export a plain handler function:
```javascript
module.exports = (req, res) => {
  res.json({ users: [] });
};
```

3) Export an object with a `process(req, res)` method:
```javascript
module.exports = {
  process(req, res) {
    res.json({ users: [] });
  }
};
```

**Notes:**
- BaseAPI provides OpenAPI generation and annotation parsing; plain functions/objects will not auto-generate specs.
- All forms are supported by the loader and mapped by file path and method name.

---

## **Project Structure**

```
your-project/
├── api/                    # API endpoints
│   ├── users/
│   │   ├── get.js         # GET /users
│   │   └── post.js         # POST /users
│   └── products/
│       ├── get.js         # GET /products
│       ├── post.js        # POST /products
│       └── [id]/          # 📌 OPTIONAL: Dynamic route example
│           └── get.js     # GET /products/:id
├── mcp/                   # AI features (optional)
│   ├── prompts/           # AI prompt templates
│   └── resources/         # AI resource documentation
├── public/                # Static files (optional)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── package.json           # Project dependencies
├── .env                   # Environment configuration
├── .gitignore             # Git ignore patterns
├── start.sh               # 🚀 Convenient start script
├── stop.sh                # 🛑 Convenient stop script
├── mcp-bridge.json        # 🔌 Bridge to other MCP servers
└── README.md
```

> **💡 Quick Start**: Run `npx easy-mcp-server init my-project` to create this structure automatically!

---

## **Framework Architecture**

### Automated Documentation Generation

**Why Annotations Are Essential:**
JSDoc annotations provide automated generation of OpenAPI specifications, MCP protocol integration for AI agents, and comprehensive API documentation. This eliminates the need for manual Swagger configuration and separate AI integration infrastructure.

```javascript
/**
 * @description Get user information with optional filtering
 * @summary Retrieve user details
 * @tags users,data-access
 * @requestBody { "type": "object", "properties": { "limit": { "type": "number", "default": 10 } } }
 * @responseSchema { "type": "object", "properties": { "users": { "type": "array", "items": { "type": "string" } } } }
 */
class GetUser extends BaseAPI {
  process(req, res) {
    res.json({ user: {} });
  }
}
```

**Supported JSDoc Annotations:**

| Annotation | Purpose | Example |
|------------|---------|---------|
| `@description` | API endpoint description | `@description Get user information with optional filtering` |
| `@summary` | Brief summary for documentation | `@summary Retrieve user details` |
| `@param` | Path parameters (JSON format) | `@param { "id": { "type": "string", "description": "Product ID" } }` |
| `@body` | Request body JSON schema | `@body { "name": { "type": "string", "description": "Product name" } }` |
| `@query` | Query parameters (JSON format) | `@query { "limit": { "type": "integer", "description": "Number of items" } }` |
| `@response` | Response schema (JSON format) | `@response { "data": { "type": "array", "description": "List of items" } }` |
| `@errorResponses` | Error response definitions | `@errorResponses { "400": { "description": "Bad request" } }` |

**Supported Data Types:**

| Type | Description | Example |
|------|-------------|---------|
| `string` | Text data | `"name": { "type": "string", "description": "User name" }` |
| `integer` | Whole numbers | `"age": { "type": "integer", "description": "User age" }` |
| `number` | Decimal numbers | `"price": { "type": "number", "description": "Product price" }` |
| `boolean` | True/false values | `"active": { "type": "boolean", "description": "Active status" }` |
| `array` | List of items | `"items": { "type": "array", "description": "List of products" }` |
| `object` | Complex data structure | `"user": { "type": "object", "description": "User object" }` |

**Required Property Logic:**
- ✅ **Default**: All fields are `required: true` by default
- ✅ **Explicit False**: Only specify `"required": false` when field is optional
- ✅ **Never Specify True**: Don't write `"required": true` (it's redundant)

### Enhanced API with AI Integration

```javascript
const { BaseAPIEnhanced } = require('easy-mcp-server/api/base-api-enhanced');

class MyEnhancedAPI extends BaseAPIEnhanced {
  constructor() {
    super('my-service', {
      llm: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY }
    });
  }

  async process(req, res) {
    // AI and utility services available
    this.responseUtils.sendSuccessResponse(res, { data: 'Hello World' });
  }
}
```

### Middleware Management

```javascript
// api/middleware.js - Global middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

module.exports = [authenticate];
```

---

## **AI Integration (MCP Protocol)**

### Enterprise AI Integration
- **Traditional Approach**: AI models require manual API integration
- **easy-mcp-server**: Automatic AI model discovery and API consumption

### AI Resource Configuration

```bash
# Configure AI prompt templates
mkdir -p mcp/prompts
echo 'Analyze {{data}} and generate {{report_type}} report' > mcp/prompts/analysis.md

# Setup AI resource documentation
mkdir -p mcp/resources
echo '# API Guide\n\nThis API helps you manage users and products.' > mcp/resources/guide.md
```

**Outcome**: AI models gain access to your prompts and documentation resources.

### **🔌 Native MCP Bridge Integration**

**Built-in Zero-Config Bridge Support**: Connect to external MCP servers like Chrome DevTools and iTerm2 without any complex setup.

**Chrome DevTools Operations** (via `chrome-devtools-mcp`):
- 🌐 **Web Automation**: `new_page`, `navigate_page`, `click`, `fill`, `evaluate_script`
- 📸 **Testing & Debugging**: `take_screenshot`, `take_snapshot`, `list_console_messages`
- 🚦 **Performance**: `emulate_network`, `emulate_cpu`, `list_network_requests`
- 🎨 **UI Inspection**: `hover`, `drag`, `handle_dialog`, `upload_file`
- Plus 20+ additional browser automation capabilities

**iTerm2 Terminal Operations** (via `iterm-mcp`):
- 🖥️ **Terminal Control**: `write_to_terminal`, `read_terminal_output`, `send_control_character`
- 🚀 **Deployment**: Automate CI/CD pipelines and server operations
- 📝 **Monitoring**: Real-time log analysis and system diagnostics

**Setup**: Just add `mcp-bridge.json` to your project (automatically included with `init`)

### MCP Connection Setup

**WebSocket Connection:**
```
ws://localhost:8888
```

**HTTP Connection:**
```
POST http://localhost:8888/mcp
Content-Type: application/json
```

### Initialize Connection

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "clientInfo": {
      "name": "my-ai-agent",
      "version": "1.0.0"
    }
  }
}
```

### List Available Tools

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

### Call API Tools

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_users",
    "arguments": {
      "active": true
    }
  }
}
```

---

## **Development Features**

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

---

## **Configuration Management**

### Environment Variables

The Easy MCP Server **exclusively supports environment variables prefixed with `EASY_MCP_SERVER_`**. This approach ensures security, consistency, and prevents conflicts with other applications.

#### **Security & Consistency**
- ✅ **Only `EASY_MCP_SERVER_` prefixed variables are supported**
- ✅ **Non-prefixed variables are ignored** (e.g., `PORT`, `HOST`)
- ✅ **Prevents conflicts** with other applications
- ✅ **Centralized configuration** management

#### **Server Configuration Variables**

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

#### **MCP Bridge Server Variables**

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

### Static File Serving

```bash
# Create static files directory
mkdir public
echo '<h1>Hello World!</h1>' > public/index.html
```

---

## **Server Architecture**

### Server Implementations

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

### Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│      Server Orchestrator (src/orchestrator.js)      │
│  - Coordinates API & MCP servers                    │
│  - Manages hot reloaders                           │
│  - Handles MCP-specific endpoints                  │
└──────────────┬──────────────────────────────────────┘
               │
               ├─────────────────┐
               │                 │
┌──────────────▼──────────┐   ┌──▼────────────────────┐
│  DynamicAPIServer       │   │  DynamicAPIMCPServer │
│  (REST API)             │   │  (MCP Protocol)       │
│                         │   │                       │
│  - Port 8887            │   │  - Port 8888          │
│  - HTTP REST endpoints  │   │  - JSON-RPC 2.0       │
│  - OpenAPI docs         │   │  - WebSocket/HTTP     │
│  - /health, /docs       │   │  - tools/list/call    │
│                         │   │  - prompts/resources  │
└─────────────────────────┘   └───────────────────────┘
```

### Server Files Analysis

All 4 server-related files are needed:

1. **`easy-mcp-server.js`** (CLI Entry Point)
   - **Purpose**: npm CLI entry point
   - **Responsibilities**: `init` command, auto-detection, .env loading, dependency installation
   - **Needed?**: ✅ **YES** - This is the npm package entry point

2. **`orchestrator.js`** (Server Orchestrator)
   - **Purpose**: Full-featured application server
   - **Responsibilities**: Orchestrates REST + MCP, MCP-specific endpoints, hot reloaders
   - **Needed?**: ✅ **YES** - Coordinates both servers

3. **`api-server.js`** (REST API Server Class)
   - **Purpose**: Class-based REST API server
   - **Responsibilities**: Express wrapper, middleware, API loading, OpenAPI
   - **Needed?**: ✅ **YES** - Used by `orchestrator.js` and programmatically

4. **`mcp-server.js`** (MCP Protocol Server)
   - **Purpose**: Model Context Protocol server (different protocol)
   - **Responsibilities**: JSON-RPC 2.0, WebSocket, tools, prompts, resources
   - **Needed?**: ✅ **YES** - Different protocol, different purpose

**Conclusion**: All 4 are needed - each serves a distinct purpose with clear separation of concerns.

---

## **Source Code Structure**

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

### Module Dependencies

```
orchestrator.js
  ├── api/api-server.js
  ├── mcp/ (via index.js)
  └── utils/loaders/*

api/api-server.js
  ├── utils/loaders/api-loader.js
  └── api/openapi/openapi-generator.js

api/base/base-api-enhanced.js
  ├── api/base/base-api.js
  ├── api/utils/api-response-utils.js
  ├── utils/llm/llm-service.js
  └── utils/loaders/resource-loader.js

mcp/mcp-server.js
  ├── mcp/handlers/* (transport and content)
  ├── mcp/processors/*
  ├── mcp/builders/*
  ├── mcp/executors/*
  └── mcp/utils/*
```

### Import Path Conventions

1. **From `orchestrator.js`**: Use `./api/`, `./mcp/`, `./utils/`
2. **From `api/`**: Use `../utils/` for utilities
3. **From `mcp/`**: Use `./handlers/`, `./processors/`, `./utils/` for internal modules
4. **From `utils/`**: Use `../api/` for API core, `../mcp/` for MCP modules

---

## **MCP Module Architecture**

### Overview

The MCP (Model Context Protocol) module follows a layered architecture:

```
Request → Handler → Processor → Executor
          ↓           ↓          ↓
      Transport   Protocol    Execution
      (I/O)       (Business)   (Work)
```

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

#### Handlers vs Processors vs Executors

| Component | Layer | Purpose | Responsibility |
|-----------|-------|---------|----------------|
| **Handlers** | Transport/Content | Protocol I/O & Content Management | Receive requests, convert formats, manage filesystem |
| **Processors** | Business Logic | Protocol Processing | Format responses, coordinate logic, error handling |
| **Executors** | Execution | Actual Work | Execute tools, map arguments, format results |

**Example Flow: `tools/call`**

```
1. HTTPHandler receives request
   └─ Converts HTTP to JSON-RPC format

2. MCPRequestProcessor routes to ToolProcessor
   └─ ToolProcessor.processCallTool()

3. ToolProcessor coordinates
   ├─ ToolBuilder builds tool definition
   └─ ToolExecutor executes the tool

4. ToolExecutor runs code
   └─ Calls route.processorInstance.process()

5. Response flows back through layers
   └─ Formatted as JSON-RPC response
```

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

## **Production Deployment**

### Production Features

| Feature | Description |
|---------|-------------|
| **Auto Discovery** | Automatic loading of APIs and resources |
| **AI Integration** | Complete AI model integration |
| **Health Checks** | Built-in health monitoring |
| **Graceful Degradation** | Server continues running even if some APIs fail |
| **Error Recovery** | Automatic retry mechanism for failed initializations |

### Deployment Configuration

```bash
# Production environment variables
EASY_MCP_SERVER_PRODUCTION_MODE=true
EASY_MCP_SERVER_LOG_LEVEL=info
EASY_MCP_SERVER_QUIET=false
```

### Health Monitoring

- ✅ **Server stays running** even if some APIs fail to initialize
- ✅ **Failed APIs return 503** with helpful error messages
- ✅ **Automatic retry mechanism** for failed initializations
- ✅ **Enhanced health checks** showing API status

---

## **Troubleshooting Guide**

### Common Issues

1. **Port conflicts**: Use `EASY_MCP_SERVER_PORT=8888` to set different port
2. **APIs not working**: Check file paths and HTTP method naming
3. **AI features not showing**: Ensure files are in `mcp/prompts/` and `mcp/resources/` directories
4. **Hot reload not working**: Hot reload is enabled by default in development. It's only disabled when `EASY_MCP_SERVER_PRODUCTION_MODE=true`

### Quick Test

```bash
# Test server health
curl http://localhost:8887/health

# Test AI features
curl -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Test hot reload
echo 'console.log("Hot reload test");' >> api/test.js
# Check server logs for hot reload messages
```

### Debug Mode

```bash
EASY_MCP_SERVER_LOG_LEVEL=debug npx easy-mcp-server
```

### MCP Bridge Tool Issues

**Problem**: Bridge MCP servers returning "Tool not found" errors
```
-32602 error, Tool not found: chrome_new_page
```

**Root Cause**: Tool name prefix conflicts between easy-mcp-server and bridge servers

**Solution**: Use original tool names from bridge MCP servers without prefixes

**Example**:
- ✅ Correct: `new_page` (original tool name)
- ❌ Incorrect: `chrome_new_page` (with prefix)

---

## **MCP Specification Compliance**

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

### prompts/get Response

#### Required Structure
```json
{
  "jsonrpc": "2.0",
  "id": <id>,
  "result": {
    "messages": [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "..."
        }
      }
    ]
  }
}
```

**Status**: ✅ **COMPLIANT** - Follows exact MCP specification format.

### resources/read Response

#### Required Structure
```json
{
  "jsonrpc": "2.0",
  "id": <id>,
  "result": {
    "contents": [
      {
        "uri": "resource://...",
        "mimeType": "text/markdown",
        "text": "..."
      }
    ]
  }
}
```

**Status**: ✅ **COMPLIANT** - Follows exact MCP specification format.

### tools/call Response

#### Required Structure
```json
{
  "jsonrpc": "2.0",
  "id": <id>,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "..."
      }
    ]
  }
}
```

**Status**: ✅ **COMPLIANT** - Follows exact MCP specification format.

### JSON Schema Compliance

#### inputSchema Requirements
- ✅ Must be valid JSON Schema Draft 2020-12
- ✅ Must have `type: "object"`
- ✅ Must have `properties` object
- ✅ May have `required` array
- ✅ Nested objects must have `properties` field
- ✅ Arrays must have `items` field

#### responseSchema Requirements
- ✅ Optional field (per MCP spec)
- ✅ When present, must be valid JSON Schema Draft 2020-12
- ✅ Normalized to ensure nested structures are valid

### Compliance Summary

✅ **All MCP endpoints are compliant with the specification:**
- JSON-RPC 2.0 format correctly implemented
- Required fields present in all responses
- Optional recommended fields included
- Additional metadata fields allowed by spec
- JSON Schema validation ensures proper structure
- Error handling follows JSON-RPC 2.0 error format

### MCP Specification Details

#### Description vs Summary

According to MCP best practices and technical specifications:

**Summary**
- **Purpose**: Brief overview for quick scanning
- **Length**: Short, concise (typically one sentence)
- **Use Case**: When users need to quickly understand what a tool does
- **Example**: "List products" or "Create a new user"

**Description**
- **Purpose**: Detailed explanation for full understanding
- **Length**: Longer, comprehensive (can be multiple sentences)
- **Use Case**: When users need complete information about functionality, parameters, and behavior
- **Example**: "List products with optional limit. Returns an array of product records filtered by the specified limit parameter."

#### MCP Tool Schema Requirements

MCP tools should include:

1. **name** (required): Unique identifier for the tool
2. **description** (required): Detailed explanation of the tool
3. **summary** (recommended): Brief overview of the tool
4. **inputSchema** (required): JSON Schema for input parameters
5. **responseSchema** (optional): JSON Schema for response structure

#### Response Schema Status

According to MCP specification:
- **responseSchema is OPTIONAL** - not required by the protocol
- **Bridge tools** may not provide responseSchema if the external MCP server doesn't include it
- **API tools** typically include responseSchema derived from OpenAPI response definitions
- When available, responseSchema helps AI models understand the expected output format
- When not available, it's acceptable to omit the field or set it to `null`

**Implementation Decision:**
- API tools: Include responseSchema when available from OpenAPI definitions
- Bridge tools: Preserve responseSchema if provided by the external MCP server, otherwise `null` (optional)

#### Implementation Best Practices

✅ Both `summary` and `description` are included in tool definitions
✅ `summary` is brief and suitable for quick scanning
✅ `description` provides detailed information
✅ Fallback logic ensures tools always have descriptions

### MCP Specification References

- **MCP Specification**: https://modelcontextprotocol.io
- **JSON-RPC 2.0 Specification**: https://www.jsonrpc.net/specification
- **JSON Schema Draft 2020-12**: https://json-schema.org/specification.html
- **Protocol Version**: 2024-11-05

---

## **Scripts & Utilities**

### list-mcp-info.js

Lists all MCP tools, resources, prompts and their details.

#### Usage

```bash
# Basic usage (connects to localhost:8888)
npm run mcp:list

# Or directly
node scripts/list-mcp-info.js

# With options
node scripts/list-mcp-info.js --host localhost --port 8888 --format detailed

# Save to file
node scripts/list-mcp-info.js --format json --output mcp-info.json
```

#### Options

- `--host <host>` - MCP server host (default: localhost)
- `--port <port>` - MCP server port (default: 8888 or EASY_MCP_SERVER_MCP_PORT)
- `--transport <type>` - Transport type: `http`, `ws`, or `auto` (default: auto)
- `--format <format>` - Output format: `json`, `table`, or `detailed` (default: detailed)
- `--output <file>` - Save output to file (optional)
- `--help` or `-h` - Show help message

#### Examples

```bash
# Get detailed information
node scripts/list-mcp-info.js --format detailed

# Get JSON output
node scripts/list-mcp-info.js --format json

# Save JSON to file
node scripts/list-mcp-info.js --format json --output mcp-info.json

# Connect to remote server
node scripts/list-mcp-info.js --host example.com --port 8888

# Force WebSocket transport
node scripts/list-mcp-info.js --transport ws
```

#### Output Formats

- **detailed** (default): Human-readable detailed format with all information
- **table**: Compact table format
- **json**: JSON format for programmatic use

---

### Validation Tools

easy-mcp-server includes comprehensive validation tools to ensure compliance with OpenAPI 3.0 and MCP 2024-11-05 specifications.

#### Quick Validation

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

#### OpenAPI Validator

Validates that generated API specifications comply with OpenAPI 3.0.0 standards.

```bash
# Validate default API path
npm run validate:openapi

# Validate custom API path
node scripts/validate-openapi.js /path/to/api
```

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

#### MCP Validator (Static)

Analyzes code structure to verify MCP protocol compliance (no server required).

```bash
npm run validate:mcp:static
```

**What it validates:**
- ✅ JSON-RPC 2.0 protocol usage
- ✅ Required MCP methods (tools, prompts, resources)
- ✅ Error code standards
- ✅ Response format compliance
- ✅ Domain processor architecture
- ✅ Notification support

**Result:** 100% MCP 2024-11-05 Specification Compliance

#### MCP Validator (Runtime)

Tests actual MCP requests and responses (requires running server).

```bash
# Start server first
cd example-project && ./start.sh

# Then validate
npm run validate:mcp
```

**What it tests:**
- ✅ tools/list, tools/call
- ✅ prompts/list, prompts/get
- ✅ resources/list, resources/read
- ✅ Error handling
- ✅ JSON-RPC 2.0 compliance

#### Detailed Documentation

For complete validation documentation, see [docs/VALIDATION.md](docs/VALIDATION.md)

**Topics covered:**
- Validation tool usage
- CI/CD integration
- Troubleshooting guide
- Best practices
- Compliance reports

---

## **Changelog**

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.0.111](https://github.com/easynet-world/7134-easy-mcp-server/compare/v1.0.110...v1.0.111) (2024-10-09)

#### Features

* **AI-Era Positioning**: Enhanced project positioning as "AI-era Express replacement"
* **Documentation Cleanup**: Streamlined to only README.md and DEVELOPMENT.md
* **English-Only**: Removed all Chinese content, ensuring English-only documentation
* **Express Migration Guide**: Comprehensive migration documentation from Express to easy-mcp-server

#### Documentation

* **README.md**: Updated with AI-era warnings and Express comparison
* **DEVELOPMENT.md**: Enhanced developer guide with AI-era principles
* **Migration Examples**: Added code examples showing Express vs easy-mcp-server
* **Efficiency Claims**: Documented 420x development speed improvement

#### Refactoring

* **Documentation Structure**: Simplified to essential files only
* **Content Localization**: Ensured all content is in English
* **Positioning**: Strengthened "Express replacement" messaging

#### Tests

* **Comprehensive Testing**: All 450 tests passing
* **Code Quality**: ESLint passing with no errors
* **API Loading**: Core functionality verified
* **MCP Integration**: Bridge tools and schema extraction working

---

## **Documentation Resources**

| Document | Purpose | Best For |
|----------|---------|----------|
| **[Example Project](example-project/)** | Complete working example with users/products APIs, AI integration, and JSDoc annotations | Learning by example, best practices reference |
| **[LLM Context](LLM.txt)** | LLM-specific information and context for AI model integration | AI model integration |

---

## **Contributing Guidelines**

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## **Support & Resources**

- **Issues**: [GitHub Issues](https://github.com/easynet-world/7134-easy-mcp-server/issues)
- **Example Project**: Complete working example in `example-project/` directory with users/products APIs, dynamic routes, AI integration, and JSDoc annotations

---

## **License Information**

MIT License - see [package.json](package.json) for license details.
