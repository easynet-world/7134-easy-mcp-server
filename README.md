# easy-mcp-server
## Enterprise-Grade Node.js Server with AI Integration

[![npm version](https://img.shields.io/npm/v/easy-mcp-server.svg)](https://www.npmjs.com/package/easy-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![AI-Ready](https://img.shields.io/badge/AI-Ready-brightgreen.svg)](https://modelcontextprotocol.io)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)

> **Write code once → Get REST API + OpenAPI + Swagger + MCP tools automatically**

---

## Quick Start

```bash
# Create new project (recommended)
npx easy-mcp-server init my-api-project
cd my-api-project
npm install
./start.sh

# Your API is ready at http://localhost:8887 🚀
```

**What you get instantly:**
- ✅ REST API endpoints
- ✅ OpenAPI specification (`/openapi.json`)
- ✅ Swagger UI (`/docs`)
- ✅ MCP tools for AI agents
- ✅ Hot reload enabled

---

## Automatic Generation

Write code with annotations → Get everything automatically:

### 1. From Code to MCP Tools

![MCP Generation](docs/to-mcp.png)

Your API endpoints automatically become MCP tools that AI agents can use.

**Example:**
```javascript
// api/users/get.ts
class Request {
  // @description ('Filter by active status')
  active: boolean;
}

class Response {
  id: number;
  name: string;
  active: boolean = true;
  email: string = '';
}

// @description('List users with optional active filter')
// @summary('List users')
// @tags('users')
function handler(req: any, res: any) {
  res.json({ id: 1, name: 'John', active: true, email: 'john@example.com' });
}

module.exports = handler;
```

**Automatic Result:**
- MCP tool: `api_users_get` with full schema
- Interactive UI in MCP Inspector
- Parameter validation
- Response documentation

---

### 2. From Code to OpenAPI Specification

![OpenAPI Generation](docs/to-openapi.png)

Your code automatically generates OpenAPI 3.0 specification.

**Mapping:**
- File path (`/users/get.js`) → API path (`GET /users`)
- Class `Request` → Request parameters
- Class `Response` → Response schema
- Annotations → OpenAPI metadata

**Access:**
- OpenAPI JSON: `http://localhost:8887/openapi.json`
- Full specification with all endpoints

---

### 3. From Code to Swagger UI

![Swagger Generation](docs/to-swagger.png)

Interactive API documentation generated automatically.

**Features:**
- Test endpoints directly in browser
- See request/response schemas
- Parameter validation
- Example values

**Access:**
- Swagger UI: `http://localhost:8887/docs`

---

## Core Concept

### Annotation + Class Definition = Everything

```
Your Code                  →        Generated
─────────────────────────────────────────────────
File: api/users/get.js     →   GET /users
Request class              →   Request parameters
Response class             →   Response schema
@description annotation    →   API description
@tags annotation          →   API tags
@summary annotation       →   OpenAPI summary
```

**Write once, use everywhere:**
- ✅ REST API endpoints
- ✅ OpenAPI specification
- ✅ Swagger documentation
- ✅ MCP tools for AI agents

---

## File Structure Mapping

```
api/                    → API endpoints
├── users/
│   ├── get.js         → GET /users
│   └── post.js        → POST /users
└── products/
    ├── get.js         → GET /products
    └── [id]/          → Dynamic route
        └── get.js     → GET /products/:id
```

**Rules:**
- File path = API path
- File name = HTTP method
- `[id]` folders = dynamic routes (`:id`)

---

## Basic API Example

```javascript
const BaseAPI = require('easy-mcp-server/api/base-api');

/**
 * @description Get user information with optional filtering
 * @summary Retrieve user details
 * @tags users,data-access
 */
class GetUsers extends BaseAPI {
  process(req, res) {
    res.json({ users: [] });
  }
}

module.exports = GetUsers;
```

---

## Advanced API with Request/Response Schemas

### Example: Create User with Validation

```javascript
const BaseAPI = require('easy-mcp-server/api/base-api');

/**
 * @description Create a new user with validation
 * @summary Create user endpoint
 * @tags users,authentication
 * @requestBody {
 *   "type": "object",
 *   "required": ["name", "email"],
 *   "properties": {
 *     "name": { "type": "string", "minLength": 2, "maxLength": 50 },
 *     "email": { "type": "string", "format": "email" },
 *     "age": { "type": "integer", "minimum": 18 }
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
 *         "createdAt": { "type": "string", "format": "date-time" }
 *       }
 *     },
 *     "message": { "type": "string" }
 *   }
 * }
 */
class CreateUser extends BaseAPI {
  process(req, res) {
    const { name, email, age } = req.body;
    
    // Validation is automatic based on @requestBody annotation
    // Response schema is automatically documented
    
    res.json({
      success: true,
      data: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name,
        email,
        createdAt: new Date().toISOString()
      },
      message: 'User created successfully'
    });
  }
}

module.exports = CreateUser;
```

**Result:**
- ✅ Request body validation (OpenAPI + Swagger UI)
- ✅ Response schema documentation
- ✅ MCP tool with full parameter schemas
- ✅ Automatic type checking and validation

---

## Supported Annotations

| Annotation | Purpose | Example |
|------------|---------|---------|
| `@description` | API endpoint description | `@description Get user information` |
| `@summary` | Brief summary | `@summary Retrieve user details` |
| `@tags` | Categorization | `@tags users,data-access` |
| `@requestBody` | Request body schema (JSON) | `@requestBody { "type": "object", "properties": {...} }` |
| `@responseSchema` | Response schema (JSON) | `@responseSchema { "type": "object", "properties": {...} }` |
| `@body` | Alias for `@requestBody` | Same as `@requestBody` |
| `@response` | Alias for `@responseSchema` | Same as `@responseSchema` |

**Note:** Both `@requestBody`/`@body` and `@responseSchema`/`@response` are supported. Use whichever you prefer.

---

## AI Integration (MCP Protocol)

### Automatic MCP Tool Generation

Every API endpoint automatically becomes an MCP tool that AI agents can discover and use.

**Connection:**
- WebSocket: `ws://localhost:8888`
- HTTP: `POST http://localhost:8888/mcp`

**Discover Tools:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

**Call API:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "api_users_get",
    "arguments": {
      "active": true
    }
  }
}
```

### MCP Prompts & Resources

**Prompts** (`mcp/prompts/`):
- Template-based prompts for AI agents
- Parameterized with `{{variables}}`

**Resources** (`mcp/resources/`):
- Documentation files
- API guides
- Context for AI agents

---

## Service Endpoints

| Service | URL | Description |
|---------|-----|-------------|
| **REST API** | http://localhost:8887 | Your API endpoints |
| **Swagger UI** | http://localhost:8887/docs | Interactive API docs |
| **OpenAPI** | http://localhost:8887/openapi.json | OpenAPI specification |
| **MCP Server** | http://localhost:8888 | AI agent interface |
| **Health Check** | http://localhost:8887/health | Server status |

---

## Configuration

### Environment Variables

**Server Settings:**
```bash
EASY_MCP_SERVER_PORT=8887              # REST API port
EASY_MCP_SERVER_MCP_PORT=8888          # MCP server port
EASY_MCP_SERVER_LOG_LEVEL=info         # Logging level
```

**All config variables use `EASY_MCP_SERVER_` prefix.**

### Project Structure

```
your-project/
├── api/                    # API endpoints
│   ├── users/
│   │   ├── get.js
│   │   └── post.js
│   └── products/
├── mcp/                   # AI features (optional)
│   ├── prompts/           # AI prompt templates
│   └── resources/         # AI resource documentation
├── public/                # Static files (optional)
│   └── index.html
├── package.json
├── .env                   # Environment config
└── mcp-bridge.json        # MCP bridge config
```

---

## Development Features

**Hot Reload:**
- ✅ API files: Instant reload on save
- ✅ Middleware: Auto-reload on changes
- ✅ Prompts/Resources: Real-time updates
- ✅ Environment: `.env` changes applied automatically

**Zero Restart:** Development changes apply immediately.

---

## Quick Reference

### Endpoint Export Options

**1. BaseAPI class (recommended):**
```javascript
const BaseAPI = require('easy-mcp-server/api/base-api');
class GetUsers extends BaseAPI {
  process(req, res) {
    res.json({ users: [] });
  }
}
module.exports = GetUsers;
```

**2. Plain function:**
```javascript
module.exports = (req, res) => {
  res.json({ users: [] });
};
```

**3. Object with process method:**
```javascript
module.exports = {
  process(req, res) {
    res.json({ users: [] });
  }
};
```

**Note:** BaseAPI provides OpenAPI/MCP features. Plain functions work but won't auto-generate specs.

---

### Middleware

```javascript
// api/middleware.js
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

