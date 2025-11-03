# easy-mcp-server

<h2>The easiest way to build MCP</h2>

[![npm version](https://img.shields.io/npm/v/easy-mcp-server.svg)](https://www.npmjs.com/package/easy-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AI-Ready](https://img.shields.io/badge/AI-Ready-brightgreen.svg)](https://modelcontextprotocol.io)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)
[![OpenAPI 3.0](https://img.shields.io/badge/OpenAPI-3.0-green.svg)](https://www.openapis.org/)
[![Swagger](https://img.shields.io/badge/Swagger-UI-brightgreen.svg)](https://swagger.io/)

**Write code once → Get REST API + OpenAPI + Swagger + MCP tools automatically**

---

## What We Are Providing

| Feature | Description | Benefit |
|---------|-------------|---------|
| **MCP Server** 🤖 | Your API endpoints automatically become MCP tools for AI agents | Connect your APIs to AI models instantly |
| **REST API** | Automatic REST endpoints from file structure | No routing configuration needed |
| **OpenAPI Spec** | Auto-generated OpenAPI 3.0 specification | Standard API documentation format |
| **Swagger UI** | Interactive API documentation | Test APIs directly in browser |
| **MCP Bridge** | Built-in bridge to external MCP servers | Access Chrome DevTools, iTerm, and more |
| **Hot Reload** | Instant file changes without restart | Faster development workflow |
| **Auto Schema** | Request/Response classes → JSON schemas | Type-safe API definitions |
| **Zero Config** | Convention over configuration | Start coding immediately |

---

## 🚀 Quick Start

### 1. Setup

```bash
npx easy-mcp-server init my-api-project
cd my-api-project
npm install
./start.sh
```

**That's it!** Your services are running:

| Service | URL |
|---------|-----|
| **MCP Server** 🤖 | http://localhost:8888 |
| **REST API** | http://localhost:8887 |
| **Swagger UI** | http://localhost:8887/docs |
| **OpenAPI Spec** | http://localhost:8887/openapi.json |

### 2. Write Your First Endpoint

**POST Endpoint Example:**
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

**What you get automatically:**
- ✅ MCP tool for AI agents
- ✅ REST endpoint: `POST /users`
- ✅ Swagger UI documentation
- ✅ OpenAPI specification
- ✅ Hot reload (changes apply instantly)

---

## ✨ How It Works

### File Structure → API Endpoints

| File Path | HTTP Method | API Endpoint |
|-----------|-------------|--------------|
| `api/users/get.js` | GET | `/users` |
| `api/users/post.js` | POST | `/users` |
| `api/products/[id]/get.js` | GET | `/products/:id` |

### Code Annotations → Documentation

| Annotation | Purpose | Example |
|------------|---------|---------|
| `@description` | API description | `@description('Get user information')` |
| `@summary` | Brief summary | `@summary('Get user')` |
| `@tags` | Categorization | `@tags('users,data-access')` |
| `Request` class | Request schema | Auto-generated from class properties |
| `Response` class | Response schema | Auto-generated from class properties |

**Result:**
- 🤖 **MCP Server** - AI agents can use your endpoints as tools
- 🚀 **REST API** - Standard HTTP endpoints
- 📚 **Swagger UI** - Interactive documentation
- 📄 **OpenAPI** - Machine-readable specification

---

## 🔌 MCP Bridge (Built-in)

**Connect to external MCP servers without configuration.**

| Bridge Server | Capabilities | Use Cases |
|---------------|--------------|-----------|
| **Chrome MCP** 🌐 | Browser automation, web operations | Navigate pages, click elements, take screenshots, test web apps |
| **iTerm MCP** 💻 | Terminal & system operations | Execute commands, system diagnostics, server operations |

**Access:** Your AI agents use these tools via MCP server at `http://localhost:8888`

**Configuration:** Managed via `mcp-bridge.json` (included by default)

> 📖 **For detailed bridge configuration and advanced setup, see [Development Guide - MCP Bridge](docs/DEVELOPMENT.md#mcp-bridge-configuration)**

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

| Your Code | → | Generated Output |
|-----------|---|------------------|
| `api/users/get.js` | → | `GET /users` |
| `@description` annotation | → | API description |
| `Request` class | → | Request schema |
| `Response` class | → | Response schema |

**One codebase = Everything you need**

---

## 🔧 Configuration

### Environment Variables

All environment variables are prefixed with `EASY_MCP_SERVER_`:

| Variable | Default | Description |
|----------|---------|-------------|
| `EASY_MCP_SERVER_PORT` | 8887 | REST API port |
| `EASY_MCP_SERVER_MCP_PORT` | 8888 | MCP server port |
| `EASY_MCP_SERVER_LOG_LEVEL` | info | Logging level (debug, info, warn, error) |

**Example:**
```bash
EASY_MCP_SERVER_PORT=8887
EASY_MCP_SERVER_MCP_PORT=8888
EASY_MCP_SERVER_LOG_LEVEL=info
```

> 📖 **For complete configuration options, see [Development Guide - Configuration](docs/DEVELOPMENT.md#configuration-management)**

---

## 📚 Documentation

| Resource | Description | Link |
|----------|-------------|------|
| **Development Guide** | Complete technical documentation, architecture, API reference | [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) |
| **Example Project** | Working example with sample endpoints | `example-project/` directory |
| **Swagger UI** | Interactive API documentation | http://localhost:8887/docs |
| **OpenAPI Spec** | Machine-readable API specification | http://localhost:8887/openapi.json |

---

## 💼 Business & Support

### Services We Provide

| Service | Description |
|---------|-------------|
| **AI Quick Onboarding** 🚀 | Fast-track setup and integration of AI/MCP solutions for your business |
| **AI Consultant** 💡 | Expert guidance on AI integration, MCP architecture, and best practices |

### Contact Us

| Inquiry Type | Contact |
|--------------|---------|
| **Business Discussion** | info@easynet.world |
| **Customer Support** | info@easynet.world |
| **AI Consulting** | info@easynet.world |

---

## 👤 Maintainer

| Role | Name | Contact |
|------|------|---------|
| **Code Owner** | Boqiang Liang | boqiang.liang@easynet.world |

---

## 🤝 Contributing

| Step | Action |
|------|--------|
| 1. Fork | Fork the repository |
| 2. Branch | Create feature branch |
| 3. Commit | Commit your changes |
| 4. Push | Push to branch |
| 5. PR | Open Pull Request |

> 📖 **For detailed contribution guidelines, see [Development Guide - Contributing](docs/DEVELOPMENT.md#contributing)**

---

## 📄 License

MIT License - see [package.json](package.json) for license details.

---

## 🔍 Need More Details?

| Topic | Documentation |
|-------|---------------|
| Architecture & Design | [Development Guide - Architecture](docs/DEVELOPMENT.md#architecture-overview) |
| JSDoc Annotations | [Development Guide - Annotations](docs/DEVELOPMENT.md#jsdoc-annotations) |
| MCP Protocol Details | [Development Guide - MCP Module](docs/DEVELOPMENT.md#mcp-module-architecture) |
| OpenAPI Generation | [Development Guide - OpenAPI](docs/DEVELOPMENT.md#openapi-generation) |
| Testing | [Development Guide - Testing](docs/DEVELOPMENT.md#testing) |
| Troubleshooting | [Development Guide - Troubleshooting](docs/DEVELOPMENT.md#troubleshooting) |
