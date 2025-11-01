# Source Code Organization

This directory contains the source code for the Easy MCP Server, organized by functionality.

## Directory Structure

```
src/
├── app/                         # Application entry points
│   └── server.js                # Express server application
│
├── core/                        # Core functionality
│   ├── api-loader.js           # Dynamic API discovery and loading
│   ├── base-api.js             # Base API class for endpoints
│   ├── dynamic-api-server.js   # Dynamic API server
│   └── openapi-generator.js    # OpenAPI specification generator
│
├── lib/                        # Library modules
│   ├── api/                    # API-related libraries
│   │   ├── api-response-utils.js    # API response utilities
│   │   └── base-api-enhanced.js      # Enhanced base API with LLM integration
│   └── llm/                    # LLM-related libraries
│       └── llm-service.js      # LLM service provider
│
├── mcp/                        # MCP (Model Context Protocol) Server
│   ├── core/                   # Core MCP server
│   ├── handlers/               # Request handlers
│   ├── processors/             # Request processors
│   ├── builders/               # Builders
│   ├── executors/              # Executors
│   ├── utils/                  # MCP utilities
│   ├── index.js                # MCP module entry point
│   └── README.md               # MCP module documentation
│
├── utils/                      # Utility modules
│   ├── api/                    # API-related utilities
│   │   └── openapi-helper.js   # OpenAPI helper functions
│   ├── mcp/                    # MCP-related utilities
│   │   ├── mcp-bridge.js              # MCP bridge client
│   │   ├── mcp-bridge-reloader.js      # MCP bridge hot reloader
│   │   ├── mcp-cache-manager.js       # MCP cache manager
│   │   └── mcp-schema-adapter.js      # MCP schema adapter
│   ├── dev/                    # Development utilities
│   │   ├── package-detector.js # Package detection
│   │   └── package-installer.js # Package installation
│   ├── annotation-parser.js    # Annotation parsing
│   ├── env-hot-reloader.js     # Environment variable hot reloader
│   ├── hot-reloader.js         # Hot reloader for APIs
│   ├── logger.js               # Logging utility
│   ├── parameter-template-parser.js  # Parameter template parsing
│   ├── resource-loader.js      # Resource loading
│   └── test-utils.js           # Test utilities
│
├── easy-mcp-server.js          # CLI entry point
└── README.md                   # This file
```

## Module Categories

### Application Layer (`app/`)
- **server.js**: Main Express application that ties together all components

### Core Layer (`core/`)
Core business logic and API management:
- **api-loader.js**: Discovers and loads API endpoints dynamically
- **base-api.js**: Base class for all API endpoints
- **dynamic-api-server.js**: Dynamic API server implementation
- **openapi-generator.js**: Generates OpenAPI specifications

### Library Layer (`lib/`)
Reusable library modules:
- **api/**: API-related utilities and enhanced base classes
- **llm/**: LLM service integration

### MCP Server (`mcp/`)
Complete MCP server implementation. See `mcp/README.md` for details.

### Utilities (`utils/`)
Helper modules organized by category:
- **api/**: OpenAPI-related helpers
- **mcp/**: MCP bridge and caching utilities
- **dev/**: Development-time utilities (package management)
- Root level: General utilities (logging, hot reloading, parsing, etc.)

## Module Dependencies

```
app/server.js
  ├─ core/api-loader.js
  ├─ core/openapi-generator.js
  ├─ mcp/
  ├─ utils/hot-reloader.js
  ├─ utils/env-hot-reloader.js
  └─ utils/mcp/mcp-bridge-reloader.js

core/api-loader.js
  ├─ utils/api/openapi-helper.js
  └─ core/base-api.js

mcp/core/mcp-server.js
  ├─ utils/mcp/mcp-cache-manager.js
  └─ (other mcp modules)

lib/api/base-api-enhanced.js
  ├─ lib/api/api-response-utils.js
  └─ lib/llm/llm-service.js
```

## Entry Points

1. **CLI**: `easy-mcp-server.js` - Command-line interface
2. **Server**: `app/server.js` - Express application server
3. **MCP**: `mcp/index.js` - MCP server module

## Best Practices

1. **Import Paths**: Always use relative paths from the importing file
2. **Module Boundaries**: Keep modules focused on a single responsibility
3. **Dependencies**: Avoid circular dependencies; use dependency injection when needed
4. **Utilities**: Place shared utilities in appropriate category folders
5. **Core vs Utils**: Core modules contain business logic; utils contain helper functions


