# Dynamic Open API Framework

> **API creation that automatically discovers your endpoints and requires just ONE function to process everything.**

## ✨ **What This Does** 

**Automatically discover API endpoints and process requests with intelligent auto-routing - you only implement ONE function and get everything else for free.**

## 🚀 **Key Benefits** 

| Feature                        | What You Get                                                      |
| ------------------------------ | ----------------------------------------------------------------- |
| 🔍 **Auto Discovery**          | Automatically finds and registers all API endpoints               |
| 🧠 **One Function Processing** | Just implement `process()` - everything else is automatic         |
| 🛡️ **Zero Configuration**     | No manual route setup or Express boilerplate needed              |
| ⚡ **File-Based Discovery**     | Create `api/[path]/[method].js` and it's automatically loaded    |
| 🔄 **Runtime Management**      | Add, remove, or update APIs without restarting                    |

## 📦 **Installation** 

```bash
npm install
```

## ⚡ **Quick Start (3 Steps)** 

### **Step 1: Setup Environment**

```bash
# Copy and edit environment file
cp .env.example .env
```

**Edit `.env` with your server settings:**

```bash
SERVER_HOST=0.0.0.0
SERVER_PORT=3000
NODE_ENV=development
```

### **Step 2: Create an API**

**📁 Important**: The filename determines your route: `api/[path]/[method].js`

```javascript
// api/hello/get.js
class HelloAPI {
  process(req, res) {
    // 🎯 THIS IS THE ONLY FUNCTION YOU NEED TO IMPLEMENT!
    res.json({ message: 'Hello World!' });
  }
}

module.exports = HelloAPI;
```

### **Step 3: Start the Server**

```bash
npm start
```

**🎉 That's it!** The application automatically:

* ✅ Detects your `api/hello/get.js` file
* ✅ Creates the `GET /hello` route
* ✅ Starts processing requests immediately

## 🔍 **How It Works** 

### **1. Auto Discovery**

```javascript
// Server startup automatically:
// ✅ Scans api/ directory for endpoint processors
// ✅ Automatically registers all discovered routes
// ✅ Uses route names from file paths (api/[path]/[method].js)
// ✅ Runtime changes automatically detected and applied
```

### **2. One Function Processing**

```javascript
// The processor KNOWS your route, so it:
// - Automatically handles all requests for that endpoint
// - Provides built-in error handling and logging
// - Gives you request/response objects
// - Requires just ONE function: process()
```

### **3. Zero Manual Work**

* ❌ No manual route registration
* ❌ No Express boilerplate code
* ❌ No complex middleware setup
* ❌ No manual OpenAPI documentation
* ✅ Just create a processor file and implement one function
* ✅ Routes are automatically created when you add files

## 📋 **Usage Examples** 

### **Quick Start (npm start)**

```bash
npm start
```

### **Programmatic Usage**

```javascript
const app = require('./server');

// Server automatically:
// - Scans api/ directory
// - Registers all discovered routes
// - Starts listening on configured port
```

## 🎯 **Core Methods** 

| Method                           | Purpose                                          | Example                                                 |
| -------------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| `process(req, res)`              | Handle HTTP requests                              | `process(req, res) { res.json({data: 'success'}) }`    |
| `description` getter              | OpenAPI documentation                            | `get description() { return 'API description' }`       |
| File-based routing               | Automatic route generation                      | `api/users/profile/get.js` → `GET /users/profile`      |
| Dynamic loading                  | Auto-discovery at startup                       | All `.js` files in `api/` folder automatically loaded  |

## 🚀 **Application Scripts** 

```bash
# Start
npm start                    # Start server with auto-discovery
npm run dev                 # Development mode with nodemon

# Test
npm test                    # Run test suite
npm run lint               # Lint code
npm run lint:fix           # Fix linting issues
```

## ⚙️ **Configuration** 

Create a `.env` file with your server settings:

```bash
# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=3000
NODE_ENV=development

# API Configuration
API_CORS_ORIGIN=*
API_CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE
API_CORS_CREDENTIALS=true
```

**Note**: No constructor parameters needed - everything comes from `.env` file.

## 🎯 **Why Choose Dynamic Open API Framework?** 

### **🚀 Smart Auto-Routing**

* **Zero Configuration**: No manual route setup needed
* **File-Based Discovery**: Create `api/[path]/[method].js` and it's automatically loaded
* **Instant Routing**: Routes start working immediately after `npm start`
* **Runtime Management**: Add, remove, or update APIs without restarting

### **⚡ One Function Processing**

* **Single Responsibility**: Just implement `process()` - that's it!
* **Everything Included**: Error handling, logging, validation, and OpenAPI generation
* **No Boilerplate**: Focus on your business logic, not infrastructure code
* **Consistent Interface**: Same pattern for all API endpoints

### **🔍 Zero Configuration**

* **Environment-Based**: All config comes from `.env` file
* **Auto-Initialization**: Server, routes, and OpenAPI auto-initialize
* **Smart Defaults**: Sensible defaults for all settings
* **Production Ready**: Configure once, deploy anywhere

**🎉 Result**: Write less code, get more functionality, focus on what matters!

## 🧪 **Testing** 

```bash
npm test
```

## 📄 **License** 

MIT License - see LICENSE file for details.

---

**API creation that thinks for itself** 🧠✨
