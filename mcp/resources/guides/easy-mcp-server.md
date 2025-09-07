# easy-mcp-server Framework Guide

## Overview
This comprehensive guide covers all aspects of building APIs with the easy-mcp-server framework, including MCP integration, API design, deployment strategies, and advanced features.

## Table of Contents
1. [Framework Features](#framework-features)
2. [API Design Best Practices](#api-design-best-practices)
3. [MCP Integration](#mcp-integration)
4. [Development Workflow](#development-workflow)
5. [Production Deployment](#production-deployment)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices Summary](#best-practices-summary)

## Framework Features

### Core Capabilities
- **Dynamic API Discovery** - Automatic endpoint scanning from file structure
- **MCP Integration** - Your APIs become AI tools automatically
- **OpenAPI Generation** - Complete API documentation generated automatically
- **Hot Reloading** - Instant updates during development
- **Multiple Transports** - HTTP, WebSocket, and Server-Sent Events

### Enhanced Utilities
- **BaseAPIEnhanced** - Enhanced API class with Redis, LLM, and logging
- **APIResponseUtils** - Standardized response formatting
- **RedisClient** - Caching and session management
- **LLMService** - AI integration with OpenAI and mock services
- **Logger** - Structured logging with context awareness

### File Structure Rules
- **File Path = API Path**: `api/users/profile/get.js` → `GET /users/profile`
- **File Name = HTTP Method**: `get.js` → `GET`, `post.js` → `POST`, etc.
- **One Function = Everything**: A single `process()` method generates REST API, MCP tools, OpenAPI docs, and more

### Supported HTTP Methods
- `get.js` → GET
- `post.js` → POST  
- `put.js` → PUT
- `patch.js` → PATCH
- `delete.js` → DELETE
- `head.js` → HEAD
- `options.js` → OPTIONS

## API Design Best Practices

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
- **GET** - Retrieve data
- **POST** - Create new resources
- **PUT** - Update entire resources
- **PATCH** - Partial updates
- **DELETE** - Remove resources

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
 * @requestBody {
 *   "type": "object",
 *   "properties": {
 *     "limit": { "type": "number", "default": 10 },
 *     "offset": { "type": "number", "default": 0 },
 *     "filter": { "type": "string" }
 *   }
 * }
 * @responseSchema {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" },
 *     "data": { "type": "object" },
 *     "message": { "type": "string" }
 *   }
 * }
 */
```

## MCP Integration

### Automatic Tool Generation
Your API endpoints automatically become MCP tools that AI models can call:

```javascript
// This API endpoint
class GetUsers extends BaseAPI {
  process(req, res) {
    res.json({ users: [] });
  }
}

// Becomes this MCP tool
{
  "name": "get_users",
  "description": "Get all users",
  "inputSchema": { /* auto-generated */ }
}
```

### MCP Server Endpoints
- **Tools Discovery**: `tools/list` - Discover all available API endpoints as tools
- **Tool Execution**: `tools/call` - Execute specific API endpoints with parameters
- **Prompts Management**: `prompts/list` and `prompts/get` - Access template-based prompts
- **Resources Access**: `resources/list` and `resources/read` - Access documentation and data

### Custom Prompts
Create reusable prompt templates:

```javascript
this.prompts = [{
  name: 'code_review',
  description: 'Review code for best practices',
  template: 'Please review this {{language}} code...',
  arguments: [
    { name: 'language', required: true },
    { name: 'code', required: true }
  ]
}];
```

### Custom Resources
Provide documentation and data access:

```javascript
this.resources = [{
  uri: 'resource://api-docs',
  name: 'API Documentation',
  description: 'Complete API reference',
  mimeType: 'text/markdown',
  content: '# API Documentation...'
}];
```

## Development Workflow

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
 * @requestBody {
 *   "type": "object",
 *   "required": ["userId"],
 *   "properties": {
 *     "userId": { "type": "string" }
 *   }
 * }
 */
```

### 3. Start Development Server
```bash
easy-mcp-server
```

### 4. Access Everything
- **REST API**: `http://localhost:3000`
- **MCP Server**: `http://localhost:3001`
- **OpenAPI**: `http://localhost:3000/openapi.json`
- **Swagger UI**: `http://localhost:3000/docs`

### 5. Test Your APIs
```bash
# Test REST API
curl http://localhost:3000/users

# Test MCP Tools
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Production Deployment

### Environment Configuration
```bash
PORT=3000
MCP_PORT=3001
NODE_ENV=production
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your-key-here
```

### Using Enhanced Utilities
```javascript
const { BaseAPIEnhanced } = require('easy-mcp-server/lib/base-api-enhanced');

class ProductionAPI extends BaseAPIEnhanced {
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
EXPOSE 3000 3001

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
        - containerPort: 3000
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          value: "redis://redis-service:6379"
```

## Monitoring and Logging

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

### Performance Monitoring
- Response time tracking
- Error rate monitoring
- MCP call analytics
- Resource utilization

### Metrics Collection
```javascript
const { BaseAPIEnhanced } = require('easy-mcp-server/lib/base-api-enhanced');

class MetricsAPI extends BaseAPIEnhanced {
  async process(req, res) {
    const metrics = await this.getMetrics();
    
    this.responseUtils.sendSuccessResponse(res, {
      metrics: metrics,
      timestamp: new Date().toISOString()
    });
  }
}
```

## Security Considerations

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
// Built-in rate limiting with Redis
await this.redis.set(`rate_limit:${req.ip}`, count, 60);
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

## Troubleshooting

### Common Issues
1. **Port conflicts** - Check if ports 3000/3001 are available
2. **File not found** - Ensure API files are in the `api/` directory
3. **MCP connection** - Verify MCP server is running on correct port
4. **Redis connection** - Check Redis server status
5. **Validation errors** - Verify request body matches schema

### Debug Mode
```bash
DEBUG=* easy-mcp-server
```

### Logs
- Application logs: Console output
- MCP logs: MCP server console
- Error logs: Structured error reporting

### Health Check
```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
```

## Advanced Features

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

  validateAuth(req, res, next) {
    // Authentication logic
    next();
  }

  rateLimit(req, res, next) {
    // Rate limiting logic
    next();
  }
}
```

### WebSocket Support
```javascript
class WebSocketAPI extends BaseAPI {
  process(req, res) {
    // WebSocket upgrade
    if (req.headers.upgrade === 'websocket') {
      this.handleWebSocket(req, res);
    } else {
      res.json({ message: 'WebSocket endpoint' });
    }
  }

  handleWebSocket(req, res) {
    // WebSocket handling logic
  }
}
```

### Server-Sent Events
```javascript
class SSEAPI extends BaseAPI {
  process(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const interval = setInterval(() => {
      res.write(`data: ${JSON.stringify({ timestamp: new Date() })}\n\n`);
    }, 1000);

    req.on('close', () => {
      clearInterval(interval);
    });
  }
}
```

## Best Practices Summary

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

## API Examples

### Basic CRUD Operations
```javascript
// GET /users
class GetUsers extends BaseAPI {
  process(req, res) {
    res.json({ users: [] });
  }
}

// POST /users
class CreateUser extends BaseAPI {
  process(req, res) {
    const { name, email } = req.body;
    res.json({ id: 1, name, email });
  }
}

// PUT /users/:id
class UpdateUser extends BaseAPI {
  process(req, res) {
    const { id } = req.params;
    const updateData = req.body;
    res.json({ id, ...updateData });
  }
}

// DELETE /users/:id
class DeleteUser extends BaseAPI {
  process(req, res) {
    const { id } = req.params;
    res.json({ message: `User ${id} deleted` });
  }
}
```

### Advanced API with Validation
```javascript
class AdvancedAPI extends BaseAPI {
  process(req, res) {
    const { body, params, query } = req;
    
    // Input validation
    if (!body.name || body.name.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Name must be at least 2 characters',
        errorCode: 'VALIDATION_ERROR'
      });
    }
    
    // Process request
    const result = this.processData(body, params, query);
    
    // Success response
    res.json({
      success: true,
      data: result,
      message: 'Operation completed successfully',
      timestamp: new Date().toISOString()
    });
  }
}
```

## Configuration Reference

### Environment Variables
```bash
# Server Configuration
PORT=3000                    # REST API port
MCP_PORT=3001               # MCP server port
HOST=0.0.0.0                # Server host
NODE_ENV=production         # Environment

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

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
  --port <number>        REST API port (default: 3000)
  --mcp-port <number>    MCP server port (default: 3001)
  --host <string>        Server host (default: 0.0.0.0)
  --api-dir <string>     API directory (default: ./api)
  --mcp-dir <string>     MCP directory (default: ./mcp)
  --config <string>      Configuration file
  --debug                Enable debug mode
  --help                 Show help
```

This comprehensive guide covers all aspects of the easy-mcp-server framework. For specific use cases, refer to the specialized guides in the resources directory.