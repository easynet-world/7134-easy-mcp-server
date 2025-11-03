<p align="center">
  <img src="images/easy-mcp-server.jpg" alt="easy-mcp-server logo" width="100%">
</p>

[![npm version](https://img.shields.io/npm/v/easy-mcp-server.svg)](https://www.npmjs.com/package/easy-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AI-Ready](https://img.shields.io/badge/AI-Ready-brightgreen.svg)](https://modelcontextprotocol.io)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)
[![OpenAPI 3.0](https://img.shields.io/badge/OpenAPI-3.0-green.svg)](https://www.openapis.org/)
[![Hot Reload](https://img.shields.io/badge/Hot-Reload-purple.svg)](https://github.com/easynet-world/7134-easy-mcp-server)

**Write code once, get everything automatically: REST API + OpenAPI + Swagger + MCP Tools + n8n Nodes**

---

## What is easy-mcp-server?

A professional framework that transforms your API code into multiple integrations automatically. Write your endpoint once, and instantly get:

- **MCP Tools** - AI agent integration (Claude, GPT, etc.)
- **REST API** - Standard HTTP endpoints
- **OpenAPI Spec** - Industry-standard documentation
- **Swagger UI** - Interactive API testing
- **n8n Nodes** - Workflow automation integration

Zero configuration. Convention-based. Production-ready.

---

## Quick Start

### Install and Run

```bash
npx easy-mcp-server init my-project
cd my-project
npm install
./start.sh
```

Your services are now running at:
- MCP Server: http://localhost:8888
- REST API: http://localhost:8887
- Swagger UI: http://localhost:8887/docs
- OpenAPI Spec: http://localhost:8887/openapi.json

### Write Your First Endpoint

Create `api/users/post.js`:

```javascript
class Request {
  // @description('User name')
  name: string;

  // @description('User email')
  email: string;
}

class Response {
  success: boolean;
  id: string;
}

// @description('Create a new user')
// @summary('Create user')
function handler(req, res) {
  const { name, email } = req.body;
  res.json({ success: true, id: '123' });
}

module.exports = handler;
```

**You automatically get:**
- MCP tool for AI agents
- REST endpoint: `POST /users`
- Swagger documentation
- OpenAPI specification
- n8n node (on demand)
- Hot reload

---

## Key Features

### MCP Bridge

Access external MCP servers (Chrome DevTools, iTerm2, etc.) through your MCP server. Configure via `mcp-bridge.json`.

### File-Based Routing
```
api/users/get.js       →  GET /users
api/users/post.js      →  POST /users
api/users/[id]/get.js  →  GET /users/:id
```

### n8n Node Generation

Generate workflow automation nodes from your APIs:

```bash
npm run n8n:generate
```

Creates a complete n8n community node package ready to publish or install locally.

---

## Visual Overview

![MCP Generation](docs/to-mcp.png)
*API endpoints automatically become MCP tools*

![OpenAPI Generation](docs/to-openapi.png)
*Code automatically generates OpenAPI specification*

![Swagger Generation](docs/to-swagger.png)
*Interactive Swagger UI generated automatically*

---

## Why Choose easy-mcp-server?

| Traditional Approach | With easy-mcp-server |
|---------------------|---------------------|
| Manual Express routing | File-based auto-routing |
| Hand-written OpenAPI specs | Auto-generated from code |
| Separate MCP tool development | Automatic integration |
| Manual n8n node coding | One-command generation |
| Multiple codebases to maintain | Single source of truth |
| Manual documentation updates | Always synchronized |

### Use Cases

- **AI Integration**: Connect APIs to Claude, GPT, and MCP-compatible AI agents
- **Workflow Automation**: Generate n8n nodes for visual workflow builders
- **API Development**: Rapid REST API development with auto-documentation
- **Enterprise Integration**: Single codebase for multiple platforms

---

## Configuration

Basic configuration via environment variables:

```bash
EASY_MCP_SERVER_MCP_PORT=8888      # MCP server port
EASY_MCP_SERVER_PORT=8887          # REST API port
EASY_MCP_SERVER_LOG_LEVEL=info     # Logging level
```

For complete configuration options, see the [Development Guide](docs/DEVELOPMENT.md#configuration-management).

---

## Documentation

- **[Development Guide](docs/DEVELOPMENT.md)** - Complete technical documentation, architecture, and API reference
- **MCP Server** - http://localhost:8888 (when server is running)
- **Swagger UI** - http://localhost:8887/docs (when server is running)
- **OpenAPI Spec** - http://localhost:8887/openapi.json (when server is running)
- **Example Project** - See `example-project/` directory

---

## Support & Services

**Professional Services:**
- AI Quick Onboarding - Fast-track AI/MCP integration
- AI Consulting - Expert guidance on architecture and best practices

**Contact:** info@easynet.world

---

## Contributing

Contributions welcome! Please see our [Development Guide](docs/DEVELOPMENT.md#contributing) for details.

---

## License

MIT License - see [package.json](package.json) for details.

---

**Maintainer:** Boqiang Liang (boqiang.liang@easynet.world)
