# easy-mcp-server

> **Write code once → Get REST API + OpenAPI + Swagger + MCP tools automatically**

## 🚀 Quick Start

### 1. Setup

```bash
npx easy-mcp-server init my-api-project
cd my-api-project
npm install
./start.sh
```

**That's it!** Your API is running at **http://localhost:8887** 🎉

### 2. Write Your First Endpoint

**GET Endpoint (Query Parameters):**
```javascript
// api/users/get.js
class Request {
  // @description('Filter by active status')
  active: boolean;
}

class Response {
  users: Array<{
    id: number;
    name: string;
    email: string;
  }>;
}

// @description('Get all users with optional filter')
// @summary('List users')
// @tags('users')
function handler(req: any, res: any) {
  const { active } = req.query;
  res.json({ 
    users: [{ id: 1, name: 'John', email: 'john@example.com' }] 
  });
}

module.exports = handler;
```

**POST Endpoint (Request Body):**
```javascript
// api/users/post.js
class Request {
  // @description('User name')
  name: string;
  
  // @description('User email')
  email: string;
}

class Response {
  success: boolean;
  id: string;
  name: string;
  email: string;
}

// @description('Create a new user')
// @summary('Create user')
// @tags('users')
function handler(req: any, res: any) {
  const { name, email } = req.body;
  res.json({ 
    success: true, 
    id: '123', 
    name, 
    email 
  });
}

module.exports = handler;
```

**What you get:**
- ✅ REST API endpoints (automatic from file structure)
- ✅ Swagger UI at `/docs` (auto-generated)
- ✅ OpenAPI spec at `/openapi.json` (auto-generated)
- ✅ MCP tools for AI agents (automatic)
- ✅ **MCP Bridge** - Connect to external MCP servers (included by default: Chrome MCP for browser automation & iTerm MCP for system operations)
- ✅ Hot reload enabled (save and see changes instantly)

[![npm version](https://img.shields.io/npm/v/easy-mcp-server.svg)](https://www.npmjs.com/package/easy-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AI-Ready](https://img.shields.io/badge/AI-Ready-brightgreen.svg)](https://modelcontextprotocol.io)

---

## ✨ How It Works

**File Structure** → **API Endpoints:**
```
api/users/get.js           → GET /users
api/users/post.js          → POST /users
api/products/[id]/get.js  → GET /products/:id
```

**Annotations** → **Documentation:**
- `@description` → API description
- `@tags` → API categories
- Request/Response classes → Auto-generated schemas

**Result:**
- 🚀 REST API endpoints
- 📚 Swagger UI documentation
- 📄 OpenAPI specification
- 🤖 MCP tools for AI agents

---

## 🔌 MCP Bridge (Built-in)

**Native MCP Bridge Support** - Connect to external MCP servers without configuration.

**Included by Default:**
- 🌐 **Chrome MCP** - Browser automation & web operations
  - Navigate pages, click elements, fill forms
  - Take screenshots, inspect DOM
  - Test web applications
  - Access internet and web content

- 💻 **iTerm MCP** - Terminal & system operations
  - Execute terminal commands
  - Read/write terminal output
  - System diagnostics and monitoring
  - Server operations and deployment

**Access via MCP Protocol:**
Your AI agents can use these tools through the MCP server at `http://localhost:8888`

**Configuration:**
Managed via `mcp-bridge.json` (automatically included with `init` command)

---

## 📊 Visual Overview

### From Code to Everything

![MCP Generation](docs/to-mcp.png)
*API endpoints automatically become MCP tools*

![OpenAPI Generation](docs/to-openapi.png)
*Code automatically generates OpenAPI specification*

![Swagger Generation](docs/to-swagger.png)
*Interactive Swagger UI generated automatically*

---

## 🎯 Core Concept

```
Your Code                  →        Generated
───────────────────────────────────────────
File: api/users/get.js     →   GET /users
@description annotation    →   API description
Request class              →   Request schema
Response class             →   Response schema
```

**One codebase = Everything you need**

---

## 🔗 Service Endpoints

After starting, access:

| Service | URL |
|---------|-----|
| **REST API** | http://localhost:8887 |
| **Swagger UI** | http://localhost:8887/docs |
| **OpenAPI Spec** | http://localhost:8887/openapi.json |
| **MCP Server** | http://localhost:8888 |

---

## 🔧 Configuration

**Environment Variables** (all prefixed with `EASY_MCP_SERVER_`):

```bash
EASY_MCP_SERVER_PORT=8887      # REST API port
EASY_MCP_SERVER_MCP_PORT=8888  # MCP server port
EASY_MCP_SERVER_LOG_LEVEL=info # Logging level
```

---

## 📚 Documentation

- **📖 [Development Guide](docs/DEVELOPMENT.md)** - Complete technical documentation
- **Example Project** - See `example-project/` directory

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit your changes
4. Push to branch
5. Open Pull Request

---

## 📄 License

MIT License - see [package.json](package.json)
