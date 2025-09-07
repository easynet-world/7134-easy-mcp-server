# Easy MCP Server Framework Guide

## Overview
This guide covers best practices for building APIs with the Easy MCP Server framework, including MCP integration, API design, and deployment strategies.

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
  // Your auth logic here
  next();
};
```

## Troubleshooting

### Common Issues
1. **Port conflicts** - Check if ports 3000/3001 are available
2. **File not found** - Ensure API files are in the `api/` directory
3. **MCP connection** - Verify MCP server is running on correct port
4. **Redis connection** - Check Redis server status

### Debug Mode
```bash
DEBUG=* easy-mcp-server
```

### Logs
- Application logs: Console output
- MCP logs: MCP server console
- Error logs: Structured error reporting

## Best Practices Summary

1. **Use descriptive file names** that match your API paths
2. **Follow REST conventions** for HTTP methods and status codes
3. **Add JSDoc annotations** for better documentation
4. **Use enhanced utilities** for production applications
5. **Implement proper error handling** with standardized responses
6. **Monitor performance** with built-in logging
7. **Test thoroughly** with the provided test utilities
8. **Document your APIs** with clear descriptions and examples