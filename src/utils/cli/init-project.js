/**
 * Project Initialization Module
 * Handles creating new Easy MCP Server projects from templates
 */

const fs = require('fs');
const path = require('path');
const { readTemplate } = require('./templates');

/**
 * Initialize a new Easy MCP Server project
 * @param {string} projectName - Name of the project to create
 */
function initProject(projectName) {
  const projectDir = path.resolve(process.cwd(), projectName);
  
  console.log(`🚀 Initializing new Easy MCP Server project: ${projectName}`);
  
  // Validate project directory
  if (fs.existsSync(projectDir)) {
    console.error(`❌ Error: Directory '${projectName}' already exists`);
    process.exit(1);
  }
  
  fs.mkdirSync(projectDir, { recursive: true });
  
  // Create all project files
  createPackageJson(projectDir, projectName);
  createBinScript(projectDir, projectName);
  createConfigFiles(projectDir, projectName);
  createTypeScriptConfig(projectDir);
  createApiFiles(projectDir);
  createMcpFiles(projectDir);
  createScripts(projectDir);
  createPublicFiles(projectDir, projectName);
  createTestFiles(projectDir);
  
  // Display success message
  displaySuccessMessage(projectName);
}

/**
 * Create package.json file
 */
function createPackageJson(projectDir, projectName) {
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    description: 'Easy MCP Server project',
    main: 'index.js',
    bin: {
      [projectName]: './bin/cli.js'
    },
    scripts: {
      start: './start.sh',
      stop: './stop.sh',
      build: './build.sh',
      dev: 'easy-mcp-server',
      test: 'jest',
      'start:direct': 'easy-mcp-server',
      'start:npx': 'npx easy-mcp-server'
    },
    dependencies: {
      'easy-mcp-server': '^1.1.5',
      'express': '^4.18.2',
      'cors': '^2.8.5',
      'dotenv': '^16.3.1'
    },
    devDependencies: {
      'typescript': '^5.3.3',
      '@types/express': '^4.17.21',
      '@types/node': '^20.10.6',
      '@types/cors': '^2.8.17',
      'nodemon': '^3.1.10',
      'jest': '^29.7.0',
      'supertest': '^7.1.4',
      '@types/jest': '^29.5.11',
      '@types/supertest': '^6.0.2',
      'ts-jest': '^29.1.1',
      'ts-node': '^10.9.2'
    },
    keywords: ['mcp', 'api', 'framework'],
    license: 'MIT',
    engines: {
      node: '>=16.0.0'
    },
    files: [
      'index.js',
      'bin/',
      'api/',
      'mcp/',
      'public/',
      'start.sh',
      'stop.sh',
      'build.sh',
      '.env',
      'mcp-bridge.json',
      'README.md'
    ]
  };

  fs.writeFileSync(
    path.join(projectDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
}

/**
 * Create executable bin script for npx support
 */
function createBinScript(projectDir, projectName) {
  const binDir = path.join(projectDir, 'bin');
  fs.mkdirSync(binDir, { recursive: true });
  
  const cliScript = `#!/usr/bin/env node
/**
 * ${projectName} CLI
 * Executable script for running this Easy MCP Server project
 */

// Change to project directory (where this script is located)
const path = require('path');
const fs = require('fs');
const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);

// Find easy-mcp-server bin script
// npm creates a symlink in node_modules/.bin/ for all bin scripts
const binScript = path.join(projectRoot, 'node_modules', '.bin', 'easy-mcp-server');

if (!fs.existsSync(binScript)) {
  console.error('❌ Could not find easy-mcp-server. Please run: npm install');
  process.exit(1);
}

// Run easy-mcp-server CLI
require(binScript);
`;

  const cliPath = path.join(binDir, 'cli.js');
  fs.writeFileSync(cliPath, cliScript);
  
  // Make it executable on Unix-like systems
  if (process.platform !== 'win32') {
    fs.chmodSync(cliPath, '755');
  }
}

/**
 * Create configuration files (.env, .gitignore, README.md, index.js)
 */
function createConfigFiles(projectDir, projectName) {
  // Create index.js
  let indexJs;
  try {
    indexJs = readTemplate('code/index.js');
  } catch (error) {
    console.warn(`⚠️  Template not found, using fallback: ${error.message}`);
    indexJs = `// Easy MCP Server Project
const { BaseAPI } = require('easy-mcp-server');

class ExampleAPI extends BaseAPI {
  process(req, res) {
    res.json({
      message: 'Welcome to Easy MCP Server!',
      timestamp: Date.now()
    });
  }
}

module.exports = { ExampleAPI };
`;
  }
  fs.writeFileSync(path.join(projectDir, 'index.js'), indexJs);
  
  // Create .env file
  let envFile;
  try {
    envFile = readTemplate('config/.env');
  } catch (error) {
    console.warn(`⚠️  Template not found, using fallback: ${error.message}`);
    envFile = `# Easy MCP Server Configuration
EASY_MCP_SERVER_PORT=8887
EASY_MCP_SERVER_MCP_PORT=8888
`;
  }
  fs.writeFileSync(path.join(projectDir, '.env'), envFile);
  
  // Create .gitignore
  let gitignore;
  try {
    gitignore = readTemplate('config/.gitignore');
  } catch (error) {
    console.warn(`⚠️  Template not found, using fallback: ${error.message}`);
    gitignore = 'node_modules/\n.env\n*.log\n';
  }
  fs.writeFileSync(path.join(projectDir, '.gitignore'), gitignore);
  
  // Create README.md
  let readme;
  try {
    readme = readTemplate('config/README.md', { PROJECT_NAME: projectName });
  } catch (error) {
    console.warn(`⚠️  Template not found, using fallback: ${error.message}`);
    readme = `# ${projectName}\n\nEasy MCP Server project.\n`;
  }
  fs.writeFileSync(path.join(projectDir, 'README.md'), readme);
}

/**
 * Create TypeScript configuration files
 */
function createTypeScriptConfig(projectDir) {
  // Create tsconfig.json
  const tsConfig = {
    compilerOptions: {
      target: 'ES2020',
      module: 'commonjs',
      lib: ['ES2020'],
      outDir: './dist',
      rootDir: './',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      moduleResolution: 'node',
      allowSyntheticDefaultImports: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      types: ['node', 'jest']
    },
    include: ['api/**/*', 'test/**/*', 'index.ts'],
    exclude: ['node_modules', 'dist']
  };

  fs.writeFileSync(
    path.join(projectDir, 'tsconfig.json'),
    JSON.stringify(tsConfig, null, 2)
  );

  // Create jest.config.js for TypeScript
  const jestConfig = `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'api/**/*.ts',
    '!api/**/*.d.ts'
  ]
};
`;

  fs.writeFileSync(path.join(projectDir, 'jest.config.js'), jestConfig);
}

/**
 * Create API example files
 */
function createApiFiles(projectDir) {
  const apiDir = path.join(projectDir, 'api');
  const exampleApiDir = path.join(apiDir, 'example');
  fs.mkdirSync(exampleApiDir, { recursive: true });
  
  // Create example API files
  let getExampleApi, postExampleApi;
  try {
    getExampleApi = readTemplate('code/api/example/get.ts');
    postExampleApi = readTemplate('code/api/example/post.ts');
  } catch (error) {
    console.warn(`⚠️  Template not found, using fallback: ${error.message}`);
    getExampleApi = `import { Request, Response } from 'express';

function handler(req: Request, res: Response): void {
  res.json({ message: 'Hello', timestamp: Date.now() });
}

module.exports = handler;
export {};
`;
    postExampleApi = `import { Request, Response } from 'express';

function handler(req: Request, res: Response): void {
  res.status(201).json({ message: 'Created', timestamp: Date.now() });
}

module.exports = handler;
export {};
`;
  }

  fs.writeFileSync(path.join(exampleApiDir, 'get.ts'), getExampleApi);
  fs.writeFileSync(path.join(exampleApiDir, 'post.ts'), postExampleApi);
}

/**
 * Create MCP files (prompts and resources)
 */
function createMcpFiles(projectDir) {
  const mcpDir = path.join(projectDir, 'mcp');
  const promptsDir = path.join(mcpDir, 'prompts');
  const resourcesDir = path.join(mcpDir, 'resources');
  
  fs.mkdirSync(promptsDir, { recursive: true });
  fs.mkdirSync(resourcesDir, { recursive: true });
  
  // Create mcp-bridge.json
  const mcpBridgeJson = {
    mcpServers: {
      'chrome-devtools': {
        command: 'npx',
        args: ['-y', 'chrome-devtools-mcp'],
        env: {
          CHROME_DEBUG_PORT: '9222'
        },
        description: 'Chrome DevTools MCP server for browser automation'
      }
    }
  };
  fs.writeFileSync(
    path.join(projectDir, 'mcp-bridge.json'),
    JSON.stringify(mcpBridgeJson, null, 2)
  );
  
  // Create example prompt
  let examplePrompt;
  try {
    examplePrompt = readTemplate('mcp/prompts/example-analysis.md');
  } catch (error) {
    console.warn(`⚠️  Template not found, using fallback: ${error.message}`);
    examplePrompt = '# Example Analysis Prompt\n\nAI assistant for analyzing data.';
  }
  fs.writeFileSync(path.join(promptsDir, 'example-analysis.md'), examplePrompt);
  
  // Create example resource
  let exampleResource;
  try {
    exampleResource = readTemplate('mcp/resources/api-documentation.md');
  } catch (error) {
    console.warn(`⚠️  Template not found, using fallback: ${error.message}`);
    exampleResource = '# API Documentation\n\nYour API documentation here.';
  }
  fs.writeFileSync(path.join(resourcesDir, 'api-documentation.md'), exampleResource);
}

/**
 * Create shell scripts (start.sh, stop.sh, build.sh)
 */
function createScripts(projectDir) {
  // Create start.sh
  let startSh;
  try {
    startSh = readTemplate('scripts/start.sh');
  } catch (error) {
    console.warn(`⚠️  Template not found, using fallback: ${error.message}`);
    startSh = '#!/bin/bash\necho "🚀 Starting Easy MCP Server..."\nnpx easy-mcp-server\n';
  }
  fs.writeFileSync(path.join(projectDir, 'start.sh'), startSh);
  fs.chmodSync(path.join(projectDir, 'start.sh'), '755');
  
  // Create stop.sh
  let stopSh;
  try {
    stopSh = readTemplate('scripts/stop.sh');
  } catch (error) {
    console.warn(`⚠️  Template not found, using fallback: ${error.message}`);
    stopSh = '#!/bin/bash\necho "🛑 Stopping Easy MCP Server..."\npkill -f easy-mcp-server\n';
  }
  fs.writeFileSync(path.join(projectDir, 'stop.sh'), stopSh);
  fs.chmodSync(path.join(projectDir, 'stop.sh'), '755');
  
  // Create build.sh
  let buildSh;
  try {
    buildSh = readTemplate('scripts/build.sh');
  } catch (error) {
    console.warn(`⚠️  Template not found, using fallback: ${error.message}`);
    buildSh = '#!/bin/bash\necho "🔨 Building npm package..."\nnpm pack\n';
  }
  fs.writeFileSync(path.join(projectDir, 'build.sh'), buildSh);
  fs.chmodSync(path.join(projectDir, 'build.sh'), '755');
}

/**
 * Create public directory and HTML files
 */
function createPublicFiles(projectDir, projectName) {
  const publicDir = path.join(projectDir, 'public');
  fs.mkdirSync(publicDir, { recursive: true });
  
  // Read the HTML template
  let indexHtml;
  try {
    indexHtml = readTemplate('public-index.html', { PROJECT_NAME: projectName });
  } catch (error) {
    // Fallback: try old location
    const oldTemplatePath = path.join(__dirname, '..', '..', 'api', 'templates', 'public-index.html');
    if (fs.existsSync(oldTemplatePath)) {
      indexHtml = fs.readFileSync(oldTemplatePath, 'utf8');
      indexHtml = indexHtml.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
    } else {
      // Final fallback: simple HTML
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
  }
  
  fs.writeFileSync(path.join(publicDir, 'index.html'), indexHtml);
}

/**
 * Create test files
 */
function createTestFiles(projectDir) {
  const testsDir = path.join(projectDir, 'test');
  fs.mkdirSync(testsDir, { recursive: true });
  
  let testFile;
  try {
    testFile = readTemplate('code/test/server.test.ts');
  } catch (error) {
    console.warn(`⚠️  Template not found, using fallback: ${error.message}`);
    testFile = `import request from 'supertest';
import { DynamicAPIServer } from 'easy-mcp-server';

describe('Easy MCP Server', () => {
  let server: DynamicAPIServer;

  beforeAll(async () => {
    server = new DynamicAPIServer({ port: 0, cors: { origin: '*' } });
    await server.start();
  });

  afterAll(async () => {
    if (server) await server.stop();
  });

  test('GET /health should return 200', async () => {
    const response = await request(server.app).get('/health');
    expect(response.status).toBe(200);
  });

  test('GET /example should return example data', async () => {
    const response = await request(server.app).get('/example');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
  });
});
`;
  }

  fs.writeFileSync(path.join(testsDir, 'server.test.ts'), testFile);
}

/**
 * Display success message after project creation
 */
function displaySuccessMessage(projectName) {
  console.log(`
✅ Project created successfully!

📁 Project structure:
   ${projectName}/
   ├── package.json
   ├── tsconfig.json       # 📘 TypeScript configuration
   ├── jest.config.js      # 🧪 Jest test configuration
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
   │       ├── get.ts      # 📘 TypeScript API endpoints
   │       └── post.ts
   ├── mcp/                # 🤖 AI integration
   │   ├── prompts/
   │   │   └── example-analysis.md
   │   └── resources/
   │       └── api-documentation.md
   ├── public/             # 🌐 Static files
   │   └── index.html
   └── test/
       └── server.test.ts  # 📘 TypeScript tests

🚀 Next steps:
   1. cd ${projectName}
   2. npm install
   3. ./start.sh           # Or: npm start, npm run dev, npx easy-mcp-server, or npx ${projectName}

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

module.exports = { initProject };

