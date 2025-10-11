# AI Agent Integration Guide

> **Complete guide for integrating AI agents with easy-mcp-server using the Model Context Protocol (MCP)**

## Overview

easy-mcp-server provides native AI agent integration through the Model Context Protocol (MCP) 2024-11-05 standard. Every API endpoint automatically becomes an AI-callable tool, enabling seamless interaction between AI models and your backend services.

## Quick Start for AI Agents

### Connection Setup

Connect to the MCP server using WebSocket or HTTP:

**WebSocket Connection:**
```
ws://localhost:8888
```

**HTTP Connection:**
```
POST http://localhost:8888/mcp
Content-Type: application/json
```

### Initialize Connection

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "roots": {
        "listChanged": true
      }
    },
    "clientInfo": {
      "name": "your-ai-agent",
      "version": "1.0.0"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "prompts": {},
      "resources": {}
    },
    "serverInfo": {
      "name": "easy-mcp-server",
      "version": "1.0.111"
    }
  }
}
```

---

## MCP Protocol Capabilities

### 1. Tools (API Endpoints)

Every API endpoint automatically becomes an MCP tool.

#### List Available Tools

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "api__users_get",
        "description": "Get user information with optional filtering",
        "inputSchema": {
          "type": "object",
          "properties": {
            "limit": {
              "type": "number",
              "description": "Maximum number of users to return",
              "default": 10
            }
          }
        }
      },
      {
        "name": "api__users_post",
        "description": "Create a new user",
        "inputSchema": {
          "type": "object",
          "required": ["name", "email"],
          "properties": {
            "name": {
              "type": "string",
              "minLength": 2
            },
            "email": {
              "type": "string",
              "format": "email"
            }
          }
        }
      }
    ]
  }
}
```

#### Call a Tool

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "api__users_post",
    "arguments": {
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\":true,\"data\":{\"id\":123,\"name\":\"John Doe\",\"email\":\"john@example.com\",\"status\":\"active\"},\"message\":\"User created successfully\"}"
      }
    ]
  }
}
```

---

### 2. Prompts (AI Templates)

Access reusable prompt templates for common AI tasks.

#### List Available Prompts

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "prompts/list"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "prompts": [
      {
        "name": "user-recommendations",
        "description": "Generate personalized product recommendations for users",
        "arguments": [
          {
            "name": "user",
            "description": "User data including preferences and history",
            "required": true
          },
          {
            "name": "products",
            "description": "Available products to recommend from",
            "required": true
          }
        ]
      },
      {
        "name": "product-analysis",
        "description": "Analyze product performance and market trends",
        "arguments": [
          {
            "name": "products",
            "description": "Product data to analyze",
            "required": true
          }
        ]
      }
    ]
  }
}
```

#### Get a Prompt

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "prompts/get",
  "params": {
    "name": "user-recommendations",
    "arguments": {
      "user": "{\"id\":1,\"preferences\":[\"electronics\",\"books\"]}",
      "products": "[{\"name\":\"Laptop\",\"category\":\"electronics\"},{\"name\":\"Novel\",\"category\":\"books\"}]"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "description": "Generate personalized product recommendations",
    "messages": [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "# User Recommendations\n\n## Role\nAI recommendation engine for personalized product suggestions.\n\n## Input\n- User: {\"id\":1,\"preferences\":[\"electronics\",\"books\"]}\n- Products: [{\"name\":\"Laptop\",\"category\":\"electronics\"},{\"name\":\"Novel\",\"category\":\"books\"}]\n\n## Process\n1. Profile Analysis: User preferences and behavior\n2. Product Matching: Match attributes to preferences\n3. Scoring: Rank potential matches\n4. Diversity: Ensure variety and relevance\n\n## Output\nGenerate 3 recommendations with brief reasoning for each."
        }
      }
    ]
  }
}
```

---

### 3. Resources (Documentation & Data)

Access API documentation and business context.

#### List Available Resources

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "resources/list"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {
    "resources": [
      {
        "uri": "resource://api-documentation",
        "name": "API Documentation",
        "description": "Complete API reference and usage guide",
        "mimeType": "text/markdown"
      },
      {
        "uri": "resource://business-context",
        "name": "Business Context",
        "description": "Company goals and AI use cases",
        "mimeType": "text/markdown"
      }
    ]
  }
}
```

