# Easy MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

## 🚀 **One Function → Everything**

**Write ONE function, get ALL of this:**
- ✅ **REST API** - Instant HTTP endpoints
- ✅ **MCP Tools** - AI models can call your functions
- ✅ **MCP Prompts** - Template-based prompts with parameters
- ✅ **MCP Resources** - Documentation and data access
- ✅ **OpenAPI** - Complete API documentation
- ✅ **Swagger UI** - Interactive API explorer
- ✅ **LLM.txt** - AI context and framework info
- ✅ **Agent.md** - Comprehensive agent context

---

## ⚡ **Extremely Simple Rules**

### **File Path = API Path**
```
api/users/profile/get.js  →  GET /users/profile
api/products/post.js      →  POST /products
api/orders/123/put.js     →  PUT /orders/123
```

### **File Name = HTTP Method**
```
get.js     →  GET
post.js    →  POST
put.js     →  PUT
patch.js   →  PATCH
delete.js  →  DELETE
```

### **One Function = Everything**
```javascript
const BaseAPI = require('easy-mcp-server/base-api');

class MyAPI extends BaseAPI {
  process(req, res) {
    res.json({ message: 'Hello World' });
  }
}

module.exports = MyAPI;
```

**That's it!** You now have:
- REST endpoint at `/my-api`
- MCP tool for AI models
- OpenAPI documentation
- Swagger UI integration

---

## 🎯 **Quick Start (30 seconds)**

### 1. Install
```bash
npm install -g easy-mcp-server
```

### 2. Create Project
```bash
easy-mcp-server init my-api
cd my-api
npm install
```

### 3. Start Server
```bash
easy-mcp-server
```

### 4. Access Everything
- **REST API**: `http://localhost:3000`
- **MCP Server**: `http://localhost:3001` (for AI models)
- **OpenAPI**: `http://localhost:3000/openapi.json`
- **Swagger UI**: `http://localhost:3000/docs`
- **LLM Context**: `http://localhost:3000/LLM.txt`
- **Agent Context**: `http://localhost:3000/Agent.md`
- **MCP Inspector**: `npx @modelcontextprotocol/inspector`

---

## 💬 **MCP Support (New Standard)**

### **MCP Tools** - AI Models Call Your Functions
```javascript
// Your function automatically becomes an MCP tool
class UserAPI extends BaseAPI {
  process(req, res) {
    const { name, email } = req.body;
    res.json({ user: { name, email, id: Date.now() } });
  }
}
// AI models can now call this function via MCP!
```

### **MCP Prompts** - Template-Based Prompts
```javascript
class PromptAPI extends BaseAPI {
  constructor() {
    super();
    this.prompts = [{
      name: 'code_review',
      description: 'Review code for best practices',
      template: 'Please review this {{language}} code:\n\n```{{language}}\n{{code}}\n```',
      arguments: [
        { name: 'language', description: 'Programming language', required: true },
        { name: 'code', description: 'Code to review', required: true }
      ]
    }];
  }
}
```

### **MCP Resources** - Documentation & Data Access
```javascript
class ResourceAPI extends BaseAPI {
  constructor() {
    super();
    this.resources = [{
      uri: 'config://server-settings',
      name: 'Server Configuration',
      description: 'Current server settings',
      mimeType: 'application/json',
      content: JSON.stringify({ port: 3000, features: ['tools', 'prompts', 'resources'] })
    }];
  }
}
```

---

## 📝 **Annotations (Optional)**

Add JSDoc annotations for rich schemas:

```javascript
/**
 * @description Create a new user with validation
 * @summary Create user endpoint
 * @tags users,authentication
 * @requestBody {
 *   "type": "object",
 *   "required": ["name", "email"],
 *   "properties": {
 *     "name": { "type": "string", "minLength": 2 },
 *     "email": { "type": "string", "format": "email" }
 *   }
 * }
 * @responseSchema {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" },
 *     "data": { "type": "object" }
 *   }
 * }
 */
class CreateUser extends BaseAPI {
  process(req, res) {
    const { name, email } = req.body;
    res.json({ success: true, data: { name, email, id: Date.now() } });
  }
}
```

---

## 🔥 **Key Features**

