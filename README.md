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
# Add a Markdown prompt (use {{placeholders}})
mkdir -p mcp/prompts/my-category
cat > mcp/prompts/my-category/my-prompt.md << 'EOF'
<!-- description: Example prompt using placeholders -->

Please process {{subject}} with priority {{priority}}.

Details:
- Region: {{region}}
- Owner: {{owner}}
EOF

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
| **[Health Monitoring](mcp/resources/guides/easy-mcp-server.md#-monitoring-and-logging)** | Monitoring and observability | Production monitoring |
| **[LLM Context](LLM.txt)** | LLM-specific information | AI model integration |

### 📋 **Quick Reference**
- **Getting Started**: [Quick Start](#-quick-start) → [Framework Guide](mcp/resources/guides/easy-mcp-server.md)
- **AI Integration**: [Agent Context](Agent.md) → [MCP Integration](#-mcp-integration)
- **Production**: [Production Ready](#-production-ready) → [Health Monitoring](mcp/resources/guides/easy-mcp-server.md#-monitoring-and-logging)
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

### Auto-Generated OpenAPI with JSDoc Annotations

The framework automatically parses JSDoc annotations to generate comprehensive OpenAPI documentation. All annotations are optional but highly recommended for better API documentation.

#### Supported Annotations

| Annotation | Purpose | Example |
|------------|---------|---------|
| `@description` | Detailed API description | `@description Get user information with optional filtering` |
| `@summary` | Short summary for OpenAPI | `@summary Retrieve user details` |
| `@tags` | API categorization | `@tags users,data-access` |
| `@requestBody` | Request body schema (JSON) | `@requestBody { "type": "object", "required": ["name"], "properties": { "name": { "type": "string" } } }` |
| `@responseSchema` | Response schema (JSON) | `@responseSchema { "type": "object", "properties": { "data": { "type": "array" } } }` |
| `@errorResponses` | Error response schemas (JSON) | `@errorResponses { "400": { "description": "Validation error" } }` |

#### Complete Example with All Annotations
```javascript
/**
 * @description Create a new user with validation and comprehensive error handling
 * @summary Create user endpoint with full validation
 * @tags users,authentication
 * @requestBody {
 *   "type": "object",
 *   "required": ["name", "email"],
 *   "properties": {
 *     "name": { "type": "string", "minLength": 2, "maxLength": 50 },
 *     "email": { "type": "string", "format": "email" },
 *     "age": { "type": "integer", "minimum": 0, "maximum": 120 },
 *     "isActive": { "type": "boolean", "default": true }
 *   }
 * }
 * @responseSchema {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" },
 *     "data": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string", "format": "uuid" },
 *         "name": { "type": "string" },
 *         "email": { "type": "string", "format": "email" },
 *         "age": { "type": "integer" },
 *         "isActive": { "type": "boolean" },
 *         "createdAt": { "type": "string", "format": "date-time" }
 *       }
 *     },
 *     "message": { "type": "string" }
 *   }
 * }
 * @errorResponses {
 *   "400": { "description": "Validation error", "schema": { "type": "object", "properties": { "error": { "type": "string" } } } },
 *   "409": { "description": "User already exists", "schema": { "type": "object", "properties": { "error": { "type": "string" } } } }
 * }
 */
class CreateUser extends BaseAPI {
  process(req, res) {
    // Your implementation here
  }
}
```

#### Annotation Benefits
- ✅ **Auto-Generated OpenAPI**: Annotations automatically create complete OpenAPI specifications
- ✅ **Swagger UI Integration**: Rich interactive documentation with request/response examples
- ✅ **MCP Tool Enhancement**: Better AI model integration with detailed schemas
- ✅ **Type Safety**: JSON schema validation for requests and responses
- ✅ **Developer Experience**: IntelliSense and auto-completion in IDEs

---

## 🔧 **Configuration**

### Environment Variables
```bash
PORT=3000                         # REST API port
MCP_PORT=3001                     # MCP server port
OPENAI_API_KEY=your-key-here      # OpenAI API key (optional)
```

### CLI Options
```bash
easy-mcp-server --port 3000 --mcp-port 3001 --api-dir ./api
```

### MCP Runtime Parsing & Cache
- Parser: `src/utils/parameter-template-parser.js` extracts `{{name}}` placeholders across Markdown/YAML/JSON/TXT.
- Cache: `src/utils/mcp-cache-manager.js` caches parsed prompts/resources and hot-swaps on file changes.

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

The framework uses a **convention-over-configuration** approach where file structure directly maps to API endpoints.

#### HTTP Method Mapping Rules

| File Name | HTTP Method | Purpose | Example |
|-----------|-------------|---------|---------|
| `get.js` | `GET` | Retrieve data | `api/users/get.js` → `GET /users` |
| `post.js` | `POST` | Create resources | `api/users/post.js` → `POST /users` |
| `put.js` | `PUT` | Update/replace resources | `api/users/put.js` → `PUT /users` |
| `patch.js` | `PATCH` | Partial updates | `api/users/patch.js` → `PATCH /users` |
| `delete.js` | `DELETE` | Remove resources | `api/users/delete.js` → `DELETE /users` |
| `head.js` | `HEAD` | Get headers only | `api/users/head.js` → `HEAD /users` |
| `options.js` | `OPTIONS` | Get allowed methods | `api/users/options.js` → `OPTIONS /users` |

#### Path Mapping Rules

| File Structure | API Endpoint | Description |
|----------------|--------------|-------------|
| `api/users/get.js` | `GET /users` | Root level endpoint |
| `api/users/profile/get.js` | `GET /users/profile` | Nested path |
| `api/users/profile/settings/get.js` | `GET /users/profile/settings` | Deep nesting |
| `api/v1/users/get.js` | `GET /v1/users` | Versioned API |
| `api/admin/users/get.js` | `GET /admin/users` | Namespaced API |

#### Complete File Structure Example
```
api/
├── users/
│   ├── get.js              → GET /users
│   ├── post.js             → POST /users
│   ├── profile/
│   │   ├── get.js          → GET /users/profile
│   │   ├── put.js          → PUT /users/profile
│   │   └── settings/
│   │       ├── get.js      → GET /users/profile/settings
│   │       └── patch.js    → PATCH /users/profile/settings
│   └── delete.js           → DELETE /users
├── products/
│   ├── get.js              → GET /products
│   ├── post.js             → POST /products
│   └── {id}/
│       ├── get.js          → GET /products/{id}
│       ├── put.js          → PUT /products/{id}
│       └── delete.js       → DELETE /products/{id}
└── v1/
    └── legacy/
        └── get.js          → GET /v1/legacy
```

#### HTTP Method Validation

The framework automatically validates HTTP methods:
- ✅ **Valid Methods**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`
- ❌ **Invalid Methods**: Any other filename will be rejected with an error
- 🔄 **Case Insensitive**: `Get.js`, `POST.js`, `put.js` all work correctly
- 📝 **Error Handling**: Invalid methods are logged and skipped during API loading

#### Dynamic Route Generation

Each API file automatically becomes:
- 🌐 **REST Endpoint**: Available at the mapped HTTP path
- 🤖 **MCP Tool**: AI models can call the endpoint via MCP protocol
- 📚 **OpenAPI Schema**: Auto-generated documentation
- 🔍 **Swagger UI**: Interactive API explorer

### MCP Prompts & Resources

**Auto-Discovery**: Automatically loads prompts and resources from `mcp/prompts/` and `mcp/resources/` directories.

**Universal Format Support**: Supports **ALL file formats** including:
- **Programming Languages**: `.js`, `.py`, `.java`, `.cpp`, `.c`, `.php`, `.rb`, `.go`, `.rs`, `.swift`, `.kt`, `.scala`
- **Web Technologies**: `.html`, `.css`, `.xml`, `.scss`, `.sass`, `.less`
- **Data Formats**: `.json`, `.yaml`, `.yml`, `.csv`, `.tsv`, `.toml`, `.ini`, `.properties`
- **Documentation**: `.md`, `.txt`, `.rst`, `.adoc`, `.asciidoc`, `.org`, `.wiki`
- **Scripts**: `.sh`, `.bash`, `.zsh`, `.fish`, `.ps1`, `.bat`, `.cmd`
- **Build Tools**: `.dockerfile`, `.makefile`, `.cmake`, `.gradle`, `.maven`
- **And many more!** (80+ supported formats)

**Template Parameters**: Any file can use `{{parameter}}` substitution for dynamic content.

**Hot Reloading & Caching**: Backed by in-memory cache with chokidar-based invalidation. File changes are detected automatically — no server restart needed.

**Example Structure:**
```
mcp/
├── prompts/
│   ├── my-category/
│   │   └── my-prompt.md
│   └── content-creation.md
└── resources/
    ├── api-guide.md
    └── guides/
```

**Example Prompt:**
```markdown
<!-- description: Analyze something using placeholders -->

Analyze {{target}} and produce a {{format}} report for {{audience}}.

Inputs:
- target: {{target}}
- format: {{format}}
- audience: {{audience}}
```

### Resources vs Resource Templates (one‑glance)

- **Where to put files**: anywhere under `mcp/resources/**`.
- **How templates are detected**: if a file contains `{{param}}` placeholders, it is a **resource template**.
- **Listings**:
  - `resources/list` → shows all resources (templates included).
  - `resources/templates/list` → shows only templates as `resourceTemplates[]` with `uriTemplate`, `name`, `mimeType`, `parameters`.
- **Location impact**: folder path only affects the URI, e.g. `mcp/resources/templates/email.html` → `resource://templates/email.html`.
- **Read with parameters**: call `resources/read` and pass `arguments` to substitute `{{param}}`.

---

## 🚀 **Production Ready**

| Feature | Description |
|---------|-------------|
| **Hot Reloading** | Instant updates during development |
| **Auto-Discovery** | Automatic loading of prompts and resources |
| **MCP Protocol** | Full AI model integration |
| **LLM Integration** | AI service integration |
| **Health Monitoring** | Built-in health checks |
| **Structured Logging** | Comprehensive logging |
| **Graceful Initialization** | Server continues running even if some APIs fail to initialize |

### 🛡️ **Graceful API Initialization**

The framework includes **graceful initialization** to prevent server crashes when individual APIs fail to initialize. This is crucial for production environments where partial service availability is better than complete downtime.

**Key Features:**
- ✅ **Server stays running** even if some APIs fail to initialize
- ✅ **Failed APIs return 503** with helpful error messages
- ✅ **Automatic retry mechanism** for failed initializations
- ✅ **Enhanced health checks** showing API status
- ✅ **Management endpoints** for retrying failed APIs

**Example Health Check Response:**
```json
{
  "status": "partial",
  "server": "running",
  "apis": {
    "total": 15,
    "healthy": 14,
    "failed": 1,
    "details": [
      {
        "serviceName": "opensearch-api",
        "initializationStatus": "failed",
        "error": "Connection timeout",
        "retryCount": 2,
        "maxRetries": 3
      }
    ]
  }
}
```

**Retry Failed APIs:**
```bash
# Retry a specific API
curl -X POST http://localhost:3000/admin/retry-initialization \
  -H "Content-Type: application/json" \
  -d '{"api": "opensearch-api"}'
```

**Configuration Options:**
```javascript
// In your API class
class MyAPI extends BaseAPIEnhanced {
  constructor() {
    super('my-service', {
      maxRetries: 5,        // Max retry attempts
      retryDelay: 10000,    // Delay between retries (ms)
      autoRetry: true       // Enable automatic retry
    });
  }
}
```

---

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🔧 **Troubleshooting**

### Custom Prompts & Resources Not Showing Up?

The framework supports **ALL file formats** for prompts and resources. If your custom content isn't appearing:

1. **Check Directory Structure**: Ensure files are in `mcp/prompts/` and `mcp/resources/`
2. **Verify Configuration**: Make sure `formats: ['*']` is set in your MCP server config
3. **Check File Permissions**: Ensure the server can read your files
4. **Use MCP Inspector**: Run `npx @modelcontextprotocol/inspector` to see loaded content
5. **Check Server Logs**: Look for `🔌 MCP Server: Added prompt/resource` messages

**Quick Test:**
```bash
# Create test files
echo '{"name": "Test Prompt", "instructions": "Test with {{param}}"}' > mcp/prompts/test.json
echo '# Test Resource\n\nWith {{variable}}' > mcp/resources/test.md

# Start server and check logs
node src/server.js
```

**Supported Formats**: `.js`, `.py`, `.md`, `.json`, `.yaml`, `.txt`, `.html`, `.css`, `.sql`, `.ini`, `.properties`, `.dockerfile`, `.makefile`, and 70+ more!

📖 **Full Guide**: See [CUSTOM_CONTENT_TROUBLESHOOTING.md](./CUSTOM_CONTENT_TROUBLESHOOTING.md) for detailed troubleshooting steps.

---

## 🤝 **Contributing**

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 **Support**

- **Issues**: [GitHub Issues](https://github.com/easynet-world/7134-easy-mcp-server/issues)
- **Documentation**: [Framework Guide](mcp/resources/guides/easy-mcp-server.md)
- **Examples**: Check the `api/example/` directory
Maintenance: Trigger patch release for parameter parsing + MCP cache.

Small README clarifications for MCP cache + parser.
