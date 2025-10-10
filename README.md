# easy-mcp-server
## Enterprise-Grade Node.js Server with AI Integration

[![npm version](https://img.shields.io/npm/v/easy-mcp-server.svg)](https://www.npmjs.com/package/easy-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![AI-Ready](https://img.shields.io/badge/AI-Ready-brightgreen.svg)](https://modelcontextprotocol.io)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)
[![Express Alternative](https://img.shields.io/badge/Express-Alternative-blue.svg)](https://github.com/easynet-world/7134-easy-mcp-server)
[![Convention-based](https://img.shields.io/badge/Convention-based-orange.svg)](https://github.com/easynet-world/7134-easy-mcp-server)
[![Hot Reload](https://img.shields.io/badge/Hot-Reload-red.svg)](https://github.com/easynet-world/7134-easy-mcp-server)
[![File Routing](https://img.shields.io/badge/File-Routing-purple.svg)](https://github.com/easynet-world/7134-easy-mcp-server)

> **Enterprise Development Simplified**  
> 
> **Traditional Approach**: Manual routing → Middleware configuration → AI SDK integration → Documentation → Deployment  
> **easy-mcp-server**: Single function implementation → Complete API ecosystem with AI integration  
> 
> **Streamlined development workflow: Focus on business logic while the framework manages infrastructure.**

## **Architectural Advantages**

| Traditional Development | **easy-mcp-server** |
|------------------------|-------------------|
| Manual AI integration | ✅ **Native AI Support** - Built-in MCP protocol |
| Manual routing & middleware | ✅ **Convention-based** - Zero configuration required |
| Limited AI agent access | ✅ **AI-Ready APIs** - Automatic tool generation |
| Complex learning curve | ✅ **Intuitive Design** - File structure maps to API endpoints |
| Manual maintenance | ✅ **Hot Reload** - Real-time development updates |
| Legacy architecture patterns | ✅ **AI-Optimized** - Modern architectural approach |

**Development Efficiency**: Traditional setup → easy-mcp-server = **Streamlined workflow**

## **Quick Start**

### Option 1: Try the Example Project
```bash
# Clone and explore the complete example project
git clone https://github.com/easynet-world/7134-easy-mcp-server.git
cd 7134-easy-mcp-server/example-project
npx easy-mcp-server
# Open http://localhost:8887 for interactive demo
```

**Example Project Features:**
- Complete API implementation with users and products endpoints
- AI prompts and resources for MCP integration
- JSDoc annotations for automated documentation
- Real-world development patterns and best practices

### Option 2: Create Your Own API
```bash
# Install the framework
npm install easy-mcp-server

# Create your first API endpoint
mkdir -p api/users
echo "const BaseAPI = require('easy-mcp-server/base-api');
class GetUsers extends BaseAPI {
  process(req, res) {
    res.json({ users: [] });
  }
}
module.exports = GetUsers;" > api/users/get.js

# Launch the server
npx easy-mcp-server
```

**Immediate Results:**
- ✅ **REST API**: `GET /users` endpoint active
- ✅ **AI Integration**: Auto-generated tools for AI agents
- ✅ **Documentation**: OpenAPI specification generated
- ✅ **Development**: Hot reload enabled
- ✅ **MCP Protocol**: AI model integration ready

## **Core Architecture Principles**

| Principle | Implementation | Result |
|-----------|----------------|--------|
| **Convention over Configuration** | `api/users/profile/get.js` | `GET /users/profile` |
| **HTTP Method Mapping** | `post.js` | `POST` method |
| **Single Responsibility** | `process(req, res)` | Complete API ecosystem |

## **Installation & Setup**

### Quick Installation
```bash
# Option 1: Direct execution (recommended)
npx easy-mcp-server

# Option 2: Local installation
npm install easy-mcp-server
```

### Server Configuration
```bash
# Standard execution
npx easy-mcp-server

# Custom port configuration
EASY_MCP_SERVER_PORT=8887 npx easy-mcp-server
```

**Service Endpoints:**
- 🌐 **REST API**: http://localhost:8887
- 🤖 **AI Server**: http://localhost:8888
- 📚 **API Documentation**: http://localhost:8887/docs
- 📁 **Static Assets**: http://localhost:8887/

---

## **AI Integration (MCP Protocol)**

### Enterprise AI Integration
- **Traditional Approach**: AI models require manual API integration
- **easy-mcp-server**: Automatic AI model discovery and API consumption

### AI Resource Configuration
```bash
# Configure AI prompt templates
mkdir -p mcp/prompts
echo 'Analyze {{data}} and generate {{report_type}} report' > mcp/prompts/analysis.md

# Setup AI resource documentation
mkdir -p mcp/resources
echo '# API Guide\n\nThis API helps you manage users and products.' > mcp/resources/guide.md
```

**Outcome**: AI models gain access to your prompts and documentation resources.

### **Browser & Terminal Integration**
AI models can control web browsers and terminal sessions for comprehensive automation.

**Browser Automation:**
- `new_page`, `navigate_page`, `take_screenshot`, `click`, `fill`, `evaluate_script`
- Plus 20+ additional browser automation capabilities

**Terminal Integration:**
- `iterm-mcp_write_to_terminal`, `iterm-mcp_read_terminal_output`, `iterm-mcp_send_control_character`

---

## **Project Structure**

```
your-project/
├── api/                    # API endpoints
│   ├── users/
│   │   ├── get.js         # GET /users
│   │   ├── post.js        # POST /users
│   │   └── profile/
│   │       ├── get.js     # GET /users/profile
│   │       └── put.js     # PUT /users/profile
│   └── products/
│       ├── get.js         # GET /products
│       └── post.js        # POST /products
├── mcp/                   # AI features
│   ├── prompts/           # AI prompt templates
│   └── resources/         # AI resource documentation
└── public/                # Static files
    ├── index.html
    ├── style.css
    └── app.js
```

---

## **Development Features**

### Real-time Development
- ✅ **API Files**: Instant detection of `api/**/*.js` file modifications
- ✅ **Middleware**: Immediate application of `middleware.js` changes
- ✅ **Prompts**: Real-time updates for `mcp/prompts/` file changes
- ✅ **Resources**: Automatic reload of `mcp/resources/` modifications
- ✅ **Environment**: Seamless `.env` file change detection
- ✅ **MCP Bridge**: Automatic bridge restart on configuration changes

### Development Benefits
- 🔄 **Zero Restart**: Immediate change application
- 📦 **Dependency Management**: Automatic installation of missing packages
- 🚀 **Rapid Development**: Instant feedback loop
- 🛡️ **Error Handling**: Graceful management of invalid configurations
- 🧹 **Resource Management**: Automatic cleanup of deprecated middleware

---

## **Advanced Capabilities**

### Enhanced API with AI Integration
```javascript
const { BaseAPIEnhanced } = require('easy-mcp-server/lib/base-api-enhanced');

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
```

### Middleware Management
```javascript
// api/middleware.js - Global middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

module.exports = [authenticate];
```

### Automated Documentation Generation

**Why Annotations Are Essential:**
JSDoc annotations provide automated generation of OpenAPI specifications, MCP protocol integration for AI agents, and comprehensive API documentation. This eliminates the need for manual Swagger configuration and separate AI integration infrastructure.

```javascript
/**
 * @description Get user information with optional filtering
 * @summary Retrieve user details
 * @tags users,data-access
 * @requestBody { "type": "object", "properties": { "limit": { "type": "number", "default": 10 } } }
 * @responseSchema { "type": "object", "properties": { "users": { "type": "array", "items": { "type": "string" } } } }
 */
class GetUser extends BaseAPI {
  process(req, res) {
    res.json({ user: {} });
  }
}
```

**Supported JSDoc Annotations:**
- `@description` - API endpoint description
- `@summary` - Brief summary for documentation  
- `@tags` - Categorization tags (comma-separated)
- `@requestBody` - JSON schema for request body validation
- `@responseSchema` - JSON schema for response structure
- `@errorResponses` - Error response definitions

---

## **Configuration Management**

### Environment Variables

The Easy MCP Server **exclusively supports environment variables prefixed with `EASY_MCP_SERVER_`**. This approach ensures security, consistency, and prevents conflicts with other applications.

#### **Security & Consistency**
- ✅ **Only `EASY_MCP_SERVER_` prefixed variables are supported**
- ✅ **Non-prefixed variables are ignored** (e.g., `PORT`, `HOST`, `NODE_ENV`)
- ✅ **Prevents conflicts** with other applications
- ✅ **Centralized configuration** management

#### **Server Configuration Variables**

```bash
# Server Settings
EASY_MCP_SERVER_PORT=8887
EASY_MCP_SERVER_HOST=0.0.0.0

# CORS Settings
EASY_MCP_SERVER_CORS_ORIGIN=*
EASY_MCP_SERVER_CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE
EASY_MCP_SERVER_CORS_CREDENTIALS=true

# Static File Serving
EASY_MCP_SERVER_STATIC_ENABLED=true
EASY_MCP_SERVER_STATIC_DIRECTORY=./public
EASY_MCP_SERVER_SERVE_INDEX=true
EASY_MCP_SERVER_DEFAULT_FILE=index.html

# API Configuration
EASY_MCP_SERVER_API_PATH=api

# MCP Server Settings
EASY_MCP_SERVER_MCP_ENABLED=true
EASY_MCP_SERVER_MCP_HOST=0.0.0.0
EASY_MCP_SERVER_MCP_PORT=8888
EASY_MCP_SERVER_MCP_BASE_PATH=mcp

# Bridge Configuration
EASY_MCP_SERVER_BRIDGE_CONFIG_PATH=mcp-bridge.json

# Logging
EASY_MCP_SERVER_LOG_LEVEL=info
EASY_MCP_SERVER_LOG_FORMAT=text
EASY_MCP_SERVER_SERVICE_NAME=easy-mcp-server

# Development/Production
EASY_MCP_SERVER_QUIET=false
EASY_MCP_SERVER_PRODUCTION_MODE=false
EASY_MCP_SERVER_TEST_MODE=false

# MCP Info Customization
EASY_MCP_SERVER_MCP_INFO_HTML_PATH=./custom-info.html
```

#### **MCP Bridge Server Variables**

For external MCP servers, use the dot notation pattern:

```bash
# Pattern: EASY_MCP_SERVER.<server_name>.<parameter>
# Example: EASY_MCP_SERVER.github.token -> GITHUB_TOKEN

# GitHub MCP Server
EASY_MCP_SERVER.github.token=ghp_your_github_token
EASY_MCP_SERVER.github.owner=your-organization
EASY_MCP_SERVER.github.repo=your-repository

# Slack MCP Server
EASY_MCP_SERVER.slack.token=xoxb-your-slack-token
EASY_MCP_SERVER.slack.channel=#general

# Chrome DevTools MCP Server
EASY_MCP_SERVER.chrome.debug_port=9222
EASY_MCP_SERVER.chrome.headless=true

# Filesystem MCP Server
EASY_MCP_SERVER.filesystem.root_path=/path/to/allowed/directory

# PostgreSQL MCP Server
EASY_MCP_SERVER.postgres.connection_string=postgresql://user:pass@localhost:5432/db
EASY_MCP_SERVER.postgres.schema=public

# Salesforce MCP Server
EASY_MCP_SERVER.salesforce.client_id=your_client_id
EASY_MCP_SERVER.salesforce.client_secret=your_client_secret
EASY_MCP_SERVER.salesforce.username=your_username
EASY_MCP_SERVER.salesforce.password=your_password
EASY_MCP_SERVER.salesforce.security_token=your_security_token

# Notion MCP Server
EASY_MCP_SERVER.notion.api_key=secret_your_notion_api_key

# Contentful MCP Server
EASY_MCP_SERVER.contentful.space_id=your_space_id
EASY_MCP_SERVER.contentful.access_token=your_access_token
```

#### **Configuration Examples**

**Basic Server Setup:**
```bash
export EASY_MCP_SERVER_PORT=8887
export EASY_MCP_SERVER_HOST=0.0.0.0
export EASY_MCP_SERVER_CORS_ORIGIN=*
export EASY_MCP_SERVER_MCP_ENABLED=true
```

**GitHub Integration:**
```bash
export EASY_MCP_SERVER_BRIDGE_CONFIG_PATH=mcp-bridge.json
export EASY_MCP_SERVER.github.token=ghp_your_token_here
export EASY_MCP_SERVER.github.owner=your-org
```

**Multi-Service Setup:**
```bash
# Server
export EASY_MCP_SERVER_PORT=8887
export EASY_MCP_SERVER_MCP_ENABLED=true

# GitHub
export EASY_MCP_SERVER.github.token=ghp_xxx
export EASY_MCP_SERVER.github.owner=my-org

# Slack
export EASY_MCP_SERVER.slack.token=xoxb-xxx
export EASY_MCP_SERVER.slack.channel=#dev

# Salesforce
export EASY_MCP_SERVER.salesforce.client_id=xxx
export EASY_MCP_SERVER.salesforce.client_secret=xxx
export EASY_MCP_SERVER.salesforce.username=xxx
export EASY_MCP_SERVER.salesforce.password=xxx
export EASY_MCP_SERVER.salesforce.security_token=xxx
```

#### **Security Benefits**

1. **Namespace Isolation**: Only `EASY_MCP_SERVER_` variables are processed
2. **No Conflicts**: Won't interfere with other applications' environment variables
3. **Clear Ownership**: Easy to identify which variables belong to Easy MCP Server
4. **Centralized Management**: All configuration in one predictable namespace
5. **Prevents Accidental Exposure**: Non-prefixed variables are ignored

### MCP Bridge Configuration
The framework includes built-in support for multiple MCP servers:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp"]
    },
    "iterm-mcp": {
      "command": "npx",
      "args": ["-y", "iterm-mcp"]
    }
  }
}
```

### Static File Serving
```bash
# Create static files directory
mkdir public
echo '<h1>Hello World!</h1>' > public/index.html
```

---

## **Production Deployment**

### Production Features
| Feature | Description |
|---------|-------------|
| **Auto Discovery** | Automatic loading of APIs and resources |
| **AI Integration** | Complete AI model integration |
| **Health Checks** | Built-in health monitoring |
| **Graceful Degradation** | Server continues running even if some APIs fail |
| **Error Recovery** | Automatic retry mechanism for failed initializations |

### Deployment Configuration
```bash
# Production environment variables
EASY_MCP_SERVER_PRODUCTION_MODE=true
EASY_MCP_SERVER_LOG_LEVEL=info
EASY_MCP_SERVER_QUIET=false
```

### Health Monitoring
- ✅ **Server stays running** even if some APIs fail to initialize
- ✅ **Failed APIs return 503** with helpful error messages
- ✅ **Automatic retry mechanism** for failed initializations
- ✅ **Enhanced health checks** showing API status

---

## **Documentation Resources**

| Document | Purpose | Best For |
|----------|---------|----------|
| **[Development Guide](DEVELOPMENT.md)** | Comprehensive development documentation with Express migration guide, middleware patterns, and advanced features | Deep development, enterprise migration, production deployment |
| **[LLM Context](LLM.txt)** | LLM-specific information and context for AI model integration | AI model integration |
| **[Example Project](example-project/)** | Complete working example with users/products APIs, AI integration, and JSDoc annotations | Learning by example, best practices reference |

---

## **Troubleshooting Guide**

### Common Issues
1. **Port conflicts**: Use `EASY_MCP_SERVER_PORT=8888` to set different port
2. **APIs not working**: Check file paths and HTTP method naming
3. **AI features not showing**: Ensure files are in `mcp/prompts/` and `mcp/resources/` directories
4. **Hot reload not working**: Check if `EASY_MCP_SERVER_HOT_RELOAD=true` is set

### Quick Test
```bash
# Test server health
curl http://localhost:8887/health

# Test AI features
curl -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Test hot reload
echo 'console.log("Hot reload test");' >> api/test.js
# Check server logs for hot reload messages
```

### Debug Mode
```bash
EASY_MCP_SERVER_LOG_LEVEL=debug npx easy-mcp-server
```

---

## **Contributing Guidelines**

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## **Support & Resources**

- **Issues**: [GitHub Issues](https://github.com/easynet-world/7134-easy-mcp-server/issues)
- **Documentation**: [Development Guide](DEVELOPMENT.md) - Comprehensive development documentation with Express migration guide
- **Example Project**: Complete working example in `example-project/` directory with users/products APIs, AI integration, and JSDoc annotations
- **API Examples**: Additional examples in `api/example/` directory

---

## **License Information**

MIT License - see [package.json](package.json) for license details.