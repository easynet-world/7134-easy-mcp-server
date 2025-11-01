# easy-mcp-server - LLM Context

## Framework Overview
easy-mcp-server is an enterprise-grade Node.js framework that automatically generates REST APIs, MCP tools, prompts, and resources from simple JavaScript classes. It provides AI models with comprehensive access to API functionality through the Model Context Protocol (MCP) 2024-11-05 standard, enabling seamless AI integration with convention-based development.

## Quick Start for New Projects

The fastest way to create a production-ready project:

```bash
npx easy-mcp-server init my-api-project
cd my-api-project
npm install
./start.sh
```

This creates a complete project with:
- Working API endpoints (GET & POST examples)
- MCP integration (prompts, resources, tools)
- Beautiful landing page
- Complete documentation
- Hot reload enabled
- Server management scripts (start.sh, stop.sh)
- MCP bridge configuration
- Test suite template
- Environment configuration

## Key LLM Integration Features

### Automatic MCP Tool Generation
- **API Endpoints → MCP Tools**: Every API endpoint automatically becomes an MCP tool
- **Schema Generation**: OpenAPI schemas are automatically converted to MCP tool schemas
- **Parameter Validation**: Request parameters are automatically validated
- **Response Formatting**: Standardized response formats for consistent AI interactions

### MCP Server Capabilities
- **Tools Discovery**: `tools/list` - Discover all available API endpoints as tools
- **Tool Execution**: `tools/call` - Execute specific API endpoints with parameters
- **Prompts Management**: `prompts/list` and `prompts/get` - Access template-based prompts
- **Resources Access**: `resources/list` and `resources/read` - Access documentation and data

### LLM-Optimized Features
- **Structured Responses**: All API responses follow consistent JSON schemas
- **Error Handling**: Standardized error responses with clear error codes
- **Context Awareness**: Built-in logging and context tracking for AI interactions
- **Hot Reloading**: Real-time updates to tools and resources without restart

### Native MCP Bridge Support (Chrome & iTerm2)

**🔌 Built-in Zero-Config Bridge**: `easy-mcp-server` natively supports MCP bridge to external MCP servers. Simply add `mcp-bridge.json` to enable powerful integrations:

**Chrome DevTools Operations** (via `chrome-devtools-mcp`):
- Browser automation: `new_page`, `navigate_page`, `click`, `fill`, `evaluate_script`
- Testing & debugging: `take_screenshot`, `take_snapshot`, `list_console_messages`
- Performance analysis: `emulate_network`, `emulate_cpu`, `list_network_requests`
- UI inspection: `hover`, `drag`, `handle_dialog`, `upload_file`
- 20+ additional browser control capabilities

**iTerm2 Terminal Operations** (via `iterm-mcp`):
- Terminal control: `write_to_terminal`, `read_terminal_output`, `send_control_character`
- Deployment automation: CI/CD pipelines, server operations
- System monitoring: Real-time log analysis and diagnostics

**Usage**: The `init` command automatically includes `mcp-bridge.json` with Chrome and iTerm2 pre-configured. Additional MCP servers (GitHub, Slack, PostgreSQL, Filesystem) are included as examples with `"disabled": true`.

## API Development Pattern for LLMs

### Basic API Class
```javascript
const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Brief description of what this endpoint does
 * @summary Short summary for OpenAPI
 * @tags category1,category2
 * @responseSchema { "type": "object", "properties": { "message": { "type": "string" } } }
 */
class MyAPI extends BaseAPI {
  process(req, res) {
    // Handle request and send response
    res.json({ message: 'Success' });
  }
}

module.exports = MyAPI;
```

