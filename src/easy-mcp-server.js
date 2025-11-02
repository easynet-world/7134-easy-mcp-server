#!/usr/bin/env node

/**
 * Easy MCP Server CLI
 * 
 * Usage:
 *   easy-mcp-server          # Start the server
 *   easy-mcp-server init     # Initialize a new project
 *   easy-mcp-server start    # Start the server (alias)
 *   easy-mcp-server --help   # Show help
 */

const fs = require('fs');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];

// Show help
function showHelp() {
  console.log(`
Easy MCP Server - Dynamic API Framework with MCP Integration

Usage:
  easy-mcp-server                    # Start the server (uses server.js if exists, otherwise auto-starts)
  easy-mcp-server init               # Initialize a new project
  easy-mcp-server start              # Start the server (alias)
  easy-mcp-server --help             # Show this help

Commands:
  init    Create a new Easy MCP Server project with example files
  start   Start the server (same as running without arguments)
  --help  Show this help message

Options:
  (No CLI options - use environment variables)

Environment Variables:
  EASY_MCP_SERVER_PORT   REST API server port
  EASY_MCP_SERVER_MCP_PORT MCP server port
  EASY_MCP_SERVER_HOST   REST API server host
  EASY_MCP_SERVER_MCP_HOST MCP server host
  EASY_MCP_SERVER_STATIC_DIRECTORY Static files directory (auto-enabled if exists)
  EASY_MCP_SERVER_DEFAULT_FILE Default file to serve at root (optional)

Features:
  • Auto .env loading     Automatically loads .env, .env.development, .env.local files
  • Auto npm install      Automatically runs npm install before starting server
  • Port auto-detection   Automatically finds available ports if configured port is busy
  • Graceful error handling  Continues running even with some broken APIs
  • Clear error reporting  Detailed error messages with helpful suggestions

Server Starting Behavior:
  • If server.js exists: Uses your custom server configuration
  • If api/ directory exists: Automatically starts server with discovered APIs
  • If neither exists: Shows error and helpful tips

Examples:
  easy-mcp-server                    # Start server (custom or auto)
  easy-mcp-server init               # Create new project
  npx easy-mcp-server                # Run without installation
  
  # Using environment variables (recommended)
  EASY_MCP_SERVER_PORT=8887 EASY_MCP_SERVER_MCP_PORT=8888 easy-mcp-server

For more information, visit: https://github.com/easynet-world/7134-easy-mcp-server
`);
}

