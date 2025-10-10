# Example E-commerce API

This is a complete example project demonstrating how to build an AI-ready e-commerce API with easy-mcp-server.

## 🚀 Quick Start

```bash
# Navigate to the example project
cd example-project

# Start the server
npx easy-mcp-server

# Or with custom ports
EASY_MCP_SERVER_PORT=8887 EASY_MCP_SERVER_MCP_PORT=8888 npx easy-mcp-server
```

## 📁 Project Structure

```
example-project/
├── api/                          # API endpoints
│   ├── users/
│   │   ├── get.js               # GET /users
│   │   └── post.js              # POST /users
│   └── products/
│       ├── get.js               # GET /products
│       └── post.js              # POST /products
├── mcp/                          # AI integration
│   ├── prompts/                  # AI prompt templates
│   │   └── user-recommendations.md
│   └── resources/                # AI resources
│       └── api-documentation.md
├── public/                       # Static files
│   └── index.html               # Demo frontend
├── mcp-bridge.json              # MCP bridge configuration
└── README.md                    # This file
```

## 🛠 API Endpoints

### Users API
- **GET /users** - Get all users
- **POST /users** - Create a new user

### Products API
- **GET /products** - Get all products
- **POST /products** - Create a new product

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