### Advanced API with Annotations
```javascript
const BaseAPI = require('easy-mcp-server/base-api');

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
 *     "data": { "type": "object" },
 *     "message": { "type": "string" }
 *   }
 * }
 */
class CreateUser extends BaseAPI {
  process(req, res) {
    const { name, email } = req.body;
    
    // Validation is automatic based on @requestBody annotation
    // Response schema is automatically documented
    
    res.json({
      success: true,
      data: { id: 1, name, email },
      message: 'User created successfully'
    });
  }
}

module.exports = CreateUser;
```

## MCP Tool Examples

### Tool Discovery
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

### Tool Execution
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create_user",
    "arguments": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

### Prompts Access
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "prompts/get",
  "params": {
    "name": "api-documentation-generator",
    "arguments": {
      "endpointPath": "/users",
      "httpMethod": "GET",
      "description": "Get all users"
    }
  }
}
```

### Resources Access
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/read",
  "params": {
    "uri": "resource://easy-mcp-server-guide"
  }
}
```

## Enhanced Features for AI Integration

### BaseAPIEnhanced with LLM Services
```javascript
const { BaseAPIEnhanced } = require('easy-mcp-server/api/base-api-enhanced');

class AIEnhancedAPI extends BaseAPIEnhanced {
  constructor() {
    super('ai-service', {
      llm: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY }
    });
  }

  async process(req, res) {
    // LLM service available via this.llm
    const response = await this.llm.generateResponse({
      prompt: 'Analyze this data: ' + JSON.stringify(req.body),
      model: 'gpt-4'
    });
    
    this.responseUtils.sendSuccessResponse(res, { analysis: response });
  }
}
```

### Structured Logging for AI Context
```javascript
const Logger = require('easy-mcp-server/utils/logger');
const logger = new Logger({ service: 'ai-api' });

class LoggedAPI extends BaseAPI {
  process(req, res) {
    logger.info('AI request received', { 
      endpoint: req.path,
      method: req.method,
      userAgent: req.get('User-Agent')
    });
    
    // Process request
    res.json({ result: 'success' });
    
    logger.info('AI request completed', { 
      statusCode: res.statusCode,
      responseTime: Date.now() - req.startTime
    });
  }
}
```

## File Structure for LLM Tools

### Automatic Tool Naming
```
api/
├── users/
│   ├── get.js          → MCP tool: "get_users"
│   ├── post.js         → MCP tool: "post_users"
│   └── profile/
│       ├── get.js      → MCP tool: "get_users_profile"
│       └── put.js      → MCP tool: "put_users_profile"
└── products/
    ├── get.js          → MCP tool: "get_products"
    └── post.js         → MCP tool: "post_products"
```

### Tool Schema Generation
The framework automatically generates MCP tool schemas from:
- JSDoc annotations (`@description`, `@summary`, `@tags`, `@requestBody`, `@responseSchema`, `@errorResponses`)
- File structure (path and method)
- Parameter validation rules
- Response format standards

## Error Handling for AI Models

### Standardized Error Responses
```json
{
  "success": false,
  "error": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Recommended Error Codes

The framework supports custom error codes through the `errorCode` parameter in error responses. These are **recommended conventions** for consistency, not enforced by the framework:

- `VALIDATION_ERROR` - Request validation failed
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Access denied
- `RATE_LIMITED` - Too many requests
- `INTERNAL_ERROR` - Server error

**Note**: Error codes are optional and can be customized based on your application's needs. The framework provides flexibility while these conventions help maintain consistency across APIs.

## Best Practices for LLM Integration

### 1. Use Descriptive Annotations
```javascript
/**
 * @description Analyze user sentiment from text input
 * @summary Sentiment analysis endpoint
 * @tags ai,analysis
 * @requestBody { "type": "object", "required": ["text"], "properties": { "text": { "type": "string" } } }
 * @responseSchema { "type": "object", "properties": { "sentiment": { "type": "string" }, "confidence": { "type": "number" } } }
 */
