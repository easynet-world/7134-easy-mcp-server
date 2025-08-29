# Easy MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

# One Function = API + MCP + OpenAPI + SWAGGER
> *Description (optional)*

---

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
- **REST API**: 
  - **URL**: `http://localhost:3000`
  - **API**: `GET /hello` → `{"message": "Hello World!"}`
- **MCP**:
  - **URL**: `http://localhost:3001`
  - **Connection Type**: **Streamable HTTP**
  - **Tool**: `get_hello` available to AI models at `ws://localhost:3001`
- **OpenAPI Docs**:
  - **URL**: `http://localhost:3000/openapi.json`
- **Swagger UI**:
  - **URL**: `http://localhost:3000/docs` ✨

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

**Connection Details:**
- **MCP Server URL**: `http://localhost:3001`
- **Connection Type**: Use **Streamable HTTP** type in your MCP client
- **Port**: 3001 (separate from the main API server on port 3000)

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

# 💡 **Pro Tips**

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

---

**📦 Package Version**: This project uses automated patch releases only. Every commit triggers a new patch version automatically.
