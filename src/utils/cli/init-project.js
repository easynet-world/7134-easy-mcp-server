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
      'start:npx': 'npx easy-mcp-server',
      'n8n:generate': 'node node_modules/easy-mcp-server/src/n8n/n8n-server.js'
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
 *
 * Usage:
 *   ${projectName}  # Automatically detects mode based on .env configuration
 *                   # - If EASY_MCP_SERVER_STDIO_MODE=true: STDIO mode (explicit)
 *                   # - If mcp-bridge.json exists: STDIO mode (default for bridge mode)
 *                   # - If EASY_MCP_SERVER_MCP_PORT is set: HTTP/Streamable mode
 *                   # - If not set: STDIO mode
 * 
 * When installed globally, this script:
 * - ALWAYS loads ALL package resources (API, MCP, package.json, src, etc.) from the package folder
 * - Loads .env from the current working directory (where the command is run)
 * - This allows the same package to be used with different configurations in different directories
 * - Supports MCP stdio mode
 * 
 * Example: Run the same package with different .env files:
 *   cd /project1 && test  # Uses /project1/.env
 *   cd /project2 && test  # Uses /project2/.env (same package, different config)
 * 
 * When using npx (without installation):
 *   npx -y xxx_test --cwd /path/to/project --stdio  # Works! Arguments are passed through
 *   npx -y xxx_test --cwd /path/to/project          # Uses /path/to/project/.env
 * 
 * When installed locally, this script:
 * - Loads everything (API, MCP, .env, package.json, etc.) from the project directory
 */

const path = require('path');
const fs = require('fs');

// Determine if this is a global installation
const scriptDir = __dirname;
const projectRoot = path.resolve(scriptDir, '..');
const currentDir = process.cwd();

// Check if project root is in node_modules (indicates global install)
// Also check if package.json exists in project root to confirm it's a package
const isGlobalInstall = projectRoot.includes('node_modules') &&
                        fs.existsSync(path.join(projectRoot, 'package.json')) &&
                        (fs.existsSync(path.join(projectRoot, 'api')) || 
                         fs.existsSync(path.join(projectRoot, 'mcp')));

if (isGlobalInstall) {
  // Global installation: ALL package resources (API, MCP, package.json, src, etc.) come from package folder
  // Only .env comes from working directory (where command is run)
  // This allows the same package to be used with different configurations in different directories
  // 
  // Example usage:
  //   cd /project1 && test  # Uses /project1/.env with package resources from package folder
  //   cd /project2 && test  # Uses /project2/.env with same package resources from package folder
  //
  // Set environment variables to point to package folder for API and MCP
  // These will be respected by startAutoServer() which checks if they're already set
  process.env.EASY_MCP_SERVER_API_PATH = path.join(projectRoot, 'api');
  process.env.EASY_MCP_SERVER_MCP_BASE_PATH = path.join(projectRoot, 'mcp');
  
  // Set package root in environment so other parts of the system can find package resources
  process.env.EASY_MCP_SERVER_PACKAGE_ROOT = projectRoot;
  
  // Load .env from current working directory (where command is run)
  // This allows users to have different .env files in different directories
  // Each directory can have its own configuration (ports, API keys, etc.)
  try {
    const dotenv = require('dotenv');
    const envPath = path.join(currentDir, '.env');
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  } catch (error) {
    // dotenv might not be available, continue anyway
  }
  
  // Check for mcp-bridge.json in current working directory first (like .env files)
  // This allows users to have different bridge configs in different directories
  // Only fall back to package folder if not found in current directory
  const currentBridgeConfig = path.join(currentDir, 'mcp-bridge.json');
  const packageBridgeConfig = path.join(projectRoot, 'mcp-bridge.json');
  if (fs.existsSync(currentBridgeConfig)) {
    process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH = currentBridgeConfig;
  } else if (fs.existsSync(packageBridgeConfig)) {
    process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH = packageBridgeConfig;
  }
  
  // Change to current directory for .env loading context
  // But API/MCP paths are already set via environment variables above
  process.chdir(currentDir);
} else {
  // Local installation: everything comes from project root
  process.chdir(projectRoot);
  
  // Load .env from project directory
  try {
    const dotenv = require('dotenv');
    const envPath = path.join(projectRoot, '.env');
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  } catch (error) {
    // dotenv might not be available, continue anyway
  }
}