// Initialize a new project
function initProject() {
  const projectName = args[1] || 'easy-mcp-project';
  const projectDir = path.resolve(process.cwd(), projectName);
  
  console.log(`🚀 Initializing new Easy MCP Server project: ${projectName}`);
  
  // Create project directory
  if (fs.existsSync(projectDir)) {
    console.error(`❌ Error: Directory '${projectName}' already exists`);
    process.exit(1);
  }
  
  fs.mkdirSync(projectDir, { recursive: true });
  
  // Create package.json
  const packageJson = {
    'name': projectName,
    'version': '1.0.0',
    'description': 'Easy MCP Server project',
    'main': 'index.js',
    'scripts': {
      'start': 'easy-mcp-server',
      'dev': 'easy-mcp-server',
      'test': 'jest'
    },
    'dependencies': {
      'easy-mcp-server': '^1.0.93',
      'express': '^4.18.2',
      'cors': '^2.8.5',
      'dotenv': '^16.3.1'
    },
    'devDependencies': {
      'nodemon': '^3.1.10',
      'jest': '^29.7.0'
    },
    'keywords': ['mcp', 'api', 'framework'],
    'license': 'MIT'
  };
  
  fs.writeFileSync(
    path.join(projectDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  // Create index.js as the main entry point
  const indexJs = `// Easy MCP Server Project
// 
// This project uses the easy-mcp-server package to provide a dynamic API framework
// with MCP (Model Context Protocol) integration.
//
// To start the server, run:
//   easy-mcp-server
//   npm start
//   npx easy-mcp-server
//
// The server will automatically discover and load API files from the api/ directory.
// Each API file should export a class that extends BaseAPI from easy-mcp-server.

const { BaseAPI } = require('easy-mcp-server');

// Example API class (you can modify or remove this)
class ExampleAPI extends BaseAPI {
  process(req, res) {
    res.json({
      message: 'Welcome to Easy MCP Server!',
      timestamp: Date.now(),
      description: 'This is an example API endpoint'
    });
  }
}

module.exports = {
  ExampleAPI
};
`;
  
  fs.writeFileSync(path.join(projectDir, 'index.js'), indexJs);
  
  // Create .env file
  const envFile = `# Easy MCP Server Configuration
EASY_MCP_SERVER_PORT=8887
EASY_MCP_SERVER_MCP_PORT=8888
EASY_MCP_SERVER_HOST=0.0.0.0
EASY_MCP_SERVER_MCP_HOST=0.0.0.0

# Static File Serving (auto-enabled if directory exists)
EASY_MCP_SERVER_STATIC_DIRECTORY=./public
EASY_MCP_SERVER_DEFAULT_FILE=index.html  # Default file at root (defaults to index.html)

# CORS Configuration
EASY_MCP_SERVER_CORS_ORIGIN=*
EASY_MCP_SERVER_CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE
EASY_MCP_SERVER_CORS_CREDENTIALS=false

# Add your API keys and other environment variables here
`;
  
  fs.writeFileSync(path.join(projectDir, '.env'), envFile);
  
  // Create .gitignore
  const gitignore = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
`;
  
  fs.writeFileSync(path.join(projectDir, '.gitignore'), gitignore);
  
  // Create README.md
  const readme = `# ${projectName}

This is an Easy MCP Server project that provides a dynamic API framework with MCP (Model Context Protocol) integration.

## Quick Start

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the server:
   \`\`\`bash
   easy-mcp-server
   \`\`\`

3. Or use npm scripts:
   \`\`\`bash
   npm start
   npm run dev
   \`\`\`

4. Or run without installation:
   \`\`\`bash
   npx easy-mcp-server
   \`\`\`

## Available Endpoints

- **Health Check**: \`GET /health\`
- **API Info**: \`GET /api-info\`
- **OpenAPI Spec**: \`GET /openapi.json\`
- **API Documentation**: \`GET /docs\`

## Adding APIs

Create API files in the \`api/\` directory. Each file should export a class that extends BaseAPI from easy-mcp-server.

Example API file (\`api/example/get.js\`):
\`\`\`javascript
const BaseAPI = require('easy-mcp-server/base-api');

class GetExample extends BaseAPI {
  process(req, res) {
    res.json({ 
      message: 'Hello from Easy MCP Server!',
      timestamp: Date.now()
    });
  }
}

module.exports = GetExample;
\`\`\`

## Environment Variables

Copy \`.env.example\` to \`.env\` and configure:
- \`EASY_MCP_SERVER_PORT\`: Server port (default: 8887)
- \`EASY_MCP_SERVER_CORS_ORIGIN\`: CORS origin
- \`EASY_MCP_SERVER_CORS_METHODS\`: Allowed HTTP methods
- \`EASY_MCP_SERVER_DEFAULT_FILE\`: Default file for root path (optional)
- \`EASY_MCP_SERVER_CORS_CREDENTIALS\`: Allow credentials

## Learn More

- [Easy MCP Server Documentation](https://github.com/easynet-world/7134-easy-mcp-server)
- [Model Context Protocol](https://modelcontextprotocol.io/)
`;
  
  fs.writeFileSync(path.join(projectDir, 'README.md'), readme);
  
  // Create api directory with example
  const apiDir = path.join(projectDir, 'api');
  fs.mkdirSync(apiDir, { recursive: true });
  
  // Create example subdirectory
  const exampleApiDir = path.join(apiDir, 'example');
  fs.mkdirSync(exampleApiDir, { recursive: true });
  
  const getExampleApi = `const BaseAPI = require('easy-mcp-server/base-api');

/**
 * Example GET API endpoint
 * 
 * @api {get} /example Get example data
 * @apiName GetExample
 * @apiGroup Example
 * @apiSuccess {Object} data Example data object
 * @apiSuccess {String} data.message Example message
 * @apiSuccess {Number} data.timestamp Current timestamp
 */
class GetExample extends BaseAPI {
  process(req, res) {
    res.json({
      data: {
        message: 'This is an example API endpoint',
        timestamp: Date.now(),
        description: 'This endpoint was automatically generated when you ran easy-mcp-server init'
      }
    });
  }
}

module.exports = GetExample;
`;
  
  const postExampleApi = `const BaseAPI = require('easy-mcp-server/base-api');

/**
 * Example POST API endpoint
 * 
 * @api {post} /example Create example data
 * @apiName CreateExample
 * @apiGroup Example
 * @apiParam {String} message Example message
 * @apiSuccess {Object} data Created data
 */
class PostExample extends BaseAPI {
  process(req, res) {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        error: 'Message is required'
      });
    }
    
    res.status(201).json({
      data: {
        message: message,
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9)
      }
    });
  }
}

module.exports = PostExample;
`;
  
  fs.writeFileSync(path.join(exampleApiDir, 'get.js'), getExampleApi);
  fs.writeFileSync(path.join(exampleApiDir, 'post.js'), postExampleApi);
  
  // Create mcp-bridge.json
  const mcpBridgeJson = {
    'mcpServers': {
      'chrome-devtools': {
        'command': 'npx',
        'args': ['-y', 'chrome-devtools-mcp'],
        'env': {
          'CHROME_DEBUG_PORT': '9222'
        },
        'description': 'Chrome DevTools MCP server for browser automation'
      }
    }
  };
  
  fs.writeFileSync(
    path.join(projectDir, 'mcp-bridge.json'),
    JSON.stringify(mcpBridgeJson, null, 2)
  );
  
  // Create start.sh
  const startSh = `#!/bin/bash

# Easy MCP Server Start Script
# This script loads environment variables and starts the server

# Load environment variables from .env file
if [ -f .env ]; then
  # Strip inline comments and empty lines, then export variables
  # This handles both full-line comments (already skipped) and inline comments
  # Using process substitution to source the cleaned .env file
  set -a
  source <(grep -v '^[[:space:]]*#' .env | grep -v '^[[:space:]]*$' | sed 's/[[:space:]]*#.*$//')
  set +a
  echo "📄 Loaded environment variables from .env"
fi

# Start the server
echo "🚀 Starting Easy MCP Server..."
npx easy-mcp-server

# Keep the script running if server exits
exit $?
`;
  
  fs.writeFileSync(path.join(projectDir, 'start.sh'), startSh);
  fs.chmodSync(path.join(projectDir, 'start.sh'), '755'); // Make executable
  
  // Create stop.sh
  const stopSh = `#!/bin/bash

# Easy MCP Server Stop Script
# This script stops the running server

echo "🛑 Stopping Easy MCP Server..."

# Find and kill the server process
PID=$(ps aux | grep 'easy-mcp-server' | grep -v grep | awk '{print $2}')

if [ -z "$PID" ]; then
  echo "⚠️  No running Easy MCP Server found"
  exit 1
fi

# Kill the process
kill $PID

if [ $? -eq 0 ]; then
  echo "✅ Server stopped successfully (PID: $PID)"
else
  echo "❌ Failed to stop server"
  exit 1
fi
`;
  
  fs.writeFileSync(path.join(projectDir, 'stop.sh'), stopSh);
  fs.chmodSync(path.join(projectDir, 'stop.sh'), '755'); // Make executable
  
  // Create build.sh
  const buildSh = `#!/bin/bash

echo "🔨 Building npm package..."
echo "========================================"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16+ first."
    exit 1
fi

# Find npm path
NPM_PATH=""
for path in "/opt/homebrew/bin/npm" "/usr/local/bin/npm" "/usr/bin/npm" "npm"; do
    if command -v "$path" &> /dev/null; then
        NPM_PATH="$path"
        break
    fi
done

if [ -z "$NPM_PATH" ]; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $($NPM_PATH --version)"
echo ""

# Get package name and version from package.json
PACKAGE_NAME=$(node -p "require('./package.json').name")
PACKAGE_VERSION=$(node -p "require('./package.json').version")

echo "📦 Package: $PACKAGE_NAME@$PACKAGE_VERSION"
echo ""

# Step 1: Clean previous build artifacts
echo "🧹 Step 1: Cleaning previous build artifacts..."
rm -f *.tgz
rm -rf dist/ build/
echo "✅ Cleanup completed"
echo ""

# Step 2: Install dependencies
echo "📥 Step 2: Installing dependencies..."
if ! $NPM_PATH install; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "✅ Dependencies installed"
echo ""

# Step 3: Run tests (if configured)
echo "🧪 Step 3: Running tests..."
if $NPM_PATH test; then
    echo "✅ Tests passed"
else
    echo "⚠️  Tests completed (no tests configured or tests failed)"
fi
echo ""

# Step 4: Pack the npm package
echo "📦 Step 4: Packing npm package..."
PACK_FILE=$($NPM_PATH pack 2>&1)
if [ $? -ne 0 ]; then
    echo "❌ Failed to pack npm package"
    echo "$PACK_FILE"
    exit 1
fi

# Extract the filename from npm pack output (usually last line)
PACK_FILENAME=$(echo "$PACK_FILE" | tail -n 1 | grep -o '[^/]*\\.tgz$' || echo "$PACK_FILE" | tail -n 1)

if [ -z "$PACK_FILENAME" ]; then
    # Fallback: construct filename from package name and version
    # Note: PACKAGE_NAME and PACKAGE_VERSION are bash variables defined earlier in this script
    PACK_FILENAME="$PACKAGE_NAME-$PACKAGE_VERSION.tgz"
    PACK_FILENAME=$(echo "$PACK_FILENAME" | sed 's/@//g')
fi

if [ ! -f "$PACK_FILENAME" ]; then
    echo "❌ Package file not found: $PACK_FILENAME"
    exit 1
fi

PACK_SIZE=$(du -h "$PACK_FILENAME" | cut -f1)

echo "✅ Package created: $PACK_FILENAME ($PACK_SIZE)"
echo ""

# Step 5: Verify package contents
echo "🔍 Step 5: Verifying package contents..."
if tar -tzf "$PACK_FILENAME" > /dev/null 2>&1; then
    echo "✅ Package archive is valid"
    FILE_COUNT=$(tar -tzf "$PACK_FILENAME" | wc -l | tr -d ' ')
    echo "   Contains $FILE_COUNT files"
else
    echo "⚠️  Could not verify package archive"
fi
echo ""

echo "========================================"
echo "✅ Build completed successfully!"
echo ""
echo "📦 BUILD RESULT:"
echo "   Package file: $PACK_FILENAME"
echo "   Package size: $PACK_SIZE"
echo "   Package name: $PACKAGE_NAME"
echo "   Version: $PACKAGE_VERSION"
echo ""
echo "📥 HOW USERS CAN INSTALL THIS PACKAGE:"
echo ""
echo "   1️⃣  From npm registry (after publishing):"
echo "      npm install $PACKAGE_NAME"
echo ""
echo "   2️⃣  From local .tgz file (for testing):"
echo "      npm install ./$PACK_FILENAME"
echo ""
echo "   3️⃣  Global installation:"
echo "      npm install -g ./$PACK_FILENAME"
echo ""
echo "🚀 TO PUBLISH THIS PACKAGE:"
echo ""
echo "   📤 Publish to npm registry:"
echo "      npm publish $PACK_FILENAME"
echo ""
echo "   📤 Publish to GitHub Packages:"
echo "      npm publish $PACK_FILENAME --registry=https://npm.pkg.github.com"
echo ""
`;
  
  fs.writeFileSync(path.join(projectDir, 'build.sh'), buildSh);
  fs.chmodSync(path.join(projectDir, 'build.sh'), '755'); // Make executable
  
  // Create MCP directories
  const mcpDir = path.join(projectDir, 'mcp');
  const promptsDir = path.join(mcpDir, 'prompts');
  const resourcesDir = path.join(mcpDir, 'resources');
  
  fs.mkdirSync(promptsDir, { recursive: true });
  fs.mkdirSync(resourcesDir, { recursive: true });
  
  // Create example prompt
  const examplePrompt = `# Example Analysis Prompt

## Role
AI assistant for analyzing data and providing insights.

## Input
- **data**: {{data}}
- **analysis_type**: {{analysis_type}}

## Instructions
1. Analyze the provided data
2. Identify key patterns and trends
3. Provide actionable insights
4. Format results clearly

## Output Format
- **Summary**: Brief overview of findings
- **Insights**: List of key insights
- **Recommendations**: Actionable recommendations
`;
  
  fs.writeFileSync(path.join(promptsDir, 'example-analysis.md'), examplePrompt);
  
  // Create example resource
  const exampleResource = `# API Documentation

## Overview
This is your API documentation that AI agents can access through MCP.

## Available Endpoints

### GET /example
Retrieves example data.

**Response:**
\`\`\`json
{
  "data": {
    "message": "string",
    "timestamp": "number"
  }
}
\`\`\`

### POST /example
Creates new example data.

**Request Body:**
\`\`\`json
{
  "message": "string"
}
\`\`\`

**Response:**
\`\`\`json
{
  "data": {
    "message": "string",
    "timestamp": "number",
    "id": "string"
  }
}
\`\`\`
`;
  
  fs.writeFileSync(path.join(resourcesDir, 'api-documentation.md'), exampleResource);
  
  // Create public directory with example HTML
  const publicDir = path.join(projectDir, 'public');
  fs.mkdirSync(publicDir, { recursive: true });
  
  // Read the HTML template from api/templates directory
  const templatePath = path.join(__dirname, 'api', 'templates', 'public-index.html');
  let indexHtml;
  
  if (fs.existsSync(templatePath)) {
    // Read template and replace placeholders
    indexHtml = fs.readFileSync(templatePath, 'utf8');
    indexHtml = indexHtml.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
  } else {
    // Fallback: simple HTML if template not found
    indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} - Easy MCP Server</title>
</head>
<body>
  <h1>${projectName}</h1>
  <p>Powered by Easy MCP Server</p>
  <p><a href="/docs">API Documentation</a></p>
</body>
</html>`;
  }
  
  fs.writeFileSync(path.join(publicDir, 'index.html'), indexHtml);
  
  // Create tests directory
  const testsDir = path.join(projectDir, 'test');
  fs.mkdirSync(testsDir, { recursive: true });
  
  const testFile = `const request = require('supertest');
const { DynamicAPIServer } = require('easy-mcp-server');

describe('Easy MCP Server', () => {
  let server;
  
  beforeAll(async () => {
    server = new DynamicAPIServer({
      port: 0, // Use random port for testing
      cors: { origin: '*' }
    });
    await server.start();
  });
  
  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });
  
  test('GET /health should return 200', async () => {
    const response = await request(server.app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
  });
  
  test('GET /api-info should return API information', async () => {
    const response = await request(server.app).get('/api-info');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Dynamic API Framework');
  });
});
`;
  
  fs.writeFileSync(path.join(testsDir, 'server.test.js'), testFile);
  
  console.log(`
✅ Project created successfully!

📁 Project structure:
   ${projectName}/
   ├── package.json
   ├── index.js
   ├── .env
   ├── .gitignore
   ├── README.md
   ├── start.sh            # 🚀 Convenient start script
   ├── stop.sh             # 🛑 Convenient stop script
   ├── build.sh            # 🔨 Build npm package script
   ├── mcp-bridge.json     # 🔌 MCP bridge configuration
   ├── api/
   │   └── example/
   │       ├── get.js
   │       └── post.js
   ├── mcp/                # 🤖 AI integration
   │   ├── prompts/
   │   │   └── example-analysis.md
   │   └── resources/
   │       └── api-documentation.md
   ├── public/             # 🌐 Static files
   │   └── index.html
   └── test/
       └── server.test.js

🚀 Next steps:
   1. cd ${projectName}
   2. npm install
   3. ./start.sh           # Or: easy-mcp-server

📚 Your server will be available at:
  - Server: http://localhost:${'${config.port}'}
  - API Docs: http://localhost:${'${config.port}'}/docs
  - Health Check: http://localhost:${'${config.port}'}/health
  - OpenAPI Spec: http://localhost:${'${config.port}'}/openapi.json
  - API Info: http://localhost:${'${config.port}'}/api-info

🔌 MCP (Model Context Protocol) Integration:
  - MCP Server: http://localhost:${'${config.mcpPort}'}
  - MCP Tools: http://localhost:${'${config.port}'}/mcp/tools
  - MCP Schema: http://localhost:${'${config.port}'}/mcp/schema
   - Transport Types: Streamable HTTP, Server-Sent Events (SSE)
   - MCP Endpoints: GET /sse, POST /mcp, POST / (StreamableHttp)

⚙️ Server Type: Full-featured Easy MCP Server with:
   - Dynamic API discovery and loading
   - Hot reloading for development
   - CORS support
   - Comprehensive logging
   - MCP protocol support for AI models

🎉 Happy coding with Easy MCP Server!
`);
}

// Load .env files from user directory
function loadUserEnvFiles() {
  const userCwd = process.cwd();
  const envFiles = ['.env.local', '.env.development', '.env'];
  
  for (const envFile of envFiles) {
    const envPath = path.join(userCwd, envFile);
    if (fs.existsSync(envPath)) {
      try {
        require('dotenv').config({ path: envPath });
        console.log(`📄 Loaded environment from ${envFile}`);
      } catch (error) {
        console.warn(`⚠️  Warning: Could not load ${envFile}: ${error.message}`);
      }
    }
  }
}

// Global env hot reloader instance
let envHotReloader = null;

// Initialize env hot reloader
function initializeEnvHotReloader() {
  try {
    const EnvHotReloader = require('./utils/loaders/env-hot-reloader');
    envHotReloader = new EnvHotReloader({
      debounceDelay: 1000,
      onReload: () => {
        console.log('🔄 Environment variables reloaded - some changes may require server restart');
      },
      logger: console
    });
    envHotReloader.startWatching();
  } catch (error) {
    console.warn(`⚠️  Could not initialize .env hot reload: ${error.message}`);
  }
}


// Auto-install missing dependencies
async function autoInstallDependencies() {
  const userCwd = process.cwd();
  const packageJsonPath = path.join(userCwd, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.log('📦 No package.json found - skipping auto-install');
    return;
  }
  
  console.log('📦 Checking for missing dependencies...');
  
  try {
    const { spawn } = require('child_process');
    
    // Run npm install
    const installProcess = spawn('npm', ['install'], {
      cwd: userCwd,
      stdio: 'inherit'
    });
    
    return new Promise((resolve) => {
      installProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Dependencies installed successfully');
          resolve();
        } else {
          console.warn(`⚠️  npm install completed with code ${code}`);
          resolve(); // Don't fail the server startup
        }
      });
      
      installProcess.on('error', (error) => {
        console.warn(`⚠️  Could not run npm install: ${error.message}`);
        resolve(); // Don't fail the server startup
      });
    });
  } catch (error) {
    console.warn(`⚠️  Error during auto-install: ${error.message}`);
  }
}

// Parse command line arguments for port configuration
function parsePortArguments() {
  const config = {
    port: process.env.EASY_MCP_SERVER_PORT || 8887,
    mcpPort: process.env.EASY_MCP_SERVER_MCP_PORT || 8888
  };
  
  return config;
}

// Start the server
async function startServer() {
  console.log('🚀 Starting Easy MCP Server...');
  
  // Load .env files from user directory
  loadUserEnvFiles();
  
  // Initialize .env hot reloader
  initializeEnvHotReloader();
  
  // Parse port configuration
  const portConfig = parsePortArguments();
  
  // Auto-install dependencies
  await autoInstallDependencies();
  
  // Check if server.js exists in current directory
  const serverPath = path.join(process.cwd(), 'server.js');
  const apiPath = path.join(process.cwd(), 'api');
  
  if (fs.existsSync(serverPath)) {
    console.log('📁 Found server.js - using custom server configuration');
    
    // Start the server using the existing server.js
    try {
      require(serverPath);
    } catch (error) {
      console.error('❌ Failed to start server from server.js:', error.message);
      process.exit(1);
    }
  } else if (fs.existsSync(apiPath)) {
    console.log('📁 Found api/ directory - starting automatic server');
    
    // Start the server directly without spawn
    try {
      console.log('🚀 Using full-featured Easy MCP Server with MCP integration...');
      
      // Set up environment variables for the server
      const originalCwd = process.cwd();
      const mainProjectPath = path.join(__dirname, '..');
      
      // Set environment variables for the server
      process.env.EASY_MCP_SERVER_API_PATH = originalCwd + '/api';
      process.env.EASY_MCP_SERVER_MCP_BASE_PATH = originalCwd + '/mcp';
      // Set bridge config path if mcp-bridge.json exists in the current directory
      const bridgeConfigPath = path.join(originalCwd, 'mcp-bridge.json');
      if (!process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH && fs.existsSync(bridgeConfigPath)) {
        process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH = bridgeConfigPath;
        console.log(`🔌 Auto-detected MCP bridge config: ${bridgeConfigPath}`);
      }
      process.env.EASY_MCP_SERVER_STATIC_DIRECTORY = fs.existsSync(path.join(originalCwd, 'public'))
        ? path.join(originalCwd, 'public')
        : (process.env.EASY_MCP_SERVER_STATIC_DIRECTORY || path.join(mainProjectPath, 'public'));
      process.env.EASY_MCP_SERVER_PORT = portConfig.port.toString();
      process.env.EASY_MCP_SERVER_MCP_PORT = portConfig.mcpPort.toString();
      
      // Don't change directory - keep the original cwd so bridge config can be found
      // The server.js will use environment variables to find files anyway
      // const originalCwdProcess = process.cwd();
      // process.chdir(mainProjectPath);
      
      // Import and start the server directly
      const serverPath = path.join(mainProjectPath, 'src', 'orchestrator.js');
      const serverModule = require(serverPath);
      
      // Manually start the server since we're requiring it, not running it directly
      // The server only auto-starts when run directly (require.main === module)
      if (serverModule && typeof serverModule.startServer === 'function') {
        serverModule.startServer();
      } else {
        // Fallback: if startServer is not exported, log and continue
        // The server might start automatically when required
        console.log('🚀 Starting server...');
      }
      
    } catch (error) {
      console.error('❌ Failed to start server:', error.message);
      process.exit(1);
    }
  } else {
    console.error('❌ Error: Neither server.js nor api/ directory found in current directory');
    console.log('💡 Tip: Run "easy-mcp-server init" to create a new project');
    console.log('💡 Tip: Or create a server.js file with your custom configuration');
    process.exit(1);
  }
}

// Main CLI logic
async function main() {
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  // Check if first argument is a command or a flag
  const isCommand = command && !command.startsWith('--');
  
  if (isCommand) {
    switch (command) {
    case 'init':
      initProject();
      break;
    case 'start':
      await startServer();
      break;
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('💡 Run "easy-mcp-server --help" for usage information');
      process.exit(1);
    }
  } else {
    // No command provided, start server with any flags
    await startServer();
  }
}

// Run the CLI
if (require.main === module) {
  main();
}
