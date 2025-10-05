# easy-mcp-server - Agent Integration Guide

> **Transform your APIs into AI-callable tools with automatic MCP integration**

## 🎯 **Agent Capabilities**

| Feature | Description | Benefit |
|---------|-------------|---------|
| **Auto Tool Discovery** | APIs become MCP tools automatically | No manual tool creation |
| **Schema Generation** | Complete input/output schemas | Reliable parameter validation |
| **Context Awareness** | Built-in logging and tracking | Better agent understanding |
| **Hot Reloading** | Real-time tool updates | Seamless development |

## 🤖 **How It Works**

1. **Write API** → 2. **Auto MCP Tools** → 3. **AI Calls Your Functions**

## 🚀 **Quick Start for Agents**

### 1. Create Agent-Friendly API
```javascript
// api/users/get.js
const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Get all users with optional filtering
 * @summary Retrieve user list
 * @tags users,data-access
 */
class GetUsers extends BaseAPI {
  process(req, res) {
    const { limit = 10, offset = 0, filter } = req.body;
    
    // Agent-friendly response format
    res.json({
      success: true,
      data: { users: [], pagination: { limit, offset, total: 0 } },
      message: 'Users retrieved successfully',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = GetUsers;
```

### 2. AI Agent Calls Your API
```json
// Agent discovers tools automatically
{ "jsonrpc": "2.0", "id": 1, "method": "tools/list" }

// Agent calls your API
{ "jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": { "name": "get_users", "arguments": { "limit": 5 } } }
```

## 🛠 **Agent API Patterns**

### Data Retrieval
```javascript
class GetUserData extends BaseAPI {
  process(req, res) {
    const { userId } = req.params;
    res.json({
      success: true,
      data: { user: { id: userId, name: 'John Doe' } },
      message: 'User data retrieved',
      timestamp: new Date().toISOString()
    });
  }
}
```

### Data Modification
```javascript
class UpdateUserData extends BaseAPI {
  process(req, res) {
    const { userId } = req.params;
    const updateData = req.body;
    res.json({
      success: true,
      data: { user: { id: userId, ...updateData } },
      message: 'User updated successfully',
      timestamp: new Date().toISOString()
    });
  }
}
```

### Analysis
```javascript
class AnalyzeData extends BaseAPI {
  process(req, res) {
    const { data, analysisType } = req.body;
    res.json({
      success: true,
      data: { analysis: { type: analysisType, result: 'positive' }, confidence: 0.95 },
      message: 'Analysis completed',
      timestamp: new Date().toISOString()
    });
  }
}
```

## 🚀 **Enhanced Agent Features**

### BaseAPIEnhanced with Agent Context
```javascript
const { BaseAPIEnhanced } = require('easy-mcp-server/lib/base-api-enhanced');

class AgentAPI extends BaseAPIEnhanced {
  constructor() {
    super('agent-service', {
      llm: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY }
    });
  }

  async process(req, res) {
    const agentId = req.headers['x-agent-id'];
    
    // Log agent interaction
    this.logger.info('Agent API call', { agentId, endpoint: req.path });
    
    // Process with agent context
    const result = await this.processWithContext(req, agentId);
    
    this.responseUtils.sendSuccessResponse(res, result);
  }
}
```

### Agent Session Management
```javascript
class AgentSessionAPI extends BaseAPI {
  process(req, res) {
    const { agentId, action, data } = req.body;
    const session = this.getAgentSession(agentId);
    
    session[action](data); // start, update, end
    
    res.json({
      success: true,
      data: { session: session.getState() },
      message: `Session ${action} completed`,
      timestamp: new Date().toISOString()
    });
  }
}
```

## 🛠 **Agent Tool Categories**

| Category | Examples | Purpose |
|----------|----------|---------|
| **Data Access** | `get_users`, `get_products` | Retrieve information |
| **Data Modification** | `create_user`, `update_product` | Modify data |
| **Analysis** | `analyze_sentiment`, `generate_report` | Process & analyze |
| **Communication** | `send_notification`, `create_message` | Send messages |

## ⚠️ **Agent Error Handling**

### Standardized Error Responses
```javascript
class AgentErrorHandler extends BaseAPI {
  process(req, res) {
    try {
      const result = this.processRequest(req);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        errorCode: error.code || 'AGENT_ERROR',
        details: { suggestion: 'Try adjusting your parameters', retryable: true },
        timestamp: new Date().toISOString()
      });
    }
  }
}
```

