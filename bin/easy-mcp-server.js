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
const { execSync } = require('child_process');

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];

// Show help
function showHelp() {
  console.log(`
Easy MCP Server - Dynamic API Framework with MCP Integration

Usage:
  easy-mcp-server          # Start the server (uses server.js if exists, otherwise auto-starts)
  easy-mcp-server init     # Initialize a new project
  easy-mcp-server start    # Start the server (alias)
  easy-mcp-server --help   # Show this help

Commands:
  init    Create a new Easy MCP Server project with example files
  start   Start the server (same as running without arguments)
  --help  Show this help message

Server Starting Behavior:
  • If server.js exists: Uses your custom server configuration
  • If api/ directory exists: Automatically starts server with discovered APIs
  • If neither exists: Shows error and helpful tips

Examples:
  easy-mcp-server          # Start server (custom or auto)
  easy-mcp-server init     # Create new project
  npx easy-mcp-server      # Run without installation
  npx easy-mcp-server init # Initialize without installation

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
      'easy-mcp-server': '^1.0.40',
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
  const envFile = `# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
API_CORS_ORIGIN=*
API_CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE
API_CORS_CREDENTIALS=false

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
- \`PORT\`: Server port (default: 3000)
- \`NODE_ENV\`: Environment (development/production)
- \`API_CORS_ORIGIN\`: CORS origin
- \`API_CORS_METHODS\`: Allowed HTTP methods
- \`API_CORS_CREDENTIALS\`: Allow credentials

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
  
  // Create tests directory
  const testsDir = path.join(projectDir, '__tests__');
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
   ├── api/
   │   ├── example/
   │   │   ├── get.js
   │   │   └── post.js
   └── __tests__/
       └── server.test.js

🚀 Next steps:
   1. cd ${projectName}
   2. npm install
   3. easy-mcp-server

📚 Your server will be available at:
   - Server: http://localhost:3000
   - API Docs: http://localhost:3000/docs
   - Health Check: http://localhost:3000/health
   - OpenAPI Spec: http://localhost:3000/openapi.json
   - API Info: http://localhost:3000/api-info

🔌 MCP (Model Context Protocol) Integration:
   - MCP Server: ws://localhost:3000/mcp
   - MCP Tools: http://localhost:3000/mcp/tools
   - MCP Schema: http://localhost:3000/mcp/schema

⚙️ Server Type: Full-featured Easy MCP Server with:
   - Dynamic API discovery and loading
   - Hot reloading for development
   - CORS support
   - Comprehensive logging
   - MCP protocol support for AI models

🎉 Happy coding with Easy MCP Server!
`);
}

// Start the server
function startServer() {
  console.log('🚀 Starting Easy MCP Server...');
  
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
    
    // Start the server using the full-featured server.js from source
    try {
      console.log('🚀 Using full-featured Easy MCP Server with MCP integration...');
      
      // Change to the main project directory and start the full server
      const originalCwd = process.cwd();
      const mainProjectPath = path.join(__dirname, '..');
      process.chdir(mainProjectPath);
      
      // Start the full server with the user's API path
      const { spawn } = require('child_process');
      const serverProcess = spawn('node', ['src/server.js'], {
        stdio: 'inherit',
        env: {
          ...process.env,
          API_PATH: originalCwd + '/api' // Pass the user's API path
        }
      });
      
      // Handle server process
      serverProcess.on('error', (error) => {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
      });
      
      // Change back to original directory
      process.chdir(originalCwd);
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
function main() {
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  switch (command) {
  case 'init':
    initProject();
    break;
  case 'start':
  case undefined:
    startServer();
    break;
  default:
    console.error(`❌ Unknown command: ${command}`);
    console.log('💡 Run "easy-mcp-server --help" for usage information');
    process.exit(1);
  }
}

// Run the CLI
if (require.main === module) {
  main();
}
