# easy-mcp-server

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

---

## 🚀 **Quick Start**

### 1. Install
```bash
npm install easy-mcp-server
```

### 2. Create API
```bash
mkdir -p api/users
touch api/users/get.js
```

### 3. Write Code
```javascript
// api/users/get.js
const BaseAPI = require('easy-mcp-server/base-api');

class GetUsers extends BaseAPI {
  process(req, res) {
    res.json({ users: [] });
  }
}

module.exports = GetUsers;
```

### 4. Start Server
```bash
npx easy-mcp-server
```

### 5. Access Everything
- **REST API**: `http://localhost:3000`
- **MCP Server**: `http://localhost:3001`
- **OpenAPI**: `http://localhost:3000/openapi.json`
- **Swagger UI**: `http://localhost:3000/docs`

---

## 📚 **Documentation**

- **[Framework Guide](mcp/resources/guides/easy-mcp-server.md)** - Complete framework documentation
- **[Health Monitoring](mcp/resources/guides/health-monitoring.md)** - Health monitoring setup
- **[LLM Context](LLM.txt)** - AI/LLM specific information
- **[Agent Context](Agent.md)** - Agent-specific information

---

## 🛠 **Advanced Features**

### Enhanced API with Redis, LLM, and Logging
```javascript
const { BaseAPIEnhanced } = require('easy-mcp-server/lib/base-api-enhanced');

class MyEnhancedAPI extends BaseAPIEnhanced {
  constructor() {
    super('my-service', {
      redis: { host: 'localhost', port: 6379 },
      llm: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY }
    });
  }

  async process(req, res) {
    // Redis caching available via this.redis
    // LLM services available via this.llm
    // Standardized responses via this.responseUtils
    this.responseUtils.sendSuccessResponse(res, { data: 'Hello World' });
  }
}
```

### JSDoc Annotations for OpenAPI
```javascript
/**
 * @description Get user information
 * @summary Retrieve user details
 * @tags users
 * @requestBody {
 *   "type": "object",
 *   "required": ["userId"],
 *   "properties": {
 *     "userId": { "type": "string" }
 *   }
 * }
 */
class GetUser extends BaseAPI {
  process(req, res) {
    // Your code here
  }
}
```

---

## 🔧 **Configuration**

### Environment Variables
```bash
PORT=3000                    # REST API port
MCP_PORT=3001               # MCP server port
NODE_ENV=production         # Environment
REDIS_URL=redis://localhost:6379  # Redis connection
OPENAI_API_KEY=your-key-here      # OpenAI API key
```

### CLI Options
```bash
easy-mcp-server --port 3000 --mcp-port 3001 --api-dir ./api
```

---

## 📦 **What You Get**

### Automatic REST API
Your file structure automatically becomes REST endpoints:
```
api/
├── users/
│   ├── get.js          # GET /users
│   ├── post.js         # POST /users
│   └── profile/
│       ├── get.js      # GET /users/profile
│       └── put.js      # PUT /users/profile
└── products/
    ├── get.js          # GET /products
    └── post.js         # POST /products
```

### Automatic MCP Tools
Your APIs become AI tools automatically:
```json
{
  "name": "get_users",
  "description": "Get all users",
  "inputSchema": { /* auto-generated */ }
}
```

### Automatic OpenAPI Documentation
Complete API documentation generated automatically with:
- Request/response schemas
- Parameter validation
- Error responses
- Interactive Swagger UI

---

## 🚀 **Production Ready**

- **Hot Reloading** - Instant updates during development
- **Multiple Transports** - HTTP, WebSocket, and Server-Sent Events
- **Redis Integration** - Caching and session management
- **LLM Integration** - AI service integration
- **Structured Logging** - Comprehensive logging with context
- **Health Monitoring** - Built-in health checks and metrics
- **Error Handling** - Standardized error responses
- **Rate Limiting** - Built-in rate limiting with Redis

---

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🤝 **Contributing**

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 **Support**

- **Issues**: [GitHub Issues](https://github.com/your-org/easy-mcp-server/issues)
- **Documentation**: [Framework Guide](mcp/resources/guides/easy-mcp-server.md)
- **Examples**: Check the `api/example/` directory