### Common Error Codes
- `AGENT_ERROR` - General agent error
- `INVALID_PARAMETERS` - Parameter validation failed
- `RESOURCE_NOT_FOUND` - Requested resource not found
- `PERMISSION_DENIED` - Agent lacks required permissions
- `RATE_LIMITED` - Agent exceeded rate limits

## ⚙️ **Agent Configuration**

### Environment Variables
```bash
AGENT_PORT=8888                    # Agent MCP server port
AGENT_SESSION_TIMEOUT=3600         # Session timeout in seconds
AGENT_RATE_LIMIT=100               # Requests per minute
```

### Agent Settings
```javascript
const agentConfig = {
  sessionTimeout: 3600,
  rateLimit: 100,
  enableLogging: true,
  enableMetrics: true
};
```

## 📊 **Agent Monitoring**

### Health Check
```javascript
class AgentHealthCheck extends BaseAPI {
  process(req, res) {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      agentConnections: this.getAgentConnections(),
      activeSessions: this.getActiveSessions()
    });
  }
}
```

### Metrics
```javascript
class AgentMetrics extends BaseAPI {
  process(req, res) {
    res.json({
      success: true,
      data: {
        totalRequests: this.getTotalRequests(),
        activeAgents: this.getActiveAgents(),
        averageResponseTime: this.getAverageResponseTime(),
        errorRate: this.getErrorRate()
      }
    });
  }
}
```

## ✅ **Agent Best Practices**

### 1. Use Descriptive Tool Names
```javascript
// Good: Clear, descriptive names
class GetUserProfile extends BaseAPI { }
class UpdateUserSettings extends BaseAPI { }

// Avoid: Generic names
class ProcessData extends BaseAPI { }
```

### 2. Consistent Response Formats
```javascript
// Success response
res.json({
  success: true,
  data: { /* response data */ },
  message: 'Operation completed successfully',
  timestamp: new Date().toISOString()
});

// Error response
res.status(400).json({
  success: false,
  error: 'Error message',
  errorCode: 'ERROR_CODE',
  timestamp: new Date().toISOString()
});
```

### 3. Proper Validation
```javascript
if (!req.body.userId) {
  return res.status(400).json({
    success: false,
    error: "User ID is required",
    errorCode: "MISSING_USER_ID"
  });
}
```

## 🔗 **Integration Examples**

### OpenAI Agent Integration
```javascript
class OpenAIAgentAPI extends BaseAPIEnhanced {
  async process(req, res) {
    const { prompt, context } = req.body;
    
    const response = await this.llm.generateResponse({
      prompt: `${context}\n\n${prompt}`,
      model: 'gpt-4',
      maxTokens: 1000,
      temperature: 0.7
    });
    
    this.responseUtils.sendSuccessResponse(res, { response, context });
  }
}
```

## 🔧 **Troubleshooting**

### Common Issues
1. **Tool Not Found** - Verify API file exists and is properly named
2. **Parameter Errors** - Check request body matches expected schema
3. **Session Issues** - Ensure agent session is valid and not expired
4. **Rate Limiting** - Check if agent has exceeded rate limits

### Debug Mode
```bash
DEBUG=agent:* easy-mcp-server
```

### Health Check
```bash
curl -H "X-Agent-ID: test-agent" http://localhost:8888/health
```

---

## 📚 **Related Documentation**

| Document | Purpose | Best For |
|----------|---------|----------|
| **[Framework Guide](mcp/resources/guides/easy-mcp-server.md)** | Complete framework documentation | Deep dive, production setup |
| **[Health Monitoring](mcp/resources/guides/easy-mcp-server.md#-monitoring-and-logging)** | Monitoring and observability | Production monitoring |
| **[README](README.md)** | Quick start and overview | Getting started |

### 📋 **Quick Reference**
- **Getting Started**: [README Quick Start](README.md#-quick-start) → [Agent Quick Start](#-quick-start-for-agents)
- **Framework Details**: [Framework Guide](mcp/resources/guides/easy-mcp-server.md) → [Agent Integration](#-agent-capabilities)
- **Production**: [Health Monitoring](mcp/resources/guides/easy-mcp-server.md#-monitoring-and-logging) → [Agent Monitoring](#-agent-monitoring)