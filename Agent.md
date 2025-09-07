# easy-mcp-server - Agent Context

## Agent Integration Overview
easy-mcp-server provides AI agents with comprehensive access to API functionality through the Model Context Protocol (MCP) 2024-11-05 standard. Agents can discover, call, and interact with APIs as if they were native tools.

## Core Agent Capabilities

### Automatic Tool Discovery
Agents can automatically discover all available API endpoints as MCP tools:
- **Dynamic Discovery**: Tools are automatically generated from file structure
- **Schema Generation**: Complete input/output schemas for each tool
- **Parameter Validation**: Automatic validation of tool parameters
- **Error Handling**: Standardized error responses for agent understanding

### Agent-Optimized Features
- **Context Awareness**: Built-in logging and context tracking
- **Hot Reloading**: Real-time tool updates without restart
- **Multiple Transports**: HTTP, WebSocket, and Server-Sent Events
- **Structured Responses**: Consistent JSON schemas for reliable parsing

## Agent Development Workflow

### 1. Create API Endpoints
```bash
mkdir -p api/users
touch api/users/get.js
```

### 2. Implement Agent-Friendly APIs
```javascript
// api/users/get.js
const BaseAPI = require('easy-mcp-server/base-api');

/**
 * @description Get all users with optional filtering
 * @summary Retrieve user list
 * @tags users,data-access
 * @requestBody {
 *   "type": "object",
 *   "properties": {
 *     "limit": { "type": "number", "default": 10 },
 *     "offset": { "type": "number", "default": 0 },
 *     "filter": { "type": "string" }
 *   }
 * }
 */
class GetUsers extends BaseAPI {
  process(req, res) {
    const { limit = 10, offset = 0, filter } = req.body;
    
    // Agent-friendly response format
    res.json({
      success: true,
      data: {
        users: [],
        pagination: { limit, offset, total: 0 }
      },
      message: 'Users retrieved successfully',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = GetUsers;
```

### 3. Agent Tool Discovery
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

### 4. Agent Tool Execution
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_users",
    "arguments": {
      "limit": 5,
      "filter": "active"
    }
  }
}
```

## Agent-Specific API Patterns

### Data Retrieval APIs
```javascript
class GetUserData extends BaseAPI {
  process(req, res) {
    const { userId } = req.params;
    
    // Agent-friendly structured response
    res.json({
      success: true,
      data: {
        user: { id: userId, name: 'John Doe' },
        metadata: { retrievedAt: new Date().toISOString() }
      },
      message: 'User data retrieved',
      timestamp: new Date().toISOString()
    });
  }
}
```

### Data Modification APIs
```javascript
class UpdateUserData extends BaseAPI {
  process(req, res) {
    const { userId } = req.params;
    const updateData = req.body;
    
    // Agent-friendly response with confirmation
    res.json({
      success: true,
      data: {
        user: { id: userId, ...updateData },
        changes: updateData
      },
      message: 'User updated successfully',
      timestamp: new Date().toISOString()
    });
  }
}
```

### Analysis APIs
```javascript
class AnalyzeData extends BaseAPI {
  process(req, res) {
    const { data, analysisType } = req.body;
    
    // Agent-friendly analysis response
    res.json({
      success: true,
      data: {
        analysis: { type: analysisType, result: 'positive' },
        confidence: 0.95,
        insights: ['Key insight 1', 'Key insight 2']
      },
      message: 'Analysis completed',
      timestamp: new Date().toISOString()
    });
  }
}
```

## Enhanced Agent Features

### BaseAPIEnhanced for Agent Context
```javascript
const { BaseAPIEnhanced } = require('easy-mcp-server/lib/base-api-enhanced');

