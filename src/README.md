# Source Code

This directory contains the source code for the Easy MCP Server framework.

## Quick Navigation

- **API Core**: [`api/`](./api/) - Core business logic and API management
- **MCP Server**: [`mcp/`](./mcp/) - Model Context Protocol server implementation
- **Utilities**: [`utils/`](./utils/) - Helper utilities organized by category
- **Documentation**: [`docs/`](./docs/) - Directory structure reference

## Entry Points

- **CLI**: [`easy-mcp-server.js`](./easy-mcp-server.js) - Command-line interface
- **Module**: [`index.js`](./index.js) - Main module exports
- **Orchestrator**: [`orchestrator.js`](./orchestrator.js) - Coordinates API and MCP servers

## Documentation

For detailed documentation about the source code structure and organization, see:
- [Root README.md](../../README.md) - Complete project documentation (includes architecture, source structure, and MCP module details)
- [`docs/DIRECTORY_STRUCTURE.txt`](./docs/DIRECTORY_STRUCTURE.txt) - Directory structure reference

## Module Categories

### API Core Layer (`api/`)
Core business logic: API response utilities, base classes (including enhanced version), API server, OpenAPI generation and helpers.

### MCP Server (`mcp/`)
Complete MCP (Model Context Protocol) server implementation with handlers, processors, builders, and executors.

### Utilities (`utils/`)
Helper modules organized by category:
- `llm/` - LLM utilities (service provider abstractions and implementations)
- `loaders/` - Loader utilities (API loading, hot reload, env reload, resource loading, bridge reload)
- `parsers/` - Parser utilities (JSDoc annotation parsing, parameter template parsing)
- `dev/` - Development utilities (package management)
- Root level - General utilities (logging, test utilities)