- **🔍 Auto Discovery** - Scan `api/` directory, find endpoints automatically
- **🤖 Instant MCP** - Your functions become AI tools in real-time
- **📚 Auto OpenAPI** - Complete API documentation generated automatically
- **⚡ Hot Reloading** - Save file = instant update across all interfaces
- **💬 MCP Prompts** - Template-based prompts with parameter substitution
- **📄 MCP Resources** - Access to documentation, configuration, and data
- **🌐 Multiple Transports** - HTTP, WebSocket, Server-Sent Events
- **📝 Annotation Support** - JSDoc annotations for custom schemas
- **🤖 AI Context** - LLM.txt and Agent.md for comprehensive AI integration
- **🚀 Enhanced Utilities** - Redis caching, LLM integration, structured logging
- **📊 Standardized Responses** - Consistent API response formatting
- **🔧 WordPress Integration** - Source management and duplicate detection

---

## 🎯 **Use Cases**

- **AI Integration** - Expose your APIs to AI models via MCP
- **Rapid Prototyping** - Build APIs in minutes, not hours
- **Microservices** - Create lightweight, focused API services
- **AI Tools** - Build custom tools for AI assistants
- **API Documentation** - Auto-generate complete OpenAPI specs
- **AI Prompt Engineering** - Create reusable prompt templates
- **Knowledge Management** - Provide AI models access to documentation

---

## 🖥️ **CLI Commands**

```bash
easy-mcp-server                    # Start server
easy-mcp-server init <project>     # Create new project
easy-mcp-server --port 8080        # Custom port
easy-mcp-server --help             # Show all options
```

---

## ⚙️ **Configuration**

### Environment Variables (.env)
```bash
PORT=3000                          # API server port
MCP_PORT=3001                      # MCP server port
NODE_ENV=development               # Environment
MCP_INFO_HTML_PATH=/path/to/custom.html  # Custom MCP info page
```

### Custom MCP Info Page

You can provide your own HTML file for the MCP info page:

- **Project root:** Create `mcp-info.html` in your project directory
- **Environment variable:** Set `MCP_INFO_HTML_PATH` to any HTML file path
- **Example template:** Use `mcp-info-example.html` as a starting point

---

## 🤖 **AI Model Integration**

### **AI Context Files**
Easy MCP Server provides comprehensive context for AI models:

- **`/LLM.txt`** - Framework context and usage patterns for LLMs
- **`/Agent.md`** - Detailed agent context with implementation examples
- **MCP Integration** - Full MCP 2024-11-05 compliance with tools, prompts, and resources

### **MCP Inspector** (Recommended)
```bash
npx @modelcontextprotocol/inspector
# Connect to: http://localhost:3001
# Type: Streamable HTTP
```

### **Available MCP Commands**
- `tools/list` - List all API endpoints as tools
- `tools/call` - Execute an API endpoint
- `prompts/list` - List all prompt templates
- `prompts/get` - Get prompt with parameter substitution
- `resources/list` - List all available resources
- `resources/read` - Read resource content
- `ping` - Health check

### **Example MCP Usage**
```json
// List all tools
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}

// Call a tool
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "post_users",
    "arguments": {
      "body": { "name": "John", "email": "john@example.com" }
    }
  }
}

// Get a prompt
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "prompts/get",
  "params": {
    "name": "code_review",
    "arguments": {
      "language": "javascript",
      "code": "console.log('hello');"
    }
  }
}
```

---

## 🚀 **Enhanced Utilities (New!)**

Easy MCP Server now includes powerful utilities for production-ready applications:

### **BaseAPIEnhanced** - Enhanced API Class
```javascript
const { BaseAPIEnhanced } = require('easy-mcp-server/lib/base-api-enhanced');

class MyAPI extends BaseAPIEnhanced {
  constructor() {
    super('my-service', {
      redis: { host: 'localhost', port: 6379 },
      llm: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY }
    });
  }

  async handleRequest(req, res) {
    // Redis caching available via this.redis
    // LLM services available via this.llm
    // Standardized responses via this.responseUtils
    // MCP resources via this.prompts and this.resources
  }
}
```

### **APIResponseUtils** - Standardized Responses
```javascript
const APIResponseUtils = require('easy-mcp-server/lib/api-response-utils');

// Standardized error responses
APIResponseUtils.sendValidationErrorResponse(res, errors);
APIResponseUtils.sendNotFoundResponse(res, 'User');

// Success responses
APIResponseUtils.sendSuccessResponse(res, { data: result });
APIResponseUtils.sendPaginatedResponse(res, data, pagination);
```