// Detect STDIO mode: explicit flag takes precedence, otherwise auto-detect by port presence
// If bridge mode is detected (mcp-bridge.json exists), default to STDIO mode
const explicitStdioMode = process.env.EASY_MCP_SERVER_STDIO_MODE === 'true';
const explicitHttpMode = process.env.EASY_MCP_SERVER_STDIO_MODE === 'false';
const hasMcpPort = process.env.EASY_MCP_SERVER_MCP_PORT && process.env.EASY_MCP_SERVER_MCP_PORT.trim() !== '';

// Check if bridge mode is active (mcp-bridge.json exists)
// Use environment variable if already set (from global install logic above)
// Otherwise check current directory first, then package root
let bridgeConfigPath = process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH;
if (!bridgeConfigPath) {
  // Check current working directory first (allows per-directory configs)
  const currentBridgeConfig = path.join(currentDir, 'mcp-bridge.json');
  if (fs.existsSync(currentBridgeConfig)) {
    bridgeConfigPath = currentBridgeConfig;
  } else {
    // Fall back to package root (for global installs)
    const packageBridgeConfig = path.join(projectRoot, 'mcp-bridge.json');
    if (fs.existsSync(packageBridgeConfig)) {
      bridgeConfigPath = packageBridgeConfig;
    }
  }
}
const hasBridgeConfig = bridgeConfigPath && fs.existsSync(bridgeConfigPath);

// Determine STDIO mode:
// 1. Explicit flag takes precedence
// 2. If bridge mode is active and no port is set, default to STDIO
// 3. Otherwise, check if port is set
let isStdioMode;
if (explicitStdioMode) {
  isStdioMode = true;
} else if (explicitHttpMode && hasMcpPort) {
  isStdioMode = false;
} else if (hasBridgeConfig && !hasMcpPort) {
  // Bridge mode: default to STDIO unless port is explicitly set
  isStdioMode = true;
} else {
  isStdioMode = !hasMcpPort;
}

if (!isStdioMode) {
  // Port is configured - use HTTP/Streamable mode
  // Don't set STDIO mode, so it will use HTTP transport
  // Set host to 0.0.0.0 to allow external connections (only if not set)
  if (!process.env.EASY_MCP_SERVER_MCP_HOST) {
    process.env.EASY_MCP_SERVER_MCP_HOST = '0.0.0.0';
  }
  console.log('🔌 MCP Server Mode: HTTP/Streamable');
  console.log('📡 Port:', process.env.EASY_MCP_SERVER_MCP_PORT);
  console.log('🌐 HTTP endpoints will be available at:');
  console.log('   - POST http://localhost:' + process.env.EASY_MCP_SERVER_MCP_PORT + '/mcp');
  console.log('   - POST http://localhost:' + process.env.EASY_MCP_SERVER_MCP_PORT + '/');
  console.log('   - GET  http://localhost:' + process.env.EASY_MCP_SERVER_MCP_PORT + '/sse');
} else {
  // No port configured - use STDIO mode
  process.env.EASY_MCP_SERVER_STDIO_MODE = 'true';
  // Write to stderr in STDIO mode to keep stdout clean for JSON-RPC messages
  // Remove emojis to prevent encoding issues
  process.stderr.write('MCP Server Mode: STDIO\\n');
  process.stderr.write('Communication: stdin/stdout (JSON-RPC)\\n');
  process.stderr.write('To use HTTP/Streamable mode, set EASY_MCP_SERVER_MCP_PORT in your .env file\\n');
}

// Find easy-mcp-server bin script
// Try multiple locations:
// 1. Local node_modules (if installed locally)
// 2. Global node_modules (if installed globally)
// 3. Use npx as fallback
let binScript = null;

// isGlobalInstall is already determined above