#### Read a Resource

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "resources/read",
  "params": {
    "uri": "resource://api-documentation"
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "contents": [
      {
        "uri": "resource://api-documentation",
        "mimeType": "text/markdown",
        "text": "# API Documentation\n\n## Overview\nUser management API with AI integration...\n\n## Endpoints\n\n### GET /users\nRetrieve user data with filtering and pagination..."
      }
    ]
  }
}
```

---

## AI Agent Use Cases

### 1. User Management Automation

**Scenario**: AI agent creates and manages users based on natural language requests.

```javascript
// User: "Create a new admin user named Alice with email alice@company.com"

// AI Agent calls:
{
  "method": "tools/call",
  "params": {
    "name": "api__users_post",
    "arguments": {
      "name": "Alice",
      "email": "alice@company.com",
      "role": "admin"
    }
  }
}
```

### 2. Intelligent Product Recommendations

**Scenario**: AI agent analyzes user behavior and generates personalized recommendations.

```javascript
// Step 1: Get user data
{
  "method": "tools/call",
  "params": {
    "name": "api__users_get",
    "arguments": { "id": 123 }
  }
}

// Step 2: Get available products
{
  "method": "tools/call",
  "params": {
    "name": "api__products_get",
    "arguments": {}
  }
}

// Step 3: Use recommendation prompt
{
  "method": "prompts/get",
  "params": {
    "name": "user-recommendations",
    "arguments": {
      "user": "<user_data>",
      "products": "<products_data>"
    }
  }
}
```

### 3. Business Intelligence Analysis

**Scenario**: AI agent performs product analysis and provides insights.

```javascript
// Step 1: Get products data
{
  "method": "tools/call",
  "params": {
    "name": "api__products_get",
    "arguments": {}
  }
}

// Step 2: Analyze with AI prompt
{
  "method": "prompts/get",
  "params": {
    "name": "product-analysis",
    "arguments": {
      "products": "<products_data>"
    }
  }
}
```

---

## Real-Time Updates (Server-Sent Events)

Subscribe to real-time notifications about tool, prompt, and resource changes.

**Connect to SSE:**
```
GET http://localhost:8888/sse
Accept: text/event-stream
```

**Event Types:**
- `tools/list_changed` - API endpoints updated
- `prompts/list_changed` - Prompts modified
- `resources/list_changed` - Resources updated
- `resources/updated` - Specific resource changed

**Example Event:**
```
event: tools/list_changed
data: {"timestamp":"2024-01-15T10:30:00.000Z","reason":"hot_reload"}
```

---

## Error Handling

### Standard Error Response

```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": {
      "details": "Detailed error information"
    }
  }
}
```

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `-32700` | Parse error | Check JSON syntax |
| `-32600` | Invalid request | Verify request format |
| `-32601` | Method not found | Check method name |
| `-32602` | Invalid params | Verify parameters |
| `-32603` | Internal error | Check server logs |

### Tool Execution Errors

When a tool call fails, the error is returned in the response:

```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\":false,\"error\":\"Validation failed\",\"errorCode\":\"VALIDATION_ERROR\",\"details\":{\"field\":\"email\",\"message\":\"Invalid email format\"}}"
      }
    ],
    "isError": true
  }
}
```

---

## Best Practices for AI Agents

### 1. Initialize Connection First

Always send the `initialize` request before using any other methods.

### 2. Cache Tool Definitions

Cache the `tools/list` response to avoid repeated calls. Subscribe to SSE for updates.

### 3. Handle Errors Gracefully

```javascript
async function callTool(name, arguments) {
  try {
    const response = await mcpClient.call('tools/call', { name, arguments });
    const result = JSON.parse(response.content[0].text);
    
    if (!result.success) {
      console.error(`Tool ${name} failed:`, result.error);
      return null;
    }
    
    return result.data;
  } catch (error) {
    console.error(`MCP call failed:`, error);
    return null;
  }
}
```

### 4. Use Prompts for Complex Tasks

Leverage built-in prompts for common operations instead of crafting prompts from scratch.

### 5. Read Resources for Context

Before performing operations, read relevant resources to understand:
- API capabilities and limitations
- Business rules and requirements
- Data schemas and validation rules

### 6. Respect Rate Limits

The server may implement rate limiting. Handle 429 responses appropriately:

```javascript
if (response.error?.code === 429) {
  const retryAfter = response.error.data?.retryAfter || 60;
  await sleep(retryAfter * 1000);
  return callTool(name, arguments); // Retry
}
```

---

## Integration Examples

### Claude Desktop Integration

Add to Claude's MCP configuration:

```json
{
  "mcpServers": {
    "easy-mcp-server": {
      "command": "npx",
      "args": ["easy-mcp-server"],
      "env": {
        "EASY_MCP_SERVER_PORT": "8887",
        "EASY_MCP_SERVER_MCP_PORT": "8888"
      }
    }
  }
}
```

### Custom Python Agent

```python
import asyncio
import websockets
import json

