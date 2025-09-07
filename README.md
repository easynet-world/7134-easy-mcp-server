# easy-mcp-server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

> **Transform any function into a complete API ecosystem with AI integration**

## 🎯 **What You Get**

Write **ONE function** → Get **EVERYTHING**:
- ✅ **REST API** - Instant HTTP endpoints
- ✅ **MCP Tools** - AI models can call your functions  
- ✅ **MCP Prompts** - Template-based prompts with parameters
- ✅ **MCP Resources** - Documentation and data access
- ✅ **OpenAPI** - Complete API documentation
- ✅ **Swagger UI** - Interactive API explorer

## ⚡ **3 Simple Rules**

| Rule | Example | Result |
|------|---------|--------|
| **File Path = API Path** | `api/users/profile/get.js` | `GET /users/profile` |
| **File Name = HTTP Method** | `post.js` | `POST` |
| **One Function = Everything** | `process(req, res)` | REST + MCP + OpenAPI |

### Quick Example
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

### 1. Install & Setup
```bash
npm install easy-mcp-server
mkdir -p api/users && touch api/users/get.js
```

### 2. Write Your API
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

### 3. Start & Access
```bash
npx easy-mcp-server
```

**Access Points:**
- 🌐 **REST API**: http://localhost:3000
- 🤖 **MCP Server**: http://localhost:3001  
- 📚 **OpenAPI**: http://localhost:3000/openapi.json
- 🔍 **Swagger UI**: http://localhost:3000/docs

### 4. Optional: Add MCP Features
```bash
# Add prompts
mkdir -p mcp/prompts/my-category
echo '{"description": "My AI prompt", "instructions": "..."}' > mcp/prompts/my-category/my-prompt.json

# Add resources  
mkdir -p mcp/resources/docs
echo '# My Guide' > mcp/resources/docs/my-guide.md
```

---

## 📚 **Documentation**

| Document | Purpose | Best For |
|----------|---------|----------|
| **[Framework Guide](mcp/resources/guides/easy-mcp-server.md)** | Complete framework documentation | Deep dive, production setup |
| **[Agent Context](Agent.md)** | AI agent integration guide | Building AI-powered applications |
| **[Health Monitoring](mcp/resources/guides/health-monitoring.md)** | Monitoring and observability | Production monitoring |
| **[LLM Context](LLM.txt)** | LLM-specific information | AI model integration |

### 📋 **Quick Reference**
- **Getting Started**: [Quick Start](#-quick-start) → [Framework Guide](mcp/resources/guides/easy-mcp-server.md)
- **AI Integration**: [Agent Context](Agent.md) → [MCP Integration](#-mcp-integration)
- **Production**: [Production Ready](#-production-ready) → [Health Monitoring](mcp/resources/guides/health-monitoring.md)
- **Advanced**: [Advanced Features](#-advanced-features) → [Framework Guide](mcp/resources/guides/easy-mcp-server.md)

---

## 🛠 **Advanced Features**

### Enhanced API (LLM + Logging)
```javascript
const { BaseAPIEnhanced } = require('easy-mcp-server/lib/base-api-enhanced');

class MyEnhancedAPI extends BaseAPIEnhanced {
  constructor() {
    super('my-service', {
      llm: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY }
    });
  }

  async process(req, res) {
    // this.llm, this.responseUtils available
    this.responseUtils.sendSuccessResponse(res, { data: 'Hello World' });
  }
}
```

### Auto-Generated OpenAPI with JSDoc
```javascript
/**
 * @description Get user information
 * @summary Retrieve user details
 * @tags users
 * @requestBody { "type": "object", "required": ["userId"], "properties": { "userId": { "type": "string" } } }
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
OPENAI_API_KEY=your-key-here      # OpenAI API key
```

### CLI Options
```bash
easy-mcp-server --port 3000 --mcp-port 3001 --api-dir ./api
```

---

## 📦 **What You Get**

| Feature | Description | Auto-Generated |
|---------|-------------|----------------|
| **REST API** | HTTP endpoints from file structure | ✅ |
| **MCP Tools** | AI-callable functions | ✅ |
| **OpenAPI Docs** | Complete API documentation | ✅ |
| **Swagger UI** | Interactive API explorer | ✅ |
| **MCP Prompts** | Template-based AI prompts | ✅ |
| **MCP Resources** | Documentation & data access | ✅ |

### File Structure → API Endpoints
```
api/users/get.js          →  GET /users
api/users/post.js         →  POST /users  
api/users/profile/put.js  →  PUT /users/profile
```

### MCP Prompts & Resources
**Prompts** - Template-based AI prompts:
```
mcp/prompts/category/prompt.json
```

**Resources** - Documentation & data:
```
mcp/resources/category/resource.md
```

**Example Prompt:**
```json
{
  "description": "Generate API documentation",
  "arguments": { "type": "object", "properties": { "endpoint": { "type": "string" } } },
  "instructions": "You are an API expert..."
}
```

---

## 🚀 **Production Ready**

| Feature | Description |
|---------|-------------|
| **Hot Reloading** | Instant updates during development |
| **MCP Protocol** | Full AI model integration |
| **LLM Integration** | AI service integration |
| **Health Monitoring** | Built-in health checks |
| **Structured Logging** | Comprehensive logging |
| **Rate Limiting** | Built-in rate limiting |

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