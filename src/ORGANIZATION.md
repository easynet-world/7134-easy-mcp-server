# Source Code Organization Guide

## Directory Structure Overview

The `src/` directory is organized into clear functional categories for maximum maintainability:

```
src/
├── app/                    # Application entry points
│   └── server.js           # Express server application
│
├── core/                   # Core business logic
│   ├── api-loader.js       # Dynamic API discovery
│   ├── base-api.js         # Base API class
│   ├── dynamic-api-server.js  # Dynamic API server
│   └── openapi-generator.js   # OpenAPI generator
│
├── lib/                    # Reusable libraries
│   ├── api/                # API libraries
│   │   ├── api-response-utils.js
│   │   └── base-api-enhanced.js
│   └── llm/                # LLM libraries
│       └── llm-service.js
│
├── mcp/                    # MCP Server (see mcp/README.md)
│   ├── core/               # MCP core
│   ├── handlers/           # Request handlers
│   ├── processors/         # Request processors
│   ├── builders/           # Tool builders
│   ├── executors/          # Tool executors
│   ├── utils/              # MCP utilities
│   └── index.js            # MCP entry point
│
├── utils/                  # Utility modules
│   ├── api/                # API utilities
│   │   └── openapi-helper.js
│   ├── mcp/                # MCP utilities
│   │   ├── mcp-bridge.js
│   │   ├── mcp-bridge-reloader.js
│   │   ├── mcp-cache-manager.js
│   │   └── mcp-schema-adapter.js
│   ├── dev/                # Development utilities
│   │   ├── package-detector.js
│   │   └── package-installer.js
│   └── (root level)        # General utilities
│
├── easy-mcp-server.js      # CLI entry point
├── index.js                 # Module exports
├── README.md                # Documentation
├── STRUCTURE.md             # Detailed structure
└── ORGANIZATION.md         # This file
```

## Organization Principles

### 1. **Separation by Layer**
- **app/**: Application-level code (server setup, routing)
- **core/**: Core business logic (API management, OpenAPI)
- **lib/**: Reusable library modules
- **mcp/**: MCP server implementation
- **utils/**: Helper utilities

### 2. **Categorized Utilities**
Utilities are organized by domain:
- `utils/api/` - API-related helpers
- `utils/mcp/` - MCP bridge and caching
- `utils/dev/` - Development tools

### 3. **Clear Module Boundaries**
- Each directory has a single, clear purpose
- Modules within a directory are closely related
- Cross-directory dependencies are minimal and explicit

### 4. **Consistent Naming**
- Files: `kebab-case.js`
- Classes: `PascalCase`
- Directories: `kebab-case` or simple names

## Module Dependencies

### High-Level Flow
```
app/server.js
  ↓
  ├─ core/api-loader.js
  ├─ core/openapi-generator.js
  ├─ mcp/ (via index.js)
  └─ utils/* (hot-reload, env-reload, etc.)

mcp/core/mcp-server.js
  ↓
  ├─ utils/mcp/mcp-cache-manager.js
  └─ mcp/* (internal modules)

lib/api/base-api-enhanced.js
  ↓
  ├─ core/base-api.js
  ├─ lib/api/api-response-utils.js
  └─ lib/llm/llm-service.js
```

### Dependency Rules
1. **Core** modules should not depend on **app/** or **lib/**
2. **Utils** can be used by any module
3. **MCP** modules can depend on **utils/mcp/** and **utils/api/**
4. **Lib** modules can depend on **core/** and **utils/**

## Import Path Conventions

### From Different Locations

**From `app/server.js`**:
```javascript
const APILoader = require('../core/api-loader');
const HotReloader = require('../utils/hot-reloader');
```

**From `core/api-loader.js`**:
```javascript
const { apiSpecTs } = require('../utils/api/openapi-helper');
```

**From `lib/api/base-api-enhanced.js`**:
```javascript
const BaseAPI = require('../../core/base-api');
const Logger = require('../../utils/logger');
```

**From `mcp/core/mcp-server.js`**:
```javascript
const MCPCacheManager = require('../../utils/mcp/mcp-cache-manager');
const SchemaNormalizer = require('../utils/schema-normalizer');
```

**From `utils/hot-reloader.js`**:
```javascript
const PackageInstaller = require('./dev/package-installer');
```

## File Counts

- **Total directories**: 17
- **Total JavaScript files**: 36
- **Total lines of code**: ~14,343 lines

## Entry Points

1. **CLI**: `src/easy-mcp-server.js`
2. **Server**: `src/app/server.js`
3. **MCP Module**: `src/mcp/index.js`
4. **Package Main**: `index.js` → `src/index.js`

## Best Practices

1. ✅ **Keep modules focused** - One responsibility per module
2. ✅ **Use appropriate directories** - Don't mix concerns
3. ✅ **Maintain clear boundaries** - Respect layer separation
4. ✅ **Document dependencies** - Keep cross-module dependencies explicit
5. ✅ **Follow naming conventions** - Consistent naming helps navigation
6. ✅ **Group related utilities** - Use subdirectories for utility categories

## Migration Notes

If you're updating imports after this reorganization:

- `src/server.js` → `src/app/server.js`
- `src/utils/mcp-*.js` → `src/utils/mcp/mcp-*.js`
- `src/utils/openapi-helper.js` → `src/utils/api/openapi-helper.js`
- `src/utils/package-*.js` → `src/utils/dev/package-*.js`
- `src/lib/api-response-utils.js` → `src/lib/api/api-response-utils.js`
- `src/lib/base-api-enhanced.js` → `src/lib/api/base-api-enhanced.js`
- `src/lib/llm-service.js` → `src/lib/llm/llm-service.js`