```

### 2. Provide Clear Error Messages
```javascript
if (!req.body.text) {
  return res.status(400).json({
    success: false,
    error: "Text input is required",
    errorCode: "MISSING_TEXT"
  });
}
```

### 3. Use Standardized Response Formats
```javascript
res.json({
  success: true,
  data: { sentiment: 'positive', confidence: 0.95 },
  message: 'Analysis completed',
  timestamp: new Date().toISOString()
});
```

### 4. Implement Proper Validation
```javascript
const { body } = req;
if (!body.text || typeof body.text !== 'string') {
  return res.status(400).json({
    success: false,
    error: "Invalid text input",
    errorCode: "INVALID_INPUT"
  });
}
```

## MCP Server Endpoints

### HTTP Endpoints
- `POST /mcp` - MCP JSON-RPC requests
- `GET /sse` - Server-Sent Events for real-time updates
- `GET /health` - Health check endpoint

### WebSocket Support
- `ws://localhost:${EASY_MCP_SERVER_MCP_PORT:-8888}` - WebSocket MCP server
- Real-time tool updates
- Bidirectional communication

## Configuration for AI Models

### Environment Variables
```bash
EASY_MCP_SERVER_MCP_PORT=8888    # MCP server port
EASY_MCP_SERVER_LOG_LEVEL=info   # Logging level
OPENAI_API_KEY=your-key-here     # OpenAI API key
REDIS_URL=redis://localhost:6379 # Redis for caching
NODE_ENV=production              # Environment
```

### MCP Server Options
```javascript
const mcpServer = new DynamicAPIMCPServer({
  port: process.env.EASY_MCP_SERVER_MCP_PORT || 8888,
  host: '0.0.0.0',
  enableWebSocket: true,
  enableSSE: true
});
```

## Integration Examples

### OpenAI Integration
```javascript
class OpenAIAPI extends BaseAPIEnhanced {
  async process(req, res) {
    const { prompt } = req.body;
    
    const response = await this.llm.generateResponse({
      prompt,
      model: 'gpt-4',
      maxTokens: 1000
    });
    
    this.responseUtils.sendSuccessResponse(res, { response });
  }
}
```

### Anthropic Integration
```javascript
class AnthropicAPI extends BaseAPIEnhanced {
  async process(req, res) {
    const { message } = req.body;
    
    const response = await this.llm.generateResponse({
      prompt: message,
      model: 'claude-3-sonnet',
      maxTokens: 1000
    });
    
    this.responseUtils.sendSuccessResponse(res, { response });
  }
}
```

## Troubleshooting for AI Models

### Common Issues
1. **Tool Not Found**: Check if API file exists in correct path
2. **Validation Errors**: Verify request body matches schema
3. **Connection Issues**: Ensure MCP server is running on correct port
4. **Authentication**: Check API keys and permissions

### Debug Mode
```bash
EASY_MCP_SERVER_LOG_LEVEL=debug npx easy-mcp-server
```

### Health Check
```bash
curl http://localhost:${EASY_MCP_SERVER_MCP_PORT:-8888}/health
```

## Performance Considerations

### Caching
- Redis integration for response caching
- Automatic cache invalidation
- Configurable TTL settings

### Rate Limiting
- Built-in rate limiting per IP
- Configurable limits
- Redis-backed rate limiting

### Monitoring
- Request/response logging
- Performance metrics
- Error tracking
- Health monitoring

For complete framework documentation, see: [Framework Guide](mcp/resources/guides/easy-mcp-server.md)

## Supported JSDoc Annotations

The framework supports the following JSDoc annotations for automatic API documentation and MCP tool generation:

- **`@description`**: Detailed description of the API endpoint
- **`@summary`**: Brief summary for OpenAPI documentation
- **`@tags`**: Comma-separated tags for categorization
- **`@requestBody`**: JSON schema for request body validation
- **`@responseSchema`**: JSON schema for response structure
- **`@errorResponses`**: JSON schema for error response handling

These annotations enable automatic OpenAPI specification generation, MCP tool creation, and comprehensive API documentation without manual maintenance.