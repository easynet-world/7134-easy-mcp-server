# Easy MCP Server

1.0.0 • Public • Published recently

* Readme
* Code
* Dependencies
* Dependents
* Versions

# Easy MCP Server

npm version License: MIT Node.js Version

> **Dynamic API framework that automatically converts your functions to MCP tools and OpenAPI specs.**

## ✨ **What This Does** 

**Write one function and automatically get both MCP (Model Context Protocol) integration AND OpenAPI specifications. No manual setup, no complex configuration - just save files and they're live!**

## 🚀 **Key Benefits** 

| Feature                          | What You Get                                                       |
| -------------------------------- | ------------------------------------------------------------------ |
| 🔍 **Auto Discovery**            | Automatically scans `api/` directory for endpoint definitions     |
| 🤖 **Instant MCP**               | Your functions become AI tools automatically                       |
| 📚 **Auto OpenAPI**              | Complete OpenAPI 3.0 specs generated automatically                |
| ⚡ **Dynamic Loading**            | Changes detected in real-time, no server restarts                 |
| 🛡️ **Zero Configuration**         | Works out of the box with Express and MCP                         |
| 🌐 **Multi-Transport**           | WebSocket, SSE, and StreamableHttp support                        |

## 📦 **Installation** 

```bash
npm install easy-mcp-server
```

## ⚡ **Quick Start (3 Steps)** 

### **Step 1: Setup Environment**

```bash
# Copy and edit environment file
cp .env.example .env
```

**Edit `.env` with your settings:**

```bash
SERVER_HOST=0.0.0.0
SERVER_PORT=3000
MCP_ENABLED=true
MCP_HOST=localhost
MCP_PORT=3001
```

### **Step 2: Create Your API Function**

```javascript
// api/users/get.js
class GetUsers {
  // 🎯 ONE function that does everything!
  process(req, res) {
    res.json({ 
      success: true, 
      users: [
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Smith' }
      ]
    });
  }
  
  // Optional: Add description for MCP tools
  get description() {
    return 'Retrieve all users from the system';
  }
}

module.exports = GetUsers;
```

### **Step 3: Start and Use**

```bash
# Start the server
npm start

# Your API is now available at:
# 🌐 REST: http://localhost:3000/users
# 🤖 MCP: ws://localhost:3001
# 📚 OpenAPI: http://localhost:3000/openapi.json
```

## 🎯 **Core Methods** 

| Method                          | Purpose               | Example                                                    |
| ------------------------------- | --------------------- | ---------------------------------------------------------- |
| `process(req, res)`             | Handle HTTP requests  | `process(req, res) { res.json(data) }`                    |
| `get description`               | MCP tool description  | `get description() { return 'Tool description' }`         |
| `get openApi`                   | Custom OpenAPI spec   | `get openApi() { return { summary: 'Custom' } }`          |
| File naming                     | Define HTTP method    | `get.js` = GET, `post.js` = POST                          |

## 🔍 **How It Works** 

### **1\. API Discovery**

```javascript
// Just save a file in api/ directory
// api/products/post.js
class CreateProduct {
  process(req, res) {
    // Your logic here
  }
}
```

**✅ Automatically becomes:**
- **REST API**: `POST /products` endpoint
- **MCP Tool**: Available to AI models via `tools/list`
- **OpenAPI**: Documentation generated automatically
- **Hot Reload**: Changes detected instantly

### **2\. MCP Integration**

```javascript
// AI models can now use your function:
// tools/list -> discovers your API
// tools/call -> executes your function
```

**✅ No manual MCP setup required:**
- WebSocket server starts automatically
- SSE and StreamableHttp support included
- JSON-RPC 2.0 protocol implemented
- Inspector-ready out of the box

### **3\. Zero Manual Work**

* ❌ No SQL writing required
* ❌ No MCP server configuration
* ❌ No OpenAPI specification writing
* ❌ No manual route registration
* ✅ Just write your business logic

## 📋 **Complete Example** 

```javascript
// api/orders/get.js
class GetOrders {
  process(req, res) {
    const { status, limit = 10 } = req.query;
    
    // Your business logic here
    const orders = [
      { id: 1, status: 'pending', amount: 99.99 },
      { id: 2, status: 'completed', amount: 149.99 }
    ];
    
    res.json({ 
      success: true, 
      data: orders,
      count: orders.length 
    });
  }
  
  get description() {
    return 'Retrieve orders with optional filtering by status';
  }
  
  get openApi() {
    return {
      summary: 'Get orders',
      description: 'Retrieve orders with filtering options',
      tags: ['orders'],
      parameters: [
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['pending', 'completed', 'cancelled'] }
        },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 }
        }
      ]
    };
  }
}

module.exports = GetOrders;
```

**🎯 What you get automatically:**
- **REST API**: `GET /orders?status=pending&limit=5`
- **MCP Tool**: `get_orders` available to AI models
- **OpenAPI**: Complete documentation with parameters
- **Validation**: Built-in parameter validation
- **Hot Reload**: Save file = instant update

## 🚀 **Advanced Features** 

### **Hot Reloading**

```bash
# Just save any file in api/ directory
# Changes are detected automatically
# No server restart needed
# MCP tools update in real-time
# OpenAPI specs regenerate instantly
```

### **Multiple HTTP Methods**

```bash
api/
├── users/
│   ├── get.js      # GET /users
│   ├── post.js     # POST /users  
│   ├── put.js      # PUT /users/:id
│   ├── patch.js    # PATCH /users/:id
│   └── delete.js   # DELETE /users/:id
```

### **MCP Transport Options**

| Transport        | URL                    | Use Case                    |
| ---------------- | ---------------------- | --------------------------- |
| **WebSocket**    | `ws://localhost:3001`  | Real-time AI communication  |
| **SSE**          | `GET /sse`             | Inspector compatibility     |
| **StreamableHttp**| `POST /`               | Inspector preferred         |

## 🧪 **Testing** 

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## 🔧 **Development** 

### **Available Scripts**

- `npm start` - Start both servers with hot reloading
- `npm run dev` - Start with nodemon for development
- `npm test` - Run test suite
- `npm run lint` - Check code quality
- `npm run lint:fix` - Fix code quality issues
- `npm run clean` - Clean and reinstall dependencies

### **Project Structure**

```
├── src/
│   ├── core/           # Core framework modules
│   │   ├── api-loader.js      # Dynamic API discovery
│   │   └── openapi-generator.js # OpenAPI generation
│   ├── mcp/            # MCP server implementation
│   │   └── mcp-server.js      # MCP protocol server
│   └── utils/          # Utility services
│       └── hot-reloader.js    # Hot reloading service
├── api/                # API endpoint definitions
│   └── example/        # Example API endpoints
├── server.js           # Main Express server
├── .env.example        # Environment configuration template
└── package.json        # Dependencies and scripts
```

## 🚀 **Production Deployment** 

For production deployment:

1. Set `NODE_ENV=production`
2. Hot reloading is automatically disabled
3. Use proper process management (PM2, Docker, etc.)
4. Configure reverse proxy for HTTPS
5. Set appropriate CORS policies

## 🤝 **Contributing** 

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 **License** 

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support** 

- **Issues**: Create an issue on GitHub
- **Documentation**: Check the [Wiki](../../wiki)
- **Community**: Join our discussions

---

**Dynamic API framework that thinks for itself** 🧠✨
