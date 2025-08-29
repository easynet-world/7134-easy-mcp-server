# Easy MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

> **🎯 Write ONE function → Get THREE interfaces automatically**  
> **REST API + MCP Tool + OpenAPI Documentation**

---

# 🚀 **Quick Start (30 seconds)**

## 1. Install

```bash
npm install easy-mcp-server
```

## 2. Create your first API
mkdir -p api/hello

```javascript
// api/hello/get.js`

const { BaseAPI } = require('easy-mcp-server');

class HelloWorld extends BaseAPI {
  process(req, res) {
    res.json({ message: "Hello World!" });
  }

  get description() {
    return 'Returns a simple greeting message';
  }
}

module.exports = HelloWorld;
```
## 3. Start server
```bash
npm start
```

## 🎉 That's it! You now have:

**✅ What You Get:**
- **REST API**: `GET /hello` → `{"message": "Hello World!"}` at `http://localhost:3000`
- **MCP Tool**: `get_hello` available to AI models at `ws://localhost:3001`
- **OpenAPI Docs**: Complete documentation at `http://localhost:3000/openapi.json`
- **Swagger UI**: Interactive docs at `http://localhost:3000/docs` ✨


**🎯 The Magic**: Write one function → Get everything else for free!

# 🌟 **Key Features**

- **🔍 Auto Discovery** - Scan `api/` directory, find endpoints automatically
- **🤖 Instant MCP** - Your functions become AI tools in real-time
- **📚 Auto OpenAPI** - Complete API documentation generated automatically
- **⚡ Hot Reloading** - Save file = instant update across all interfaces
- **🛡️ Zero Config** - Works out of the box, no setup required


# 🌐 **HTTP Methods Supported**

**All HTTP methods are supported!** Just create the corresponding file:

| File Name | HTTP Method | Example Endpoint |
|-----------|-------------|------------------|
| `get.js` | **GET** | `GET /users` |
| `post.js` | **POST** | `POST /users` |
| `put.js` | **PUT** | `PUT /users/:id` |
| `patch.js` | **PATCH** | `PATCH /users/:id` |
| `delete.js` | **DELETE** | `DELETE /users/:id` |
| `head.js` | **HEAD** | `HEAD /users` |
| `options.js` | **OPTIONS** | `OPTIONS /users` |

**💡 Pro Tip**: You can mix and match methods for the same resource. Create `api/users/get.js` and `api/users/post.js` to handle both reading and creating users! The framework automatically detects and routes each method. Check the `api/example/` folder for simple examples.


# 🔍 **What Are MCP and OpenAPI?**

## **🤖 MCP (Model Context Protocol)**
MCP enables AI models to discover and use your functions as tools. When you write a function, it automatically becomes available to AI assistants like ChatGPT, Claude, or any MCP-compatible AI model.

**Benefits:**
- **AI Integration** - Make your APIs accessible to AI models
- **Natural Language** - AI can understand and use your functions
- **Tool Discovery** - AI automatically discovers available functions

## **📚 OpenAPI (Swagger)**
OpenAPI is the industry standard for API documentation. It provides:
- **Client Generation** - Auto-generate SDKs for any programming language
- **Testing Tools** - Use tools like Postman or Insomnia
- **API Documentation** - Professional, interactive documentation



# 🎯 **Use Cases & Applications**

- **AI Integration** - Expose your APIs to AI models via MCP
- **Rapid Prototyping** - Build APIs in minutes, not hours
- **Microservices** - Create lightweight, focused API services
- **AI Tools** - Build custom tools for AI assistants
- **API Documentation** - Auto-generate complete OpenAPI specs

---

# 🔧 **Framework Architecture**

```
📁 api/
├── 📄 hello/get.js    → GET /hello (REST) + get_hello (MCP) + OpenAPI
├── 📄 users/get.js    → GET /users (REST) + get_users (MCP) + OpenAPI
└── 📄 users/post.js   → POST /users (REST) + post_users (MCP) + OpenAPI

🔄 Auto-Conversion Engine:
├── 📡 API Loader: Discovers and registers endpoints
├── 🤖 MCP Server: Exposes functions as AI tools
├── 📚 OpenAPI Generator: Creates complete documentation
└── ⚡ Hot Reloader: Updates everything in real-time
```

---

# 💡 **Pro Tips**

## **Simplest Setup**

```javascript
const { BaseAPI } = require('easy-mcp-server');

class MyAPI extends BaseAPI {
  process(req, res) { /* your logic */ }
  
  get description() {
    return 'Your API description';
  }
  // Summary and response schema auto-generated! 🎉
}
```

## **Custom Request Body Schema**

```javascript
get openApi() {
  return {
    ...super.openApi,
    requestBody: { /* your custom schema */ }
  };
}
```

---

**🎯 The Future of API Development: Write Once, Deploy Everywhere**  
**One function = REST API + MCP Tool + OpenAPI Documentation** 🚀✨
