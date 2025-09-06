# Easy MCP Server - Agent Context

## Overview
Easy MCP Server is a dynamic API framework that automatically generates REST APIs, MCP tools, prompts, and resources from simple JavaScript classes. It provides AI agents with comprehensive access to API functionality through the Model Context Protocol (MCP) 2024-11-05 standard.

## Core Principles

### File Structure = API Structure
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

## API Development Pattern

### Basic API Class
```javascript
const BaseAPI = require('easy-mcp-server/base-api');

class MyAPI extends BaseAPI {
  process(req, res) {
    res.json({ message: 'Hello World' });
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
 *     "data": { "type": "object" }
 *   }
 * }
 */
class CreateUser extends BaseAPI {
  process(req, res) {
    const { name, email } = req.body;
    res.json({ success: true, data: { name, email, id: Date.now() } });
  }
}

module.exports = CreateUser;
```

## MCP Integration

### MCP Tools
All API endpoints automatically become MCP tools:
- **Auto-discovery**: Scans `api/` directory and creates tools
- **Rich schemas**: Input/output validation with OpenAPI integration
- **Real-time execution**: Execute API endpoints directly from AI models

### MCP Prompts
Template-based prompts with parameter substitution:
```javascript
class PromptAPI extends BaseAPI {
  constructor() {
    super();
    this.prompts = [{
      name: 'code_review',
      description: 'Review code for best practices',
      template: 'Please review this {{language}} code:\n\n```{{language}}\n{{code}}\n```',
      arguments: [
        { name: 'language', description: 'Programming language', required: true },
        { name: 'code', description: 'Code to review', required: true }
      ]
    }];
  }
}
```

### MCP Resources
Access to documentation, configuration, and data:
```javascript
class ResourceAPI extends BaseAPI {
  constructor() {
    super();
    this.resources = [{
      uri: 'config://server-settings',
      name: 'Server Configuration',
      description: 'Current server settings',
      mimeType: 'application/json',
      content: JSON.stringify({ port: 3000, features: ['tools', 'prompts', 'resources'] })
    }];
  }
}
```

## Available MCP Commands

### Tools
- `tools/list` - List all available API endpoints as tools
- `tools/call` - Execute a specific API endpoint

### Prompts
- `prompts/list` - List all available prompt templates
- `prompts/get` - Get a prompt with parameter substitution

### Resources
- `resources/list` - List all available resources
- `resources/read` - Read resource content by URI

### Utility
- `ping` - Health check

## Server Endpoints

### Framework Endpoints
- `GET /health` - Health check
- `GET /api-info` - Framework information
- `GET /openapi.json` - OpenAPI specification
- `GET /docs` - Swagger UI documentation
- `GET /LLM.txt` - AI context file
- `GET /Agent.md` - This agent context file

### MCP Server
- **URL**: `http://localhost:3001`
- **Type**: Streamable HTTP
- **WebSocket**: `ws://localhost:3001`

## Annotation System

### Supported Annotations
- `@description` - Detailed description
- `@summary` - Short summary
- `@tags` - Comma-separated tags
- `@requestBody` - JSON schema for request body
- `@responseSchema` - JSON schema for success response
- `@errorResponses` - Error response schemas

### Annotation Format
```javascript
/**
 * @requestBody {
 *   "type": "object",
 *   "properties": {
 *     "field": { "type": "string" }
 *   }
 * }
 */
```

## Development Workflow

### 1. Create API Endpoint
```bash
mkdir -p api/users
touch api/users/post.js
```

### 2. Implement API Class
```javascript
// api/users/post.js
const BaseAPI = require('easy-mcp-server/base-api');

class CreateUser extends BaseAPI {
  constructor() {
    super();
    
    // Define prompts for this API
    this.prompts = [{
      name: 'user_creation_prompt',
      description: 'Generate user creation documentation',
      template: 'Create a user with name: {{name}} and email: {{email}}',
      arguments: [
        { name: 'name', description: 'User name', required: true },
        { name: 'email', description: 'User email', required: true }
      ]
    }];
    
    // Define resources for this API
    this.resources = [{
      uri: 'users://schema',
      name: 'User Schema',
      description: 'User data structure',
      mimeType: 'application/json',
      content: JSON.stringify({
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' }
        }
      })
    }];
  }

  process(req, res) {
    res.json({ message: 'User created' });
  }
}

module.exports = CreateUser;
```

