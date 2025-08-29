# Easy MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

> **🎯 Write ONE function → Get THREE interfaces automatically**  
> **REST API + MCP Tool + OpenAPI Documentation**

---

## 🚀 **Quick Start (30 seconds)**

> **📦 Simple Installation**: Install directly from npmjs.org for the best experience and reliability.

# 1. Install (choose one)

```bash
npm install easy-mcp-server
```

# 2. Create your first API
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
# 3. Start server
```bash
npm start
```

# 🎉 That's it! You now have:

**✅ What You Get:**
- **REST API**: `GET /hello` → `{"message": "Hello World!"}` at `http://localhost:3000`
- **MCP Tool**: `get_hello` available to AI models at `ws://localhost:3001`
- **OpenAPI Docs**: Complete documentation at `http://localhost:3000/openapi.json`
- **Swagger UI**: Interactive docs at `http://localhost:3000/docs` ✨



## ✨ **How It Works**

| What You Write | What You Get Automatically |
|----------------|----------------------------|
| **1 JavaScript file** | **3 Complete Interfaces** |
| `process(req, res)` method | **REST API endpoint** |
| File naming (`get.js`) | **HTTP method detection** |
| Directory structure | **URL routing** |
| Save file | **Hot reload + live update** |

**🎯 The Magic**: Write one function → Get everything else for free!

**🚀 You Also Get:**
- **🤖 MCP Tools** - AI models can use your functions
- **📚 OpenAPI Documentation** - Complete API specs
- **✨ Swagger UI** - Interactive API explorer

## 🌐 **HTTP Methods Supported**

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

---

## 🔥 **Real Examples**

### **Get Users**

```javascript
// api/users/get.js
const { BaseAPI } = require('easy-mcp-server');

class GetUsers extends BaseAPI {
  process(req, res) {
    const users = [
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' }
    ];
    res.json({ users });
  }
  
  get description() {
    return 'Retrieves a list of all users';
  }
}

module.exports = GetUsers;
```

**Automatically creates:**
- `GET /users` endpoint
- `get_users` MCP tool
- Complete OpenAPI documentation

### **Create User (with request body)**

```javascript
// api/users/post.js
const { BaseAPI } = require('easy-mcp-server');

class CreateUser extends BaseAPI {
  process(req, res) {
    const { name, email } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name required' });
    }
    
    const user = { id: Date.now(), name, email };
    res.status(201).json({ user });
  }
  
  get description() {
    return 'Creates a new user with name and email';
  }
  
  // Optional: Custom request body schema
  get openApi() {
    return {
      ...super.openApi,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string', description: 'User name (required)' },
                email: { type: 'string', description: 'User email address' }
              }
            }
          }
        }
      }
    };
  }
}

module.exports = CreateUser;
```

---

## 🌟 **Key Features**

- **🔍 Auto Discovery** - Scan `api/` directory, find endpoints automatically
- **🤖 Instant MCP** - Your functions become AI tools in real-time
- **📚 Auto OpenAPI** - Complete API documentation generated automatically
- **⚡ Hot Reloading** - Save file = instant update across all interfaces
- **🛡️ Zero Config** - Works out of the box, no setup required

---

## 🚀 **Installation & Setup**

```bash
# Install the package
npm install easy-mcp-server

# Start the server
npm start
```

**Your APIs are now available at the URLs shown in Quick Start above! 🚀**

---

## 🔍 **What Are MCP and OpenAPI?**

### **🤖 MCP (Model Context Protocol)**
MCP enables AI models to discover and use your functions as tools. When you write a function, it automatically becomes available to AI assistants like ChatGPT, Claude, or any MCP-compatible AI model.

**Benefits:**
- **AI Integration** - Make your APIs accessible to AI models
- **Natural Language** - AI can understand and use your functions
- **Tool Discovery** - AI automatically discovers available functions

### **📚 OpenAPI (Swagger)**
OpenAPI is the industry standard for API documentation. It provides:
- **Client Generation** - Auto-generate SDKs for any programming language
- **Testing Tools** - Use tools like Postman or Insomnia
- **API Documentation** - Professional, interactive documentation

---

## 🧪 **Test Your Setup**

```bash
# Test REST API
curl http://localhost:3000/hello

# Test MCP Server
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/list"}'

# View OpenAPI JSON
curl http://localhost:3000/openapi.json

# Open Swagger UI in browser
open http://localhost:3000/docs
```

---

## 🎯 **Use Cases**

- **AI Integration** - Expose your APIs to AI models via MCP
- **Rapid Prototyping** - Build APIs in minutes, not hours
- **Microservices** - Create lightweight, focused API services
- **AI Tools** - Build custom tools for AI assistants
- **API Documentation** - Auto-generate complete OpenAPI specs

---

## 🔧 **Framework Architecture**

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

## 💡 **Pro Tips**

### **Simplest Setup**

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

### **Custom Request Body Schema**

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
