# easy-mcp-server Development Guide

> **Complete development documentation covering all features from basic to advanced**

## 📋 **Table of Contents**

| Section | Description | Best For |
|---------|-------------|----------|
| [🚀 Quick Start](#-quick-start) | 3-minute setup | New users |
| [🛠 Framework Features](#-framework-features) | Core capabilities overview | Understanding features |
| [📝 API Design](#-api-design-best-practices) | Best practices and patterns | API development |
| [🤖 MCP Integration](#-mcp-integration) | AI model integration | AI application development |
| [🔥 Hot Reload](#-hot-reload-functionality) | Development workflow | Daily development |
| [🏗 Development Workflow](#-development-workflow) | Development process | Daily development |
| [🚀 Production Deployment](#-production-deployment) | Production environment setup | Deployment |
| [📊 Monitoring](#-monitoring-and-logging) | Observability | Production monitoring |
| [🔒 Security](#-security-considerations) | Security best practices | Security |
| [🔧 Troubleshooting](#-troubleshooting) | Common issues and solutions | Problem solving |

---

## 🚀 **Quick Start**

### 1. Install and Create API
```bash
npm install easy-mcp-server
mkdir -p api/users && touch api/users/get.js
```

### 2. Write Your First API
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

### 3. Start and Access
```bash
npx easy-mcp-server
```
- 🌐 **REST API**: http://localhost:8887
- 🤖 **MCP Server**: http://localhost:8888
- 📚 **OpenAPI**: http://localhost:8887/openapi.json
- 🔍 **Swagger UI**: http://localhost:8887/docs

---

## 🛠 **Framework Features**

| Feature | Description | Auto-Generated |
|---------|-------------|----------------|
| **Dynamic API Discovery** | Endpoints from file structure | ✅ |
| **MCP Integration** | APIs become AI tools | ✅ |
| **OpenAPI Generation** | Complete API documentation | ✅ |
| **Hot Reloading** | Instant updates during development | ✅ |
| **Enhanced Utilities** | LLM integration and logging | ✅ |

### File Structure Rules
| Rule | Example | Result |
|------|---------|--------|
| **File Path = API Path** | `api/users/profile/get.js` | `GET /users/profile` |
| **File Name = HTTP Method** | `post.js` | `POST` |
| **One Function = Everything** | `process(req, res)` | REST + MCP + OpenAPI |

---

## 📝 **API Design Best Practices**

### File Structure
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

### HTTP Methods
| Method | Purpose | Example |
|--------|---------|---------|
| **GET** | Retrieve data | `api/users/get.js` |
| **POST** | Create resources | `api/users/post.js` |
| **PUT** | Update resources | `api/users/put.js` |
| **PATCH** | Partial updates | `api/users/patch.js` |
| **DELETE** | Remove resources | `api/users/delete.js` |

### Response Standards
```javascript
// Success response
{
  "success": true,
  "message": "Operation completed",
  "data": { /* response data */ },
  "timestamp": "2024-01-01T00:00:00.000Z"
}

// Error response
{
  "success": false,
  "error": "Error message",
  "errorCode": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### JSDoc Annotations
```javascript
/**
 * @description Get user information with optional filtering
 * @summary Retrieve user details
 * @tags users,data-access
 * @requestBody { "type": "object", "properties": { "limit": { "type": "number", "default": 10 } } }
 */
```

---

## 🤖 **MCP Integration**

### Automatic Tool Generation
Your API endpoints automatically become MCP tools that AI models can call:

```javascript
// This API endpoint
class GetUsers extends BaseAPI {
  process(req, res) {
    res.json({ users: [] });
  }
}

// Becomes this MCP tool automatically
{
  "name": "get_users",
  "description": "Get all users",
  "inputSchema": { /* auto-generated */ }
}
```

### MCP Server Endpoints
| Endpoint | Purpose |
|----------|---------|
| `tools/list` | Discover all available API endpoints as tools |
| `tools/call` | Execute specific API endpoints with parameters |
| `prompts/list` | Access template-based prompts |
| `resources/list` | Access documentation and data |

### Custom Prompts and Resources
```javascript
// Custom prompts
this.prompts = [{
  name: 'code_review',
  description: 'Review code for best practices',
  template: 'Please review this {{language}} code...',
  arguments: [{ name: 'language', required: true }]
}];

// Custom resources
this.resources = [{
  uri: 'resource://api-docs',
  name: 'API Documentation',
  description: 'Complete API reference',
  mimeType: 'text/markdown',
  content: '# API Documentation...'
}];
```

---

## 🔥 **Hot Reload Functionality**

### Overview
The easy-mcp-server project has comprehensive hot reload functionality for APIs, prompts, and resources. All hot reload features are working correctly and have been thoroughly tested.

### Hot Reload Components

#### 1. **API Hot Reload** (`src/utils/hot-reloader.js`)
- **Watches**: `api/**/*.js` files
- **Features**:
  - Automatic file change detection using chokidar
  - Debounced reloading (1 second delay)
  - Automatic package installation for new dependencies
  - Route cleanup and regeneration
  - MCP server integration
  - Error handling and validation

#### 2. **Prompts Hot Reload** (`src/mcp/mcp-server.js`)
- **Watches**: `mcp/prompts/` directory
- **Features**:
  - File format support: `.md`, `.json`, `.yaml`, `.yml`, `.txt`
  - Parameter extraction from templates
  - Nested directory support
  - Real-time prompt updates
  - MCP protocol integration

#### 3. **Resources Hot Reload** (`src/mcp/mcp-server.js`)
- **Watches**: `mcp/resources/` directory
- **Features**:
  - Multiple file format support
  - URI generation for resources
  - Content type detection
  - Nested directory structure support
  - Real-time resource updates

#### 4. **Environment Hot Reload** (`src/utils/env-hot-reloader.js`)
- **Watches**: `.env.local`, `.env.development`, `.env` files
- **Features**:
  - Priority-based loading
  - MCP bridge restart on env changes
  - Configuration updates
  - Client notifications

#### 5. **MCP Bridge Hot Reload** (`src/utils/mcp-bridge-reloader.js`)
- **Watches**: `mcp-bridge.json` configuration file
- **Features**:
  - Bridge configuration changes
  - Environment variable updates
  - Automatic bridge restart

### Hot Reload Configuration
```bash
# Enable/disable hot reload
EASY_MCP_SERVER_HOT_RELOAD=true

# API directory
EASY_MCP_SERVER_API_PATH=./api

# MCP directory
EASY_MCP_SERVER_MCP_BASE_PATH=./mcp

# Hot reload debounce delay (ms)
EASY_MCP_SERVER_HOT_RELOAD_DELAY=1000
```

### Hot Reload File Structure
```
project/
├── api/                    # API files (auto-reloaded)
│   ├── users/
│   │   ├── get.js
│   │   └── post.js
│   └── products/
│       └── get.js
├── mcp/
│   ├── prompts/           # Prompt files (auto-reloaded)
│   │   ├── chat.md
│   │   └── analysis.json
│   └── resources/         # Resource files (auto-reloaded)
│       ├── guides/
│       └── templates/
└── .env                   # Environment files (auto-reloaded)
```

---

## 🏗 **Development Workflow**

### 1. Create API Endpoints
```javascript
const BaseAPI = require('easy-mcp-server/base-api');

class MyAPI extends BaseAPI {
  process(req, res) {
    res.json({ message: 'Hello World' });
  }
}

module.exports = MyAPI;
```

### 2. Add Annotations (Optional)
```javascript
/**
 * @description Get user information
 * @summary Retrieve user details
 * @tags users
 * @requestBody { "type": "object", "required": ["userId"], "properties": { "userId": { "type": "string" } } }
 */
```

### 3. Start and Test
```bash
# Start development server
easy-mcp-server

# Test REST API
curl http://localhost:8887/users

# Test MCP tools
curl -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### 4. Access Points
- 🌐 **REST API**: http://localhost:8887
- 🤖 **MCP Server**: http://localhost:8888
- 📚 **OpenAPI**: http://localhost:8887/openapi.json
- 🔍 **Swagger UI**: http://localhost:8887/docs

---

## 🚀 **Production Deployment**

### Environment Configuration
```bash
EASY_MCP_SERVER_PORT=8887
EASY_MCP_SERVER_MCP_PORT=8888
NODE_ENV=production
OPENAI_API_KEY=your-key-here
```

### Using Enhanced Utilities
```javascript
const { BaseAPIEnhanced } = require('easy-mcp-server/lib/base-api-enhanced');

class ProductionAPI extends BaseAPIEnhanced {
  constructor() {
    super('my-service', {
      llm: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY }
    });
  }

  async handleRequest(req, res) {
    // LLM services available via this.llm
    // Standardized responses via this.responseUtils
  }
}
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8887 8888
CMD ["npx", "easy-mcp-server"]
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: easy-mcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: easy-mcp-server
  template:
    metadata:
      labels:
        app: easy-mcp-server
    spec:
      containers:
      - name: easy-mcp-server
        image: your-registry/easy-mcp-server:latest
        ports:
        - containerPort: 8887
        - containerPort: 8888
        env:
        - name: NODE_ENV
          value: "production"
```

---

## 📊 **Monitoring and Logging**

### Health Checks
```javascript
// Automatic health check endpoint
GET /health
```

### Structured Logging
```javascript
const Logger = require('easy-mcp-server/utils/logger');
const logger = new Logger({ service: 'my-api' });

logger.info('Request processed', { userId: 123 });
logger.logRequest(req);
logger.logMCPCall('tool', params, result, duration);
```

### Enhanced Health Monitoring
```javascript
const { BaseAPIEnhanced } = require('easy-mcp-server/lib/base-api-enhanced');

class HealthAPI extends BaseAPIEnhanced {
  async process(req, res) {
    const status = await this.getServiceStatus();
    const metrics = await this.getMetrics();
    
    this.responseUtils.sendSuccessResponse(res, {
      status: status.isInitialized ? 'healthy' : 'degraded',
      components: status.components,
      metrics: metrics
    });
  }
}
```

---

## 🔒 **Security Considerations**

### Input Validation
```javascript
const APIResponseUtils = require('easy-mcp-server/lib/api-response-utils');

const validation = APIResponseUtils.validateRequestBody(req.body, schema);
if (!validation.isValid) {
  return APIResponseUtils.sendValidationErrorResponse(res, validation.errors);
}
```

### Rate Limiting
```javascript
// Built-in rate limiting
await this.rateLimit.check(req.ip);
```

### Authentication
```javascript
// Custom authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token || !validateToken(token)) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      errorCode: 'UNAUTHORIZED'
    });
  }
  next();
};
```

### CORS Configuration
```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
```

---

## 🔧 **Troubleshooting**

### Common Issues
| Issue | Solution |
|-------|----------|
| **Port conflicts** | Check if ports 8887/8888 are available |
| **File not found** | Ensure API files are in the `api/` directory |
| **MCP connection** | Verify MCP server is running on correct port |
| **Validation errors** | Verify request body matches schema |
| **Hot reload not working** | Check if `EASY_MCP_SERVER_HOT_RELOAD=true` is set |

### Debug Mode
```bash
DEBUG=* easy-mcp-server
```

### Health Check
```bash
curl http://localhost:8887/health
curl http://localhost:8888/health
```

### Hot Reload Debugging
```bash
# Check hot reload status
curl http://localhost:8887/health | jq '.hotReload'

# Monitor hot reload logs
tail -f logs/hot-reload.log
```

---

## 🚀 **Advanced Features**

### Custom Middleware
```javascript
class CustomMiddlewareAPI extends BaseAPI {
  constructor() {
    super();
    this.middleware = [
      this.logRequest.bind(this),
      this.validateAuth.bind(this),
      this.rateLimit.bind(this)
    ];
  }

  logRequest(req, res, next) {
    console.log(`${req.method} ${req.path}`);
    next();
  }
}
```

### WebSocket Support
```javascript
class WebSocketAPI extends BaseAPI {
  process(req, res) {
    if (req.headers.upgrade === 'websocket') {
      this.handleWebSocket(req, res);
    } else {
      res.json({ message: 'WebSocket endpoint' });
    }
  }
}
```

### MCP Bridge Configuration
The framework supports multiple MCP servers through environment variables:

```bash
# GitHub MCP Server
EASY_MCP_SERVER.github.token=your_github_token_here
EASY_MCP_SERVER.github.api_url=https://api.github.com

# Postgres MCP Server
EASY_MCP_SERVER.postgres.host=localhost
EASY_MCP_SERVER.postgres.db=myapp
EASY_MCP_SERVER.postgres.user=postgres
EASY_MCP_SERVER.postgres.password=secret
EASY_MCP_SERVER.postgres.port=5432

# Chrome DevTools
EASY_MCP_SERVER.chrome.debug_port=9222
EASY_MCP_SERVER.chrome.user_data_dir=/tmp/chrome-profile

# iTerm2
EASY_MCP_SERVER.iterm2.session_id=w0t0p0
EASY_MCP_SERVER.iterm2.profile=Default
```

---

## ✅ **Best Practices Summary**

1. **Use descriptive file names** that match your API paths
2. **Follow REST conventions** for HTTP methods and status codes
3. **Add JSDoc annotations** for better documentation
4. **Use enhanced utilities** for production applications
5. **Implement proper error handling** with standardized responses
6. **Monitor performance** with built-in logging
7. **Test thoroughly** with the provided test utilities
8. **Document your APIs** with clear descriptions and examples
9. **Use environment variables** for configuration
10. **Implement proper security** measures

---

## 📋 **Configuration Reference**

### Environment Variables
```bash
# Server Configuration
EASY_MCP_SERVER_PORT=8887                    # REST API port
EASY_MCP_SERVER_MCP_PORT=8888                # MCP server port
HOST=0.0.0.0                # Server host
NODE_ENV=production         # Environment

# Hot Reload Configuration
EASY_MCP_SERVER_HOT_RELOAD=true              # Enable hot reload
EASY_MCP_SERVER_API_PATH=./api               # API directory
EASY_MCP_SERVER_MCP_BASE_PATH=./mcp          # MCP directory
EASY_MCP_SERVER_HOT_RELOAD_DELAY=1000        # Debounce delay (ms)

# MCP Bridge Configuration
EASY_MCP_SERVER_BRIDGE_CONFIG_PATH=mcp-bridge.json
EASY_MCP_SERVER_BRIDGE_ENABLED=true

# LLM Configuration
OPENAI_API_KEY=your-key-here
ANTHROPIC_API_KEY=your-key-here
LLM_PROVIDER=openai

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json

# Security Configuration
CORS_ORIGIN=*
RATE_LIMIT=100
SESSION_SECRET=your-secret
```

### CLI Options
```bash
easy-mcp-server [options]

Options:
  (No CLI options - use environment variables)
  --help                 Show help
```

---

## 📚 **Related Documentation**

| Document | Purpose | Best For |
|----------|---------|----------|
| **[README](README.md)** | Quick start and overview | Getting started |
| **[Agent Context](Agent.md)** | AI agent integration guide | Building AI-powered applications |
| **[Health Monitoring](#-monitoring-and-logging)** | Monitoring and observability | Production monitoring |

### 📋 **Quick Reference**
- **Getting Started**: [README Quick Start](README.md#-quick-start) → [Framework Quick Start](#-quick-start)
- **AI Integration**: [Agent Context](Agent.md) → [MCP Integration](#-mcp-integration)
- **Production**: [Production Deployment](#-production-deployment) → [Health Monitoring](#-monitoring-and-logging)
- **Advanced**: [Advanced Features](#-advanced-features) → [Best Practices](#-best-practices-summary)

---

**📚 This comprehensive guide covers all aspects of the easy-mcp-server framework. For specific use cases, refer to the specialized guides in the resources directory.**