### **RedisClient** - Caching & Session Management
```javascript
const RedisClient = require('easy-mcp-server/lib/redis-client');

const redis = new RedisClient('my-service');
await redis.init();

// Automatic JSON serialization/deserialization
await redis.set('key', { data: 'value' }, 3600);
const data = await redis.get('key');
```

### **LLMService** - AI Integration
```javascript
const { createLLMService } = require('easy-mcp-server/lib/llm-service');

const llm = createLLMService({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY
});

const result = await llm.generate('Hello world');
```

### **Logger** - Structured Logging
```javascript
const Logger = require('easy-mcp-server/utils/logger');

const logger = new Logger({ service: 'my-api', level: 'info' });
logger.info('Request processed', { userId: 123 });
logger.logRequest(req);
logger.logMCPCall('tool', params, result, duration);
```

---

## 📁 **Project Structure**

### **Basic Structure**
```
my-api/
├── api/                          # API endpoints
│   ├── users/
│   │   ├── get.js               # GET /users
│   │   ├── post.js              # POST /users
│   │   └── profile/
│   │       ├── get.js           # GET /users/profile
│   │       └── put.js           # PUT /users/profile
│   └── products/
│       ├── get.js               # GET /products
│       └── post.js              # POST /products
├── mcp/                          # Custom MCP content (optional)
│   ├── prompts/                 # Your custom prompts
│   │   └── my-prompt.json
│   └── resources/               # Your custom resources
│       └── my-guide.md
├── package.json
└── .env
```

### **Enhanced Structure (with utilities)**
```
my-api/
├── api/                          # API endpoints
├── mcp/                          # Custom MCP content
├── src/                          # Framework source code
│   ├── lib/                      # Core library utilities
│   │   ├── api-response-utils.js # Standardized responses
│   │   ├── base-api-enhanced.js  # Enhanced API class
│   │   ├── redis-client.js       # Redis integration
│   │   ├── llm-service.js        # LLM integration
│   │   └── wordpress-source-manager.js # WordPress integration
│   ├── utils/                    # Utility classes
│   │   ├── logger.js             # Structured logging
│   │   └── resource-loader.js    # MCP resource management
│   ├── prompts/                  # Framework default prompts
│   └── resources/                # Framework default resources
├── package.json
└── .env
```

---

## 💡 **Best Practices**

### **File Organization**
- Group related endpoints in directories
- Use descriptive file names
- Follow REST conventions

### **API Design**
- Use resource-based URLs (`/users`, `/users/:id`)
- Return consistent response formats
- Use appropriate HTTP methods

### **Annotations**
- Use `@description` for detailed explanations
- Use `@tags` to group related endpoints
- Define `@requestBody` for POST/PUT endpoints
- Document `@errorResponses` for error cases

---

## 🚀 **Examples Included**

The project includes working examples:

- **`api/example/`** - Basic API endpoints (GET, POST, PUT, PATCH, DELETE)
- **`api/prompt-example/`** - MCP prompts with template substitution
- **`api/resource-example/`** - MCP resources with multiple MIME types

---

## 🔧 **How It Works**

1. **Scan** `api/` directory for endpoint files
2. **Parse** JSDoc annotations for schemas
3. **Generate** OpenAPI specs + MCP tools + documentation
4. **Serve** everything on multiple ports and protocols

---

## 🎯 **The Future of API Development**

**Write Once, Deploy Everywhere**

**One function = REST API + MCP Tools + MCP Prompts + MCP Resources + OpenAPI Documentation + LLM Context + Agent Context**

### **Complete MCP 2024-11-05 Support**
- ✅ **Tools** - Auto-discovery of API endpoints as MCP tools
- ✅ **Prompts** - Template-based prompts with parameter substitution  
- ✅ **Resources** - Access to documentation, configuration, and data
- ✅ **Multiple Transports** - HTTP, WebSocket, and Server-Sent Events
- ✅ **Real-time Updates** - Hot reloading across all MCP interfaces
- ✅ **Rich Schemas** - OpenAPI integration for input/output validation

---

**🎉 Start building AI-integrated APIs in seconds!**