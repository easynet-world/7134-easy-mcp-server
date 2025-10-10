# easy-mcp-server
## 🚀 AI-Era Node.js Express Server

[![npm version](https://img.shields.io/npm/v/easy-mcp-server.svg)](https://www.npmjs.com/package/easy-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![AI-Ready](https://img.shields.io/badge/AI-Ready-brightgreen.svg)](https://modelcontextprotocol.io)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)
[![Express Alternative](https://img.shields.io/badge/Express-Alternative-blue.svg)](https://github.com/easynet-world/7134-easy-mcp-server)
[![Zero Config](https://img.shields.io/badge/Zero-Config-orange.svg)](https://github.com/easynet-world/7134-easy-mcp-server)
[![Hot Reload](https://img.shields.io/badge/Hot-Reload-red.svg)](https://github.com/easynet-world/7134-easy-mcp-server)
[![File Routing](https://img.shields.io/badge/File-Routing-purple.svg)](https://github.com/easynet-world/7134-easy-mcp-server)

> **Why choose easy-mcp-server for modern development?**  
> 
> **Traditional Development**: Manual routing → Configure middleware → Integrate AI SDK → Write docs → Deploy config  
> **easy-mcp-server Development**: Write one function → Get everything  
> 
> **Modern development made simple: Focus on your logic, let the framework handle the rest.**

## 🚀 **Why Choose easy-mcp-server?**

| Traditional Approach | **easy-mcp-server** |
|---------------------|-------------------|
| Manual AI integration | ✅ **AI-Native** - Built-in MCP protocol |
| Manual routing & middleware | ✅ **File-based** - Zero configuration |
| Limited AI agent access | ✅ **Auto AI Tools** - Every API becomes AI-callable |
| Steep learning curve | ✅ **Simple learning** - File path = API path |
| Manual maintenance | ✅ **Hot reload** - Automatic updates |
| Traditional design patterns | ✅ **AI-optimized** architecture |

**Development Experience**: Traditional setup → easy-mcp-server = **Simplified workflow** 🚀

## 🚀 Quick Start

```bash
# Install
npm install easy-mcp-server

# Create your first API
mkdir -p api/users
echo "const BaseAPI = require('easy-mcp-server/base-api');
class GetUsers extends BaseAPI {
  process(req, res) {
    res.json({ users: [] });
  }
}
module.exports = GetUsers;" > api/users/get.js

# Start server
npx easy-mcp-server
```

**That's it!** You now have:
- ✅ REST API: `GET /users`
- ✅ AI Tools: Auto-generated for AI agents
- ✅ OpenAPI docs: Auto-generated
- ✅ Hot reload: Built-in
- ✅ MCP protocol: Ready for AI models

## ⚡ **Core Principles: 3 Simple Rules**

| Rule | Example | Result |
|------|---------|--------|
| **File Path = API Path** | `api/users/profile/get.js` | `GET /users/profile` |
| **File Name = HTTP Method** | `post.js` | `POST` |
| **One Function = Everything** | `process(req, res)` | REST + AI + Documentation |

## 🚀 **Installation & Usage**

### Method 1: Run Directly (Recommended)
```bash
# No installation needed - just run!
npx easy-mcp-server
```

### Method 2: Install & Setup
```bash
npm install easy-mcp-server
mkdir -p api/users && touch api/users/get.js
```

### Write Your API
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

### Start & Access
```bash
# Basic usage
npx easy-mcp-server

# Custom ports
EASY_MCP_SERVER_PORT=8887 npx easy-mcp-server
```

**Access Points:**
- 🌐 **REST API**: http://localhost:8887
- 🤖 **AI Server**: http://localhost:8888
- 📚 **API Documentation**: http://localhost:8887/docs
- 📁 **Static Files**: http://localhost:8887/

---

## 🤖 **AI Integration (MCP Features)**

### Why AI Integration Matters?
- **Traditional way**: AI models cannot directly call your APIs
- **easy-mcp-server**: AI models can automatically discover and call all your APIs

### Add AI Prompts and Resources
```bash
# Create AI prompt templates
mkdir -p mcp/prompts
echo 'Analyze {{data}} and generate {{report_type}} report' > mcp/prompts/analysis.md

# Create AI resources
mkdir -p mcp/resources
echo '# API Guide\n\nThis API helps you manage users and products.' > mcp/resources/guide.md
```

**Result**: AI models can now use your prompts and access your documentation!

### 🌐 **Chrome Web Browsing Support**
AI models can control web browsers, navigate pages, fill forms, take screenshots, and perform automated web interactions.

**Available Chrome Tools:**
- `new_page` - Create new browser pages
- `navigate_page` - Navigate to URLs
- `take_snapshot` - Get page content with element UIDs
- `take_screenshot` - Capture page/element images
- `click` - Click on page elements
- `fill` - Fill form inputs
- `evaluate_script` - Run JavaScript in browser
- And 20+ more browser automation tools!

### 💻 **iTerm2 Terminal Integration**
AI models can interact with terminal sessions, execute commands, and read output seamlessly.

**Available iTerm2 Tools:**
- `iterm-mcp_write_to_terminal` - Execute commands in active terminal
- `iterm-mcp_read_terminal_output` - Read terminal output and results
- `iterm-mcp_send_control_character` - Send control characters (Ctrl+C, etc.)

---

## 📁 **File Structure Example**

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
    └── style.css
```

---

## 🔥 **Hot Reload Features**

### Automatic Hot Reload
- ✅ **API Files**: Changes to `api/**/*.js` files are detected instantly
- ✅ **Middleware**: Changes to `middleware.js` files are applied immediately
- ✅ **Prompts**: Changes to `mcp/prompts/` files update immediately
- ✅ **Resources**: Changes to `mcp/resources/` files reload automatically
- ✅ **Environment**: `.env` file changes are picked up without restart
- ✅ **MCP Bridge**: Configuration changes restart bridges automatically

### Hot Reload Benefits
- 🔄 **No Restart Required**: Changes take effect immediately
- 📦 **Auto Package Install**: Missing dependencies installed automatically
- 🚀 **Fast Development**: Instant feedback during development
- 🛡️ **Error Recovery**: Graceful handling of invalid files
- 🧹 **Smart Cleanup**: Old middleware is automatically removed before applying new changes

### Middleware Hot Reload
The framework now supports **intelligent middleware hot reload** with automatic cleanup:

```javascript
// api/middleware.js - Global middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

module.exports = [authenticate];
```

**Features:**
- ✅ **Automatic Detection**: Changes to `middleware.js` files are detected instantly
- ✅ **Smart Cleanup**: Old middleware layers are removed before applying new ones
- ✅ **Path-based Loading**: Middleware applies to routes in the same directory and subdirectories
- ✅ **Multiple Formats**: Support for function, array, and object exports
- ✅ **Error Recovery**: Invalid middleware changes are handled gracefully

---

## 🛠 **Advanced Features**

### Enhanced API (AI + Logging)
```javascript
const { BaseAPIEnhanced } = require('easy-mcp-server/lib/base-api-enhanced');

class MyEnhancedAPI extends BaseAPIEnhanced {
  constructor() {
    super('my-service', {
      llm: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY }
    });
  }

  async process(req, res) {
    // this.llm, this.responseUtils available
    this.responseUtils.sendSuccessResponse(res, { data: 'Hello World' });
  }
}
```

### Auto-Generated Documentation
```javascript
/**
 * @description Get user information
 * @summary Retrieve user details
 * @tags users
 */
class GetUser extends BaseAPI {
  process(req, res) {
    res.json({ user: {} });
  }
}
```

---

## 🔧 **Configuration**

### Environment Variables

The Easy MCP Server **only supports environment variables that start with `EASY_MCP_SERVER_`**. This ensures security, consistency, and prevents conflicts with other applications.

#### 🔒 **Security & Consistency**

- ✅ **Only `EASY_MCP_SERVER_` prefixed variables are supported**
- ✅ **Non-prefixed variables are ignored** (e.g., `PORT`, `HOST`, `NODE_ENV`)
- ✅ **Prevents conflicts** with other applications
- ✅ **Centralized configuration** management

#### 📋 **Server Configuration Variables**

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
EASY_MCP_SERVER_API_PATH=./api

# MCP Server Settings
EASY_MCP_SERVER_MCP_ENABLED=true
EASY_MCP_SERVER_MCP_HOST=0.0.0.0
EASY_MCP_SERVER_MCP_PORT=8888
EASY_MCP_SERVER_MCP_BASE_PATH=../mcp

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
```

#### 🔌 **MCP Bridge Server Variables**

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

#### 🚫 **Ignored Variables**

These variables are **NOT supported** and will be ignored:

```bash
# ❌ These are IGNORED
PORT=3000                    # Use EASY_MCP_SERVER_PORT instead
HOST=localhost               # Use EASY_MCP_SERVER_HOST instead
CORS_ORIGIN=*                # Use EASY_MCP_SERVER_CORS_ORIGIN instead
NODE_ENV=production          # Use EASY_MCP_SERVER_PRODUCTION_MODE instead
DEBUG=*                      # Use EASY_MCP_SERVER_LOG_LEVEL instead
GITHUB_TOKEN=xxx             # Use EASY_MCP_SERVER.github.token instead
SLACK_TOKEN=xxx              # Use EASY_MCP_SERVER.slack.token instead
```

#### 🔧 **Configuration Examples**

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

#### 🛡️ **Security Benefits**

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

## 🚀 **Production Ready**

| Feature | Description |
|---------|-------------|
| **Hot Reload** | Instant updates during development |
| **Auto Discovery** | Automatic loading of APIs and resources |
| **AI Integration** | Complete AI model integration |
| **Health Checks** | Built-in health monitoring |
| **Graceful Degradation** | Server continues running even if some APIs fail |

### Graceful API Initialization
- ✅ **Server stays running** even if some APIs fail to initialize
- ✅ **Failed APIs return 503** with helpful error messages
- ✅ **Automatic retry mechanism** for failed initializations
- ✅ **Enhanced health checks** showing API status

---

## 📚 **Documentation**

| Document | Purpose | Best For |
|----------|---------|----------|
| **[Development Guide](DEVELOPMENT.md)** | Detailed development documentation | Deep development |
| **[Agent Context](Agent.md)** | AI agent integration guide | Building AI applications |
| **[LLM Context](LLM.txt)** | LLM-specific information | AI model integration |

---

## 🔧 **Troubleshooting**

### Common Issues
1. **Port conflicts**: Use `EASY_MCP_SERVER_PORT=8888` to set different port
2. **APIs not working**: Check file paths and HTTP method naming
3. **AI features not showing**: Ensure files are in `mcp/prompts/` and `mcp/resources/` directories
4. **Hot reload not working**: Check if `EASY_MCP_SERVER_HOT_RELOAD=true` is set

### Quick Test
```bash
# Test API
curl http://localhost:8887/users

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
DEBUG=* easy-mcp-server
```

---

## 🤝 **Contributing**

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 **Support**

- **Issues**: [GitHub Issues](https://github.com/easynet-world/7134-easy-mcp-server/issues)
- **Documentation**: [Development Guide](DEVELOPMENT.md)
- **Examples**: Check the `api/example/` directory

---

## 📄 **License**

MIT License - see [package.json](package.json) for license details.