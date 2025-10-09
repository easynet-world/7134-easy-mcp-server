# easy-mcp-server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

> **Why is it simple and easy to use? Write one function, get a complete API ecosystem with AI integration!**

## 🎯 **Why Choose easy-mcp-server?**

### Traditional Development vs easy-mcp-server

| Traditional Development | easy-mcp-server |
|------------------------|----------------|
| ❌ Write API → Write docs → Write tests → Configure AI | ✅ **Write one function = Get everything** |
| ❌ Manual route, middleware, validation setup | ✅ **File path = API path** |
| ❌ Manual AI model integration | ✅ **Automatic AI integration** |
| ❌ Manual documentation generation | ✅ **Automatic OpenAPI docs** |
| ❌ Complex deployment configuration | ✅ **One command to start** |

### 🚀 **3 seconds to start, 30 seconds to complete**

```bash
# 1. Create API file
mkdir -p api/users && touch api/users/get.js

# 2. Write one function
echo 'const BaseAPI = require("easy-mcp-server/base-api");
class GetUsers extends BaseAPI {
  process(req, res) {
    res.json({ users: [] });
  }
}
module.exports = GetUsers;' > api/users/get.js

# 3. Start server
npx easy-mcp-server
```

**Done!** You now have:
- 🌐 **REST API**: `GET /users`
- 🤖 **AI Tools**: AI models can call your APIs
- 📚 **Auto Documentation**: OpenAPI + Swagger UI
- 🔥 **Hot Reload**: Code changes take effect immediately

---

## ⚡ **Core Principles: 3 Simple Rules**

| Rule | Example | Result |
|------|---------|--------|
| **File Path = API Path** | `api/users/profile/get.js` | `GET /users/profile` |
| **File Name = HTTP Method** | `post.js` | `POST` |
| **One Function = Everything** | `process(req, res)` | REST + AI + Documentation |

---

## 🚀 **Quick Start**

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
- ✅ **Prompts**: Changes to `mcp/prompts/` files update immediately
- ✅ **Resources**: Changes to `mcp/resources/` files reload automatically
- ✅ **Environment**: `.env` file changes are picked up without restart
- ✅ **MCP Bridge**: Configuration changes restart bridges automatically

### Hot Reload Benefits
- 🔄 **No Restart Required**: Changes take effect immediately
- 📦 **Auto Package Install**: Missing dependencies installed automatically
- 🚀 **Fast Development**: Instant feedback during development
- 🛡️ **Error Recovery**: Graceful handling of invalid files

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
```bash
# .env
EASY_MCP_SERVER_PORT=8887          # REST API port
EASY_MCP_SERVER_MCP_PORT=8888      # AI server port
EASY_MCP_SERVER_HOST=0.0.0.0       # Server address
NODE_ENV=development               # Environment

# Hot Reload
EASY_MCP_SERVER_HOT_RELOAD=true    # Enable hot reload
EASY_MCP_SERVER_API_PATH=./api     # API directory
EASY_MCP_SERVER_MCP_BASE_PATH=./mcp # MCP directory

# MCP Bridge Configuration
EASY_MCP_SERVER_BRIDGE_CONFIG_PATH=mcp-bridge.json
EASY_MCP_SERVER_BRIDGE_ENABLED=true
```

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