class AgentAPI extends BaseAPIEnhanced {
  constructor() {
    super('agent-service', {
      llm: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY },
      redis: { host: 'localhost', port: 6379 }
    });
  }

  async process(req, res) {
    // Agent context tracking
    const agentId = req.headers['x-agent-id'];
    const sessionId = req.headers['x-session-id'];
    
    // Log agent interaction
    this.logger.info('Agent API call', {
      agentId,
      sessionId,
      endpoint: req.path,
      method: req.method
    });
    
    // Process with agent context
    const result = await this.processWithContext(req, agentId);
    
    // Cache result for agent
    await this.redis.set(`agent:${agentId}:${req.path}`, JSON.stringify(result), 300);
    
    this.responseUtils.sendSuccessResponse(res, result);
  }
}
```

### Agent Session Management
```javascript
class AgentSessionAPI extends BaseAPI {
  process(req, res) {
    const { agentId, action, data } = req.body;
    
    // Agent session handling
    const session = this.getAgentSession(agentId);
    
    switch (action) {
      case 'start':
        session.start();
        break;
      case 'update':
        session.update(data);
        break;
      case 'end':
        session.end();
        break;
    }
    
    res.json({
      success: true,
      data: { session: session.getState() },
      message: `Session ${action} completed`,
      timestamp: new Date().toISOString()
    });
  }
}
```

## Agent Tool Categories

### Data Access Tools
- `get_users` - Retrieve user information
- `get_products` - Access product catalog
- `get_orders` - View order history
- `get_analytics` - Access analytics data

### Data Modification Tools
- `create_user` - Add new users
- `update_product` - Modify product information
- `process_order` - Handle order processing
- `update_settings` - Modify configuration

### Analysis Tools
- `analyze_sentiment` - Sentiment analysis
- `generate_report` - Create reports
- `predict_trends` - Trend prediction
- `classify_data` - Data classification

### Communication Tools
- `send_notification` - Send notifications
- `create_message` - Generate messages
- `schedule_task` - Schedule operations
- `monitor_status` - Status monitoring

## Agent Error Handling

### Standardized Error Responses
```javascript
class AgentErrorHandler extends BaseAPI {
  process(req, res) {
    try {
      // Process request
      const result = this.processRequest(req);
      res.json({ success: true, data: result });
    } catch (error) {
      // Agent-friendly error response
      res.status(400).json({
        success: false,
        error: error.message,
        errorCode: error.code || 'AGENT_ERROR',
        details: {
          suggestion: 'Try adjusting your parameters',
          retryable: true
        },
        timestamp: new Date().toISOString()
      });
    }
  }
}
```

### Common Agent Error Codes
- `AGENT_ERROR` - General agent error
- `INVALID_PARAMETERS` - Parameter validation failed
- `RESOURCE_NOT_FOUND` - Requested resource not found
- `PERMISSION_DENIED` - Agent lacks required permissions
- `RATE_LIMITED` - Agent exceeded rate limits
- `SESSION_EXPIRED` - Agent session expired

## Agent Configuration

### Environment Variables
```bash
AGENT_PORT=3001                    # Agent MCP server port
AGENT_SESSION_TIMEOUT=3600         # Session timeout in seconds
AGENT_RATE_LIMIT=100               # Requests per minute
AGENT_CACHE_TTL=300                # Cache TTL in seconds
```

### Agent-Specific Settings
```javascript
const agentConfig = {
  sessionTimeout: 3600,
  rateLimit: 100,
  cacheTTL: 300,
  enableLogging: true,
  enableMetrics: true
};
```

## Agent Monitoring

### Health Check for Agents
```javascript
class AgentHealthCheck extends BaseAPI {
  process(req, res) {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      agentConnections: this.getAgentConnections(),
      activeSessions: this.getActiveSessions()
    };
    
    res.json(health);
  }
}
```

### Agent Metrics
```javascript
class AgentMetrics extends BaseAPI {
  process(req, res) {
    const metrics = {
      totalRequests: this.getTotalRequests(),
      activeAgents: this.getActiveAgents(),
      averageResponseTime: this.getAverageResponseTime(),
      errorRate: this.getErrorRate(),
      topEndpoints: this.getTopEndpoints()
    };
    
    res.json({ success: true, data: metrics });
  }
}
```

## Agent Best Practices

### 1. Use Descriptive Tool Names
```javascript
// Good: Clear, descriptive names
class GetUserProfile extends BaseAPI { }
class UpdateUserSettings extends BaseAPI { }
class AnalyzeUserBehavior extends BaseAPI { }

// Avoid: Generic or unclear names
class ProcessData extends BaseAPI { }
class HandleRequest extends BaseAPI { }
```

### 2. Provide Clear Error Messages
```javascript
if (!req.body.userId) {
  return res.status(400).json({
    success: false,
    error: "User ID is required for this operation",
    errorCode: "MISSING_USER_ID",
    suggestion: "Please provide a valid user ID in the request body"
  });
}
```

### 3. Use Consistent Response Formats
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
  details: { /* additional error details */ },
  timestamp: new Date().toISOString()
});
```

### 4. Implement Proper Validation
```javascript
const { body } = req;
const validation = this.validateRequest(body, {
  userId: { type: 'string', required: true },
  action: { type: 'string', enum: ['create', 'update', 'delete'] },
  data: { type: 'object', required: true }
});

if (!validation.isValid) {
  return res.status(400).json({
    success: false,
    error: 'Validation failed',
    errorCode: 'VALIDATION_ERROR',
    details: validation.errors
  });
}
```

## Agent Integration Examples

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
    
    this.responseUtils.sendSuccessResponse(res, {
      response: response,
      context: context,
      timestamp: new Date().toISOString()
    });
  }
}
```

### Multi-Agent Coordination
```javascript
class MultiAgentAPI extends BaseAPI {
  async process(req, res) {
    const { agents, task, data } = req.body;
    
    // Coordinate multiple agents
    const results = await Promise.all(
      agents.map(agent => this.executeAgentTask(agent, task, data))
    );
    
    res.json({
      success: true,
      data: {
        results: results,
        coordination: {
          agents: agents.length,
          completed: results.filter(r => r.success).length
        }
      },
      message: 'Multi-agent task completed',
      timestamp: new Date().toISOString()
    });
  }
}
```

## Troubleshooting for Agents

### Common Agent Issues
1. **Tool Not Found**: Verify API file exists and is properly named
2. **Parameter Errors**: Check request body matches expected schema
3. **Session Issues**: Ensure agent session is valid and not expired
4. **Rate Limiting**: Check if agent has exceeded rate limits
5. **Permission Errors**: Verify agent has required permissions

### Debug Mode for Agents
```bash
DEBUG=agent:* easy-mcp-server
```

### Agent Health Check
```bash
curl -H "X-Agent-ID: test-agent" http://localhost:3001/health
```

For complete framework documentation, see: [Framework Guide](mcp/resources/guides/easy-mcp-server.md)