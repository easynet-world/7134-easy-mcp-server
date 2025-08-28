# Easy MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

> **🎯 ONE FUNCTION = THREE INTERFACES AUTOMATICALLY**  
> **Write a single JavaScript function and instantly get REST API + MCP Tool + OpenAPI Documentation**

### **What You Get:**

**🌐 REST API** - Standard HTTP endpoints for web and mobile apps  
**🤖 MCP (Model Context Protocol)** - AI models can call your functions as tools  
**📚 OpenAPI** - Professional API documentation and client generation

## 🚀 **The Magic (One Glance)**

**You write ONE JavaScript class with a `process()` method:**

```javascript
// api/hello/get.js
const { BaseAPI } = require('easy-mcp-server');

class HelloWorld extends BaseAPI {
  process(req, res) {
    res.json({ message: "Hello World!" });
  }
  
  get description() {
    return 'Returns a simple greeting message from the server';
  }
}

module.exports = HelloWorld;
```

**Save the file and automatically get:**

✅ **REST API**: `GET /hello`  
✅ **MCP Tool**: `get_hello` (available to AI models)  
✅ **OpenAPI**: Complete documentation  
✅ **Hot Reload**: Changes detected instantly  

## ✨ **How It Works (Super Simple)**

### **Step 1: Write One Function**
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
    return 'Retrieves a list of all users from the server';
  }
}

module.exports = GetUsers;
```

### **Step 2: Save the File**
That's it! The framework automatically:

✅ **Creates REST endpoint**: `GET /users`  
✅ **Creates MCP tool**: `get_users` available to AI models  
✅ **Generates OpenAPI spec**: Complete documentation  
✅ **Enables hot reloading**: Changes detected instantly  

### **Step 3: Use Anywhere**

**🌐 REST API:**
```bash
curl http://localhost:3000/users
# Response: {"users": [...]}
```
Standard HTTP endpoints that work with any web framework, mobile app, or frontend.

**🤖 MCP (Model Context Protocol):**
```json
// AI models can call your functions as tools
{
  "method": "tools/call",
  "params": {
    "name": "get_users",
    "arguments": {}
  }
}
```
MCP is a protocol that allows AI models to discover and call your functions as tools, making your APIs accessible to AI assistants and chatbots.

**📚 OpenAPI Documentation:**
```bash
curl http://localhost:3000/openapi.json
# Full OpenAPI 3.0 specification
```
Automatically generated API documentation that enables client generation, testing tools, and professional API documentation.

## 🎯 **The Power: Zero Configuration Magic**

| What You Write | What You Get Automatically |
|----------------|----------------------------|
| **1 JavaScript file** | **3 Complete Interfaces** |
| `process(req, res)` method | REST API endpoint |
| File naming (`get.js`) | HTTP method detection |
| Directory structure | URL routing |
| Save file | Hot reload + live update |

## 🚀 **Installation & Quick Start**

```bash
npm install easy-mcp-server
```

**3-Step Setup:**

```bash
# 1. Copy environment
cp .env.example .env

# 2. Create your first API function
mkdir -p api/users
# Create api/users/get.js with the example above

# 3. Start the server
npm start
```

**🎉 You now have:**
- REST API: `http://localhost:3000/users`
- MCP Server: `ws://localhost:3001` 
- OpenAPI Docs: `http://localhost:3000/openapi.json`

## 🔥 **Simple Examples**

### **Example 1: Hello World**
```javascript
// api/hello/get.js
const BaseAPI = require('../../src/core/base-api');

/**
 * Hello World API endpoint
 * @description Returns a simple greeting message
 * @example
 * // REST API: GET /hello
 * // MCP Tool: get_hello
 * // OpenAPI: Auto-generated documentation
 */
class HelloWorld extends BaseAPI {
  /**
   * Process the request and return a greeting
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with greeting message
   */
  process(req, res) {
    res.json({ message: "Hello World!" });
  }
  
  get description() {
    return 'Returns a simple greeting message from the server';
  }
}

module.exports = HelloWorld;
```

**🎯 What you get automatically:**
- **REST**: `GET /hello` → `{"message": "Hello World!"}`
- **MCP**: `get_hello` tool available to AI models
- **OpenAPI**: Complete documentation

