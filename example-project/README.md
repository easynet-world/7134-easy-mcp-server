# Example E-commerce API

This is a complete example project demonstrating how to build an AI-ready e-commerce API with easy-mcp-server.

## 🚀 Quick Start

```bash
# Navigate to the example project
cd example-project

# Install dependencies
npm install

# Start the server (automatically loads .env configuration)
npm start

# Or use the convenience script
./start.sh

# Or run directly with custom ports
EASY_MCP_SERVER_PORT=8887 EASY_MCP_SERVER_MCP_PORT=8888 npm start
```

> **Note**: The `start.sh` script automatically loads configuration from `.env` file. Default ports are 8887 (API) and 8888 (MCP) with 0.0.0.0 binding for network accessibility.

## ⚙️ Configuration

The example project uses `.env` file for configuration. The `start.sh` script automatically loads these settings:

```bash
# Server Configuration
EASY_MCP_SERVER_PORT=8887              # API server port (default: 8887)
EASY_MCP_SERVER_HOST=0.0.0.0           # Bind to all network interfaces

# MCP Server Configuration  
EASY_MCP_SERVER_MCP_PORT=8888          # MCP WebSocket port (default: 8888)
EASY_MCP_SERVER_MCP_HOST=0.0.0.0       # MCP server host

# Static Files (auto-enabled if directory exists)
EASY_MCP_SERVER_STATIC_DIRECTORY=./public
EASY_MCP_SERVER_DEFAULT_FILE=index.html  # Default file at root (defaults to index.html)
```

You can modify `.env` to customize these settings. The `start.sh` script will automatically apply your changes.

### Alternative: Run without installation

You can also run this project directly using `npx` without installing dependencies:

```bash
cd example-project
npx easy-mcp-server
```

## 📁 Project Structure

```
example-project/
├── api/                          # API endpoints
│   ├── middleware.js            # Custom middleware
│   ├── users/
│   │   ├── get.js               # GET /users
│   │   └── post.js              # POST /users
│   └── products/
│       ├── get.js               # GET /products
│       ├── post.js              # POST /products
│       └── [id]/                # 📌 OPTIONAL: Dynamic route example
│           └── get.js           # GET /products/:id
├── mcp/                          # AI integration
│   ├── prompts/                  # AI prompt templates
│   │   ├── user-recommendations.md
│   │   └── product-analysis.md
│   └── resources/                # AI resources
│       └── api-documentation.md
├── public/                       # Static files
│   └── index.html               # Demo frontend
├── .env                         # Environment configuration
├── package.json                 # Project dependencies and scripts
├── mcp-bridge.json              # MCP bridge configuration
├── start.sh                     # Start script
├── stop.sh                      # Stop script
└── README.md                    # This file
```

## 🛠 API Endpoints

### Users API
- **GET /users** - Get all users
- **POST /users** - Create a new user

### Products API
- **GET /products** - Get all products
- **GET /products?category=electronics** - Filter products by category
- **POST /products** - Create a new product
- **GET /products/:id** - Get product by ID

### 📌 About Dynamic Routes (Optional Feature)

The `/products/:id` endpoint demonstrates **dynamic routing** - an **optional** feature of easy-mcp-server. 

**What is it?**
- Create a `[id]` or `[param]` directory to capture URL parameters
- Becomes `:id` or `:param` in Express routes
- Access via `req.params.id` in your API code

**Important Notes:**
- ✅ **This is completely optional** - most APIs work great with just static routes
- ✅ Use it only when you need URL parameters (like `/products/:id`, `/users/:userId`)
- ✅ For simple CRUD, consider using query params instead (like `?id=123`)
- ✅ The `users` API doesn't use this feature - it works perfectly without it!

**When to use:**
- RESTful APIs with resource IDs (`/products/:id`)
- Nested resources (`/users/:userId/orders/:orderId`)
- Cleaner URLs for public-facing APIs

**When NOT to use:**
- Simple data queries (use query params: `?id=123`)
- If it adds unnecessary complexity to your project
- When static routes meet your needs

## 🤖 AI Integration

This project automatically provides AI integration through the MCP protocol:

### Available AI Tools
- `api__users_get` - Get users data
- `api__users_post` - Create new users
- `api__products_get` - Get products data
- `api__products_post` - Create new products

### AI Prompts
- **User Recommendations** - Generate personalized suggestions

### AI Resources
- **API Documentation** - Complete API reference

## 🧪 Testing the API

### Using the Web Interface
1. Start the server: `npx easy-mcp-server`
2. Open http://localhost:8887 in your browser
3. Use the interactive demo to test all endpoints

### Using curl
```bash
# Get all users
curl http://localhost:8887/users

# Create a new user
curl -X POST http://localhost:8887/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","role":"user"}'

# Get all products
curl http://localhost:8887/products

# Create a new product
curl -X POST http://localhost:8887/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Laptop"}'
```

### Testing AI Integration
```bash
# Test MCP AI tools
curl -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## 🎯 Key Features Demonstrated

1. **File-based Routing** - APIs created from file structure
2. **Parameter Handling** - Dynamic routes with [id] parameters
3. **Query Parameters** - Filtering and pagination
4. **Request Validation** - Input validation and error handling
5. **JSON Responses** - Structured API responses
6. **Static File Serving** - Frontend and API in one server
7. **AI Integration** - Automatic AI tool generation
8. **Hot Reload** - Instant updates during development

## 🔧 Configuration

The example uses default configuration, but you can customize:

```bash
# Custom ports
EASY_MCP_SERVER_PORT=8887 EASY_MCP_SERVER_MCP_PORT=8888 npx easy-mcp-server

# Enable debug logging
EASY_MCP_SERVER_LOG_LEVEL=debug npx easy-mcp-server

# Custom API path
EASY_MCP_SERVER_API_PATH=./api npx easy-mcp-server
```

## 📚 Learn More

- [Main Documentation](../README.md)
- [Development Guide](../DEVELOPMENT.md)
- [GitHub Repository](https://github.com/easynet-world/7134-easy-mcp-server)

## 🤝 Contributing

Feel free to extend this example with:
- More API endpoints
- Database integration
- Authentication
- Advanced AI prompts
- Additional business logic

This example shows how simple it is to build production-ready, AI-integrated APIs with easy-mcp-server!