async def connect_to_mcp():
    uri = "ws://localhost:8888"
    
    async with websockets.connect(uri) as websocket:
        # Initialize
        await websocket.send(json.dumps({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "clientInfo": {"name": "python-agent", "version": "1.0.0"}
            }
        }))
        
        response = await websocket.recv()
        print(f"Connected: {response}")
        
        # List tools
        await websocket.send(json.dumps({
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list"
        }))
        
        tools = await websocket.recv()
        print(f"Available tools: {tools}")
        
        # Call a tool
        await websocket.send(json.dumps({
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "api__users_get",
                "arguments": {"limit": 5}
            }
        }))
        
        result = await websocket.recv()
        print(f"Tool result: {result}")

asyncio.run(connect_to_mcp())
```

### Node.js Integration

```javascript
const WebSocket = require('ws');

class MCPClient {
  constructor(url = 'ws://localhost:8888') {
    this.url = url;
    this.ws = null;
    this.pendingRequests = new Map();
    this.nextId = 1;
  }
  
  async connect() {
    this.ws = new WebSocket(this.url);
    
    return new Promise((resolve, reject) => {
      this.ws.on('open', () => resolve());
      this.ws.on('error', reject);
      
      this.ws.on('message', (data) => {
        const response = JSON.parse(data);
        const pending = this.pendingRequests.get(response.id);
        
        if (pending) {
          if (response.error) {
            pending.reject(new Error(response.error.message));
          } else {
            pending.resolve(response.result);
          }
          this.pendingRequests.delete(response.id);
        }
      });
    });
  }
  
  async call(method, params = {}) {
    const id = this.nextId++;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      this.ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params
      }));
    });
  }
  
  async initialize() {
    return this.call('initialize', {
      protocolVersion: '2024-11-05',
      clientInfo: { name: 'node-agent', version: '1.0.0' }
    });
  }
  
  async listTools() {
    return this.call('tools/list');
  }
  
  async callTool(name, arguments) {
    return this.call('tools/call', { name, arguments });
  }
}

// Usage
(async () => {
  const client = new MCPClient();
  await client.connect();
  await client.initialize();
  
  const tools = await client.listTools();
  console.log('Available tools:', tools);
  
  const result = await client.callTool('api__users_get', { limit: 10 });
  console.log('Result:', result);
})();
```

---

## Advanced Features

### Custom Tool Names

By default, tools are named `api__path_method`. Customize in JSDoc annotations:

```javascript
/**
 * @toolName getUserData
 * @description Get user information
 */