module.exports = [authenticate];
```

---

### Enhanced API with AI

```javascript
const { BaseAPIEnhanced } = require('easy-mcp-server/api/base-api-enhanced');

class MyEnhancedAPI extends BaseAPIEnhanced {
  constructor() {
    super('my-service', {
      llm: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY }
    });
  }

  async process(req, res) {
    // AI and utility services available
    this.responseUtils.sendSuccessResponse(res, { data: 'Hello World' });
  }
}

module.exports = MyEnhancedAPI;
```

---

## Example Project

Complete working example with users/products APIs:

```bash
git clone https://github.com/easynet-world/7134-easy-mcp-server.git
cd 7134-easy-mcp-server/example-project
npx easy-mcp-server
```

**Features demonstrated:**
- GET/POST endpoints
- Dynamic routes
- JSDoc annotations
- MCP prompts and resources
- OpenAPI generation
- Swagger UI

---

## Comparison

| Traditional Development | **easy-mcp-server** |
|------------------------|-------------------|
| Manual routing & middleware | ✅ **Convention-based** - Zero config |
| Manual AI integration | ✅ **Native MCP** - Automatic |
| Separate documentation | ✅ **Auto-generated** - OpenAPI + Swagger |
| Manual API client setup | ✅ **AI-Ready** - Automatic tool generation |
| Complex learning curve | ✅ **Intuitive** - File structure = API |

---

## Troubleshooting

**Port conflicts:**
```bash
EASY_MCP_SERVER_PORT=8888 npx easy-mcp-server
```

**APIs not working:**
- Check file paths match API structure
- Verify HTTP method naming (get.js, post.js)

**AI features not showing:**
- Ensure files in `mcp/prompts/` and `mcp/resources/`

**Debug mode:**
```bash
EASY_MCP_SERVER_LOG_LEVEL=debug npx easy-mcp-server
```

---

## Advanced Topics

For detailed documentation, see:

- **Developer Guide**: See `docs/` folder (coming soon)
- **Architecture Details**: See source code in `src/`
- **MCP Specification**: [modelcontextprotocol.io](https://modelcontextprotocol.io)
- **OpenAPI Spec**: [openapi-spec.json](openapi-spec.json)

---

## Scripts & Utilities

**Validation:**
```bash
npm run validate           # Validate OpenAPI & MCP
npm run validate:openapi   # OpenAPI 3.0 compliance
npm run validate:mcp       # MCP protocol compliance
```

**MCP Info:**
```bash
npm run mcp:list          # List all MCP tools/resources/prompts
```

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## Support & Resources

- **Issues**: [GitHub Issues](https://github.com/easynet-world/7134-easy-mcp-server/issues)
- **Example Project**: See `example-project/` directory
- **License**: MIT (see [package.json](package.json))

---

## License

MIT License - see [package.json](package.json) for details.
