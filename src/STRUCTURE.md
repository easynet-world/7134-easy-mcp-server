# Source Code Structure

## Overview

The `src/` directory is organized into clear functional categories for better maintainability and code organization.

## Directory Structure

```
src/
├── app/                    # Application entry points
├── core/                   # Core business logic
├── lib/                    # Reusable library modules
├── mcp/                    # MCP Server implementation
├── utils/                  # Utility modules (categorized)
└── easy-mcp-server.js      # CLI entry point
```

## Detailed Organization

### 1. Application Layer (`app/`)
**Purpose**: Application entry points and server configurations

- `server.js` - Main Express server application that ties together all components

### 2. Core Layer (`core/`)
**Purpose**: Core business logic and API management

- `api-loader.js` - Dynamic API discovery and loading
- `base-api.js` - Base class for all API endpoints
- `dynamic-api-server.js` - Dynamic API server implementation
- `openapi-generator.js` - OpenAPI specification generator

### 3. Library Layer (`lib/`)
**Purpose**: Reusable library modules organized by domain

#### `lib/api/` - API-related libraries
- `api-response-utils.js` - API response formatting utilities
- `base-api-enhanced.js` - Enhanced base API with LLM integration

#### `lib/llm/` - LLM-related libraries
- `llm-service.js` - LLM service provider abstraction

### 4. MCP Server (`mcp/`)
**Purpose**: Complete MCP (Model Context Protocol) server implementation

See `mcp/README.md` for detailed documentation.

**Structure**:
- `core/` - Core MCP server
- `handlers/` - Request handlers (HTTP, WebSocket, Prompt, Resource)
- `processors/` - Request processors
- `builders/` - Tool builders
- `executors/` - Tool executors
- `utils/` - MCP-specific utilities

### 5. Utilities (`utils/`)
**Purpose**: Helper modules organized by category

#### `utils/api/` - API-related utilities
- `openapi-helper.js` - OpenAPI helper functions

#### `utils/mcp/` - MCP-related utilities
- `mcp-bridge.js` - MCP bridge client
- `mcp-bridge-reloader.js` - MCP bridge hot reloader
- `mcp-cache-manager.js` - MCP cache manager
- `mcp-schema-adapter.js` - MCP schema adapter

#### `utils/dev/` - Development utilities
- `package-detector.js` - Package detection
- `package-installer.js` - Package installation

#### Root level utilities
- `annotation-parser.js` - Annotation parsing
- `env-hot-reloader.js` - Environment variable hot reloader
- `hot-reloader.js` - Hot reloader for APIs
- `logger.js` - Logging utility
- `parameter-template-parser.js` - Parameter template parsing
- `resource-loader.js` - Resource loading
- `test-utils.js` - Test utilities

## File Counts

- **Total JavaScript files**: 35
- **Total lines of code**: ~15,000+ lines (distributed across modules)

## Module Dependencies

```
app/server.js
  ├── core/api-loader.js
  ├── core/openapi-generator.js
  ├── mcp/
  ├── utils/hot-reloader.js
  ├── utils/env-hot-reloader.js
  └── utils/mcp/mcp-bridge-reloader.js

core/api-loader.js
  ├── utils/api/openapi-helper.js
  └── core/base-api.js

lib/api/base-api-enhanced.js
  ├── core/base-api.js
  ├── lib/api/api-response-utils.js
  └── lib/llm/llm-service.js

mcp/core/mcp-server.js
  ├── utils/mcp/mcp-cache-manager.js
  └── (other mcp modules)
```

## Import Path Conventions

1. **From app/**: Use `../` to go up to `src/`, then navigate to target
2. **From core/**: Use `../utils/` for utilities
3. **From lib/**: Use `../../core/` for core, `../../utils/` for utilities
4. **From mcp/**: Use `../../utils/mcp/` for MCP utilities
5. **From utils/**: Use `../` for other utils, `../core/` for core

## Best Practices

1. ✅ **Single Responsibility**: Each module has a clear, focused purpose
2. ✅ **Clear Boundaries**: Core, lib, utils, and mcp are well-separated
3. ✅ **Categorized Utils**: Utilities are organized by domain (api, mcp, dev)
4. ✅ **No Circular Dependencies**: Dependencies flow from high-level to low-level
5. ✅ **Consistent Naming**: Files use kebab-case, classes use PascalCase