### **Example 2: Create User**
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
    return 'Creates a new user with name and email on the server';
  }
  
  // Enhanced OpenAPI documentation with custom request body
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
                name: {
                  type: 'string',
                  description: 'User name (required)',
                  example: 'John Doe'
                },
                email: {
                  type: 'string',
                  description: 'User email address',
                  example: 'john@example.com'
                }
              }
            }
          }
        }
      }
    };
  }
}

module.exports = CreateUser;
}

**🎯 What you get automatically:**
- **REST**: `POST /users` with request body
- **MCP**: `post_users` tool with parameters
- **OpenAPI**: Full request/response schemas

## 🌟 **Key Benefits**

| Feature | What It Means |
|---------|---------------|
| **🔍 Auto Discovery** | Scan `api/` directory, find endpoints automatically |
| **🤖 Instant MCP** | Your functions become AI tools in real-time |
| **📚 Auto OpenAPI** | Complete API documentation generated automatically |
| **⚡ Hot Reloading** | Save file = instant update across all interfaces |
| **🛡️ Zero Config** | Works out of the box, no setup required |

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

## 🧪 **Test Your Setup**

```bash
# Test REST API
curl http://localhost:3000/hello

# Test MCP Server
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/list"}'

# View OpenAPI docs
curl http://localhost:3000/openapi.json
```

## 🎯 **Use Cases**

- **AI Integration**: Expose your APIs to AI models via MCP
- **Rapid Prototyping**: Build APIs in minutes, not hours
- **Microservices**: Create lightweight, focused API services
- **AI Tools**: Build custom tools for AI assistants
- **API Documentation**: Auto-generate complete OpenAPI specs

## 🔍 **What Are MCP and OpenAPI?**

### **🤖 MCP (Model Context Protocol)**
MCP is an open protocol that enables AI models to discover and use external tools. When you write a function, it automatically becomes available to AI assistants like ChatGPT, Claude, or any MCP-compatible AI model. Your functions appear as tools that AI can call with parameters.

**Benefits:**
- **AI Integration**: Make your APIs accessible to AI models
- **Natural Language**: AI can understand and use your functions
- **Tool Discovery**: AI automatically discovers available functions
- **Parameter Handling**: AI can pass the right arguments to your functions

### **📚 OpenAPI (Swagger)**
OpenAPI is the industry standard for API documentation. It provides a machine-readable description of your API that enables:
- **Client Generation**: Auto-generate SDKs for any programming language
- **Testing Tools**: Use tools like Postman or Insomnia
- **API Documentation**: Professional, interactive documentation
- **Code Examples**: Generate code samples for any language

**💡 Pro Tip**: Extend the BaseAPI class for the simplest setup:
```javascript
const { BaseAPI } = require('easy-mcp-server');

class MyAPI extends BaseAPI {
  process(req, res) { /* your logic */ }
  
  get description() {
    return 'Your API description';
  }
  
  // Summary and response schema auto-generated!
  // Add custom openApi getter only if you need request body schemas
}
```

**🎯 MCP Integration**: MCP automatically uses the OpenAPI description, so no separate `description` getter needed!

## 🚀 **Simplified API Development**

### **Before (Old Way):**
```javascript
class MyAPI {
  process(req, res) { /* your logic */ }
  
  get description() {
    return 'Description for MCP';
  }
  
  get openApi() {
    return {
      summary: 'Summary',
      description: 'Description for OpenAPI',
      responses: { /* manual schema */ }
    };
  }
}
```

### **Now (New Way with Base Class):**
```javascript
const { BaseAPI } = require('easy-mcp-server');

class MyAPI extends BaseAPI {
  process(req, res) { /* your logic */ }
  
  get description() {
    return 'Single description used by both MCP and OpenAPI';
  }
  // Summary and response schema auto-generated! 🎉
}

### **Benefits:**
- ✅ **Single source of truth** - One description for both MCP and OpenAPI
- ✅ **Auto-generated schemas** - Response schemas created automatically
- ✅ **Auto-generated summary** - Summary automatically uses description
- ✅ **Zero duplication** - No need to maintain separate descriptions
- ✅ **Always in sync** - MCP and OpenAPI always use the same information
- ✅ **Easy inheritance** - Extend BaseAPI for consistent structure

---

**🎯 The Future of API Development: Write Once, Deploy Everywhere**  
**One function = REST API + MCP Tool + OpenAPI Documentation** 🚀✨