class GetUsers extends BaseAPI {
  process(req, res) {
    res.json({ users: [] });
  }
}
```

### Streaming Responses

For long-running operations, use streaming:

```javascript
async function* streamToolCall(name, arguments) {
  const response = await fetch('http://localhost:8888/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name, arguments, stream: true }
    })
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    yield decoder.decode(value);
  }
}
```

### Bridge to Other MCP Servers

easy-mcp-server can bridge to other MCP servers (Chrome DevTools, GitHub, etc.):

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${EASY_MCP_SERVER.github.token}"
      }
    }
  }
}
```

All bridged tools appear in `tools/list` automatically.

---

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to WebSocket
```bash
# Check if MCP server is running
curl http://localhost:8888/health

# Expected response:
{"status":"healthy","uptime":123,"connections":0}
```

### Tool Not Found

**Problem**: Tool not listed in `tools/list`
1. Verify API file exists in `api/` directory
2. Check file naming matches pattern: `{method}.js` (e.g., `get.js`, `post.js`)
3. Ensure class extends `BaseAPI` and exports properly
4. Check server logs for loading errors

### Invalid Tool Arguments

**Problem**: Tool call fails with validation error

```json
{
  "success": false,
  "error": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  }
}
```

**Solution**: Check `inputSchema` in tool definition and adjust arguments.

### Prompt Not Available

**Problem**: Prompt not found in `prompts/list`
1. Verify prompt file exists in `mcp/prompts/` directory
2. Supported formats: `.md`, `.json`, `.yaml`, `.yml`, `.txt`
3. Check file naming (alphanumeric, hyphens, underscores only)
4. Restart server if hot reload didn't detect changes

---

## Performance Tips

### 1. Connection Pooling

Reuse WebSocket connections instead of creating new ones for each request.

### 2. Batch Requests

While MCP doesn't support batch requests natively, you can pipeline multiple requests:

```javascript
// Don't wait for each response
const promises = [
  client.callTool('api__users_get', {}),
  client.callTool('api__products_get', {}),
  client.callTool('api__orders_get', {})
];

const [users, products, orders] = await Promise.all(promises);
```

### 3. Cache Resources

Resources rarely change. Cache them locally and only refresh when receiving `resources/list_changed` notification.

### 4. Use SSE for Updates

Instead of polling `tools/list`, subscribe to SSE for real-time updates.

---

## Security Considerations

### 1. Authentication

Implement authentication in your API endpoints:

```javascript
class SecureAPI extends BaseAPI {
  process(req, res) {
    const token = req.headers.authorization;
    if (!token || !this.validateToken(token)) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Process authenticated request
  }
}
```

### 2. Rate Limiting

Protect your APIs from abuse:

```javascript
class RateLimitedAPI extends BaseAPI {
  constructor() {
    super();
    this.rateLimiter = new Map();
  }
  
  process(req, res) {
    const clientId = req.ip;
    const now = Date.now();
    const limit = this.rateLimiter.get(clientId) || { count: 0, resetAt: now + 60000 };
    
    if (now < limit.resetAt && limit.count >= 100) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((limit.resetAt - now) / 1000)
      });
    }
    
    // Update rate limit
    if (now >= limit.resetAt) {
      limit.count = 1;
      limit.resetAt = now + 60000;
    } else {
      limit.count++;
    }
    this.rateLimiter.set(clientId, limit);
    
    // Process request
  }
}
```

### 3. Input Validation

Always validate tool arguments:

```javascript
/**
 * @requestBody {
 *   "type": "object",
 *   "required": ["email"],
 *   "properties": {
 *     "email": {
 *       "type": "string",
 *       "format": "email",
 *       "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
 *     }
 *   }
 * }
 */
```

---

## Support & Resources

- **Main Documentation**: [README.md](README.md)
- **Development Guide**: [DEVELOPMENT.md](DEVELOPMENT.md)
- **LLM Integration**: [LLM.txt](LLM.txt)
- **GitHub Issues**: [Report Issues](https://github.com/easynet-world/7134-easy-mcp-server/issues)
- **MCP Protocol Spec**: [Model Context Protocol](https://modelcontextprotocol.io)

---

**🚀 Start building AI-powered applications with easy-mcp-server today!**

