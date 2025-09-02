# Easy MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

### **One Function → API + MCP + OpenAPI + SWAGGER + LLM.txt**

> **Latest**: Fixed semantic-release configuration for self-hosted runners and npm paths

# 🚀 **Quick Start (30 seconds)**

## 1. Install
```bash
npm install easy-mcp-server
```

## 2. Create process

/api/hello/get.js
```javascript
/**
 * @description Returns a simple greeting message
 * @summary Get hello world message
 */
class HelloWorld extends BaseAPI {
  process(req, res) {
    res.json({ message: "Hello World!" });
  }
}

module.exports = HelloWorld;
```

## 3. Start server
```bash
npm start
```

## 🎉 Done! You now have:
- **REST API**: `GET http://localhost:3000/hello` → `{"message": "Hello World!"}`
- **MCP Tools**: Available to AI models
  - **URL**: `http://localhost:3001`
  - **Type**: Streamable HTTP
- **OpenAPI**: `http://localhost:3000/openapi.json`
- **Swagger UI**: `http://localhost:3000/docs`
- **LLM.txt**: `http://localhost:3000/LLM.txt` (AI context)

# 🌟 **Key Features**

- **🔍 Auto Discovery** - Scan `api/` directory, find endpoints automatically
- **🤖 Instant MCP** - Your functions become AI tools in real-time
- **📚 Auto OpenAPI** - Complete API documentation generated automatically
- **⚡ Hot Reloading** - Save file = instant update across all interfaces
- **📝 Annotation Support** - JSDoc annotations for custom schemas
- **🤖 AI-Native** - LLM.txt support for AI model context

# 📁 **File Structure**

**File Path = API Path, File Name = HTTP Method**

```
api/
├── users/
│   ├── get.js          → GET /users
│   ├── post.js         → POST /users
│   └── profile/
│       ├── get.js      → GET /users/profile
│       └── put.js      → PUT /users/profile
└── hello/
    └── get.js          → GET /hello
```

**HTTP Methods**: `get.js`, `post.js`, `put.js`, `patch.js`, `delete.js`, `head.js`, `options.js`

# 📝 **Annotations**

JSDoc annotations automatically generate OpenAPI specs, MCP tools, and documentation.

## **Supported Annotations**

```javascript
/**
 * @description Detailed endpoint description
 * @summary Short summary for UI
 * @tags users,api
 * @requestBody { "type": "object", "properties": {...} }
 * @responseSchema { "type": "object", "properties": {...} }
 * @errorResponses { "400": {"description": "Bad request"} }
 */
```

## **Quick Example**

```javascript
/**
 * @description Create user with validation
 * @summary Create user endpoint
 * @tags users
 * @requestBody {
 *   "type": "object",
 *   "required": ["name", "email"],
 *   "properties": {
 *     "name": {"type": "string", "minLength": 2},
 *     "email": {"type": "string", "format": "email"}
 *   }
 * }
 */
class CreateUser extends BaseAPI {
  process(req, res) { /* implementation */ }
}
```

# 🔄 **How It Works**

1. **Scan** `api/` directory for endpoint files
2. **Parse** JSDoc annotations for schemas
3. **Generate** OpenAPI specs + MCP tools + documentation

# 🤖 **AI Integration**

**LLM.txt** provides comprehensive framework context to AI models:
- **Contextual Understanding** - AI models understand framework capabilities
- **Accurate Code Generation** - Generated code follows conventions
- **Troubleshooting Support** - AI can help diagnose issues

**Example AI Interaction:**
**User:** "I want to create an API for managing books. Can you help me?"

**AI Model (using LLM.txt):**
"I can help you create a book management API! Here's what we need:

1. **Create file structure:**
   ```bash
   mkdir -p api/books
   touch api/books/get.js api/books/post.js
   ```

2. **Here's the code:**
   ```javascript
   const BaseAPI = require('../../src/core/base-api');

   /**
    * @description Create a new book
    * @summary Create book endpoint
    * @tags books,library
    * @requestBody {
    *   "type": "object",
    *   "required": ["title", "author"],
    *   "properties": {
    *     "title": { "type": "string", "minLength": 1 },
    *     "author": { "type": "string", "minLength": 1 }
    *   }
    * }
    */
   class CreateBook extends BaseAPI {
     process(req, res) {
       const { title, author } = req.body;
       
       if (!title || !author) {
         return res.status(400).json({ 
           success: false, 
           error: 'Title and author are required' 
         });
       }
       
       const book = {
         id: this.generateUUID(),
         title,
         author,
         createdAt: new Date().toISOString()
       };
       
       res.status(201).json({
         success: true,
         data: book,
         message: 'Book created successfully'
       });
     }
   }

   module.exports = CreateBook;
   ```

3. **Start server:** `npm start`
4. **Your API is ready:** `http://localhost:3000/books`"

# 🎯 **Use Cases**

- **AI Integration** - Expose your APIs to AI models via MCP
- **Rapid Prototyping** - Build APIs in minutes, not hours
- **Microservices** - Create lightweight, focused API services
- **AI Tools** - Build custom tools for AI assistants
- **API Documentation** - Auto-generate complete OpenAPI specs

# 💡 **Best Practices**

- **Use annotations** for complex schemas, **rely on auto-generation** for simple cases
- **Be consistent** with annotation patterns across related endpoints
- **Document errors** with `@errorResponses` for better API understanding
- **Use tags** to group related endpoints together

---

**🎯 The Future of API Development: Write Once, Deploy Everywhere**  
**One function = REST API + MCP Tool + OpenAPI Documentation + AI Context** 🚀✨
# Trigger npm release
# Test npm publishing with new token