### 3. Start Server
```bash
easy-mcp-server
```

### 4. Access Interfaces
- **REST API**: `http://localhost:3000/users`
- **OpenAPI**: `http://localhost:3000/openapi.json`
- **Swagger UI**: `http://localhost:3000/docs`
- **MCP Tools**: Available to AI models

## AI Agent Usage

### Using MCP Inspector
```bash
npx @modelcontextprotocol/inspector
# Connect to: http://localhost:3001
# Type: Streamable HTTP
```

### Direct API Usage
```javascript
// List all tools
POST http://localhost:3001/
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}

// Call a tool
POST http://localhost:3001/
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "post_users",
    "arguments": {
      "body": { "name": "John", "email": "john@example.com" }
    }
  }
}

// Get a prompt
POST http://localhost:3001/
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "prompts/get",
  "params": {
    "name": "user_creation_prompt",
    "arguments": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}

// List all resources
POST http://localhost:3001/
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "resources/list"
}

// Read a resource
POST http://localhost:3001/
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "resources/read",
  "params": {
    "uri": "users://schema"
  }
}
```

## Configuration

### Environment Variables
- `SERVER_PORT` - API server port (default: 3000)
- `SERVER_HOST` - API server host (default: localhost)
- `MCP_PORT` - MCP server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

## Best Practices

### API Design
1. Use resource-based URLs (`/users`, `/users/:id`)
2. Follow REST conventions
3. Use appropriate HTTP methods
4. Return consistent response formats

### Annotations
1. Use `@description` for detailed explanations
2. Use `@tags` to group related endpoints
3. Define `@requestBody` for POST/PUT endpoints
4. Document `@errorResponses` for error cases
5. Keep `@summary` concise

### File Organization
1. Group related endpoints in directories
2. Use descriptive file names
3. Follow the HTTP method naming convention
4. Keep API classes focused and single-purpose

## Error Handling

### Framework Errors
- 400: Bad request (validation errors)
- 404: Endpoint not found
- 500: Internal server error

### Custom Error Responses
```javascript
res.status(400).json({ 
  success: false, 
  error: 'Validation failed' 
});
```

## Common Issues & Solutions

### Port Conflicts
- Check if ports 3000/3001 are available
- Use different ports via environment variables

### File Not Loaded
- Verify file naming and path structure
- Check for syntax errors in JavaScript files

### Annotation Errors
- Verify JSON syntax in annotations
- Check for proper JSDoc format

### MCP Connection Issues
- Verify MCP server is running on port 3001
- Use Streamable HTTP connection type
- Check WebSocket endpoint accessibility

## Testing

### Running Tests
```bash
npm test
```

### Framework Tests
- Unit tests for core modules
- Integration tests for API endpoints
- MCP protocol tests
- OpenAPI generation tests

## Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Configure environment variables
3. Use process manager (PM2, etc.)
4. Set up reverse proxy (nginx, etc.)

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000 3001
CMD ["easy-mcp-server"]
```

## Key Features

- **Auto Discovery**: Scans `api/` directory and maps file structure to endpoints
- **MCP Integration**: Full support for tools, prompts, and resources
- **Hot Reload**: Real-time updates during development
- **OpenAPI Generation**: Automatic API documentation
- **Multiple Transports**: WebSocket, HTTP, and Server-Sent Events
- **Annotation Support**: JSDoc annotations for custom schemas
- **AI-Native**: LLM.txt and Agent.md support for AI model context

## MCP Capabilities

### Tools
- Automatic discovery of API endpoints as MCP tools
- Rich input/output schemas
- Real-time execution

### Prompts
- Template-based prompt system
- Parameter substitution
- Organized by API endpoints

### Resources
- Access to documentation and configuration
- Multiple MIME types supported
- Real-time content updates

This framework is designed to make API development as simple as possible while providing powerful features like automatic OpenAPI generation and MCP integration. The annotation system allows for precise control when needed, while the automatic discovery handles the common cases seamlessly.
