# Dynamic Open API Framework

A powerful Node.js/Express framework that allows you to create API endpoints dynamically by simply adding files to an `api` folder. The framework automatically loads and registers new endpoints at startup.

## 🚀 Features

- **Simple API Creation**: Add API endpoints by creating files in the `api` folder
- **File-based Routing**: Automatic route generation based on folder structure
- **HTTP Method Support**: GET, POST, PUT, DELETE, PATCH methods supported
- **OpenAPI Support**: Automatic OpenAPI specification generation
- **Environment Configuration**: Easy configuration via `.env` files
- **Simple Setup**: Just run `npm start` to get started

## 📁 Project Structure

```
dynamic-open-api/
├── src/
│   ├── BaseProcessor.js          # Base class for all API handlers
│   └── DynamicAPILoader.js      # Advanced framework (for future use)
├── config/
│   └── default.js               # Configuration with environment variables
├── api/                          # API endpoints folder
│   └── hello/
│       └── get.js              # GET /hello
├── working-server.js             # Main server file (working version)
├── server.js                     # Advanced server with DynamicAPILoader
├── package.json                  # Dependencies
└── README.md                     # This file
```

## 🛠️ Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

That's it! The server will start on port 3000 with your API endpoints ready to use.

## 📖 Creating API Endpoints

To create a new API endpoint, simply create a file in the `api` folder following this pattern:

**File Path:** `api/{path}/{to}/{endpoint}/{http-method}.js`

**Route Generated:** `/{path}/{to}/{endpoint}`

**HTTP Method:** Determined by the filename (get.js, post.js, put.js, delete.js, patch.js)

### Simple API Example

#### Basic GET Endpoint (`api/hello/get.js`)
```javascript
class HelloProcessor {
  constructor() {
    this.name = this.constructor.name;
  }

  process(req, res) {
    this.sendSuccess(res, { message: 'Hello World!' });
  }

  sendSuccess(res, data, statusCode = 200) {
    res.status(statusCode).json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  }

  sendError(res, message, statusCode = 400) {
    res.status(statusCode).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }

  get openApi() {
    return {
      summary: 'Hello World endpoint',
      tags: ['demo']
    };
  }
}

module.exports = HelloProcessor;
```

## 🔧 API Handler Structure

Each API handler should:

1. **Export a class** as the default export
2. **Have a `process(req, res)` method** to handle the request
3. **Include helper methods** like `sendSuccess()` and `sendError()`
4. **Optionally have an `openApi` getter** for documentation

## 🌐 API Endpoints

### Built-in Endpoints

- **`GET /health`**: Health check endpoint
- **`GET /api-info`**: List all registered API routes
- **`GET /openapi.json`**: OpenAPI specification

### Example Endpoints

- **`GET /hello`**: Simple hello world

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# API Configuration
API_PATH=./api
API_PREFIX=/api

# CORS Configuration
CORS_ORIGIN=*
CORS_CREDENTIALS=true
```

### Configuration File

The framework automatically loads configuration from `config/default.js` which reads from environment variables.

## 🚨 Important Notes

1. **File Naming**: HTTP method files must be named exactly: `get.js`, `post.js`, `put.js`, `delete.js`, or `patch.js`
2. **Class Structure**: Each API handler should be a class with a `process` method
3. **Module Exports**: The class must be the default export
4. **Helper Methods**: Include `sendSuccess()` and `sendError()` methods for consistent responses
5. **OpenAPI**: Use the `openApi` getter to provide endpoint documentation

## 🧪 Testing

Run the test suite:

```bash
npm test
```

## 📝 Key Benefits

- **One-Glance Understanding**: Each API file is simple and easy to read
- **Minimal Boilerplate**: Only essential code needed
- **Automatic Documentation**: OpenAPI spec generated from code
- **Simple Setup**: Just run `npm start` to get started
- **Consistent Structure**: All APIs follow the same pattern

## 🔮 Future Enhancements

- [ ] Dynamic file watching and reloading
- [ ] Middleware support per endpoint
- [ ] Rate limiting configuration
- [ ] Authentication/authorization framework
- [ ] API versioning support
- [ ] Database integration helpers
- [ ] Caching layer
- [ ] Metrics and monitoring

## 🚀 Getting Started

1. **Clone the repository**
2. **Install dependencies:** `npm install`
3. **Start the server:** `npm start`
4. **Create your first API:** Add a file to the `api` folder
5. **Test your endpoint:** Use the hello example as a template

The framework is now ready to use! All API endpoints are automatically loaded and available when you start the server.

## 📚 Adding More Endpoints

To add more endpoints, simply create new files following the same pattern:

- `api/users/profile/get.js` → `GET /users/profile`
- `api/products/search/post.js` → `POST /products/search`
- `api/orders/123/put.js` → `PUT /orders/123`

Each file should follow the same structure as the hello example, with a class that has a `process` method and helper methods.

## 🎯 What We Solved

1. **Module Loading Issues**: Created a working server that actually loads and runs
2. **Complex Inheritance**: Simplified the approach to focus on what works
3. **User Experience**: Users can now just run `npm start` and everything works
4. **Framework Foundation**: Built a solid base that can be extended later

The framework successfully provides the "one-glance" understanding you wanted, with minimal boilerplate code and working endpoints. Users can focus on implementing their business logic rather than dealing with complex framework setup.