if (!isGlobalInstall) {
  // Local installation: try project's node_modules
  const localBinScript = path.join(projectRoot, 'node_modules', '.bin', 'easy-mcp-server');
  if (fs.existsSync(localBinScript)) {
    binScript = localBinScript;
  }
}

if (!binScript) {
  // Try global node_modules
  // Find npm's global prefix and check multiple possible locations
  try {
    const { execSync } = require('child_process');
    const npmGlobalPrefix = execSync('npm config get prefix', { encoding: 'utf8' }).trim();
    
    // Try different possible locations for global installation
    const possiblePaths = [
      path.join(npmGlobalPrefix, 'lib', 'node_modules', 'easy-mcp-server', 'src', 'easy-mcp-server.js'),
      path.join(npmGlobalPrefix, 'node_modules', 'easy-mcp-server', 'src', 'easy-mcp-server.js'),
      path.join(npmGlobalPrefix, 'lib', 'node_modules', '.bin', 'easy-mcp-server')
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        binScript = possiblePath;
        break;
      }
    }
  } catch (error) {
    // Continue to npx fallback
  }
}

// Pass through command-line arguments to easy-mcp-server
// This allows users to use --cwd, --stdio, etc. with the project command
const cliArgs = process.argv.slice(2);

if (!binScript) {
  // Fallback: use npx to run easy-mcp-server
  // This will work if easy-mcp-server is installed globally or can be downloaded
  try {
    const { spawn } = require('child_process');
    const npxArgs = ['-y', 'easy-mcp-server', ...cliArgs];
    const npxProcess = spawn('npx', npxArgs, {
      stdio: 'inherit',
      cwd: workingDir,
      env: process.env
    });
    
    npxProcess.on('close', (code) => {
      process.exit(code || 0);
    });
    
    npxProcess.on('error', (error) => {
      console.error('❌ Could not run easy-mcp-server via npx:', error.message);
      console.error('💡 Please install easy-mcp-server: npm install -g easy-mcp-server');
      process.exit(1);
    });
    
    return; // Exit early, npx will handle the rest
  } catch (error) {
    console.error('❌ Could not find easy-mcp-server. Please install it:');
    console.error('   npm install -g easy-mcp-server');
    console.error('   or');
    console.error('   npm install easy-mcp-server');
    process.exit(1);
  }
}

// Set up arguments for easy-mcp-server
// Override process.argv to pass through command-line arguments
const originalArgv = process.argv;
process.argv = [process.argv[0], binScript, ...cliArgs];

// Run easy-mcp-server CLI
// The module exports main() function, so call it directly
const easyMcpServer = require(binScript);
if (easyMcpServer && typeof easyMcpServer.main === 'function') {
  // Call main() directly - it will handle starting the server
  // The HTTP servers started by main() will keep the process alive
  easyMcpServer.main().catch((error) => {
    const isStdioMode = process.env.EASY_MCP_SERVER_STDIO_MODE === 'true';
    if (isStdioMode) {
      process.stderr.write('Fatal error: ' + error.message + '\\n');
      process.stderr.write(error.stack + '\\n');
    } else {
      console.error('❌ Fatal error:', error.message);
      console.error(error.stack);
    }
    process.exit(1);
  });
  // Don't restore argv or exit - let main() handle the process lifecycle
  // The server will keep the process alive once HTTP servers start listening
} else {
  // Fallback: try to require and let it run if require.main === module
  // This shouldn't happen, but handle it for compatibility
  require(binScript);
  // Restore original argv
  process.argv = originalArgv;
}
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

📦 To create a distributable npm package:
   1. ./build.sh           # Creates a .tgz package file
   2. npm install -g ./${projectName}-*.tgz  # Install globally
   3. ${projectName}        # Run from any directory (reads .env from current directory)
   
   After global installation, you can run:
   - ${projectName}                    # Start server (uses current directory's .env)
   - ${projectName} --cwd /path/to/dir # Use specific directory's .env
   - ${projectName} --stdio            # Enable STDIO mode
   - ${projectName} --cwd /path/to/dir --stdio  # Combine options
   
   Or use npx (no installation needed):
   - npx -y ${projectName} --cwd /path/to/dir --stdio

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

