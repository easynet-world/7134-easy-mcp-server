const N8nServer = require('../src/n8n/n8n-server');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

describe('n8n End-to-End Tests - Full Workflow', () => {
  let tempDir;
  let testApiDir;
  let outputDir;

  beforeAll(() => {
    // Create temp directory for all tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-e2e-'));
    testApiDir = path.join(tempDir, 'test-api');
    outputDir = path.join(tempDir, 'n8n-output');

    // Create comprehensive test API structure
    createTestAPI(testApiDir);
  });

  afterAll(() => {
    // Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Phase 1: API Structure Setup', () => {
    test('should have valid test API directory structure', () => {
      expect(fs.existsSync(testApiDir)).toBe(true);
      expect(fs.existsSync(path.join(testApiDir, 'users'))).toBe(true);
      expect(fs.existsSync(path.join(testApiDir, 'products'))).toBe(true);
      expect(fs.existsSync(path.join(testApiDir, 'orders'))).toBe(true);
    });

    test('should have all HTTP method endpoints', () => {
      const usersDir = path.join(testApiDir, 'users');
      expect(fs.existsSync(path.join(usersDir, 'get.js'))).toBe(true);
      expect(fs.existsSync(path.join(usersDir, 'post.js'))).toBe(true);
      expect(fs.existsSync(path.join(usersDir, '[id]', 'get.js'))).toBe(true);
      expect(fs.existsSync(path.join(usersDir, '[id]', 'put.js'))).toBe(true);
      expect(fs.existsSync(path.join(usersDir, '[id]', 'delete.js'))).toBe(true);
    });
  });

  describe('Phase 2: n8n Package Generation', () => {
    let generationResult;

    beforeAll(async () => {
      const server = new N8nServer({
        apiPath: testApiDir,
        outputDir: outputDir,
        nodeName: 'TestAPI',
        displayName: 'Test API',
        description: 'Test API for n8n integration',
        baseUrl: 'https://api.test.com',
        author: 'Test Team',
        version: '1.0.0',
        requiresAuth: true,
      });

      generationResult = await server.start();
    }, 30000);

    test('should generate n8n package successfully', () => {
      expect(generationResult.success).toBe(true);
      expect(generationResult.outputDir).toBe(outputDir);
      expect(generationResult.files).toBeDefined();
    });

    test('should generate all required package files', () => {
      const requiredFiles = [
        'package.json',
        'tsconfig.json',
        'README.md',
        '.gitignore',
        'gulpfile.js',
      ];

      requiredFiles.forEach((file) => {
        const filePath = path.join(outputDir, file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });

    test('should generate node TypeScript file', () => {
      const nodeFile = path.join(outputDir, 'nodes', 'TestAPI.node.ts');
      expect(fs.existsSync(nodeFile)).toBe(true);

      const content = fs.readFileSync(nodeFile, 'utf8');
      expect(content).toContain('INodeType');
      expect(content).toContain('INodeTypeDescription');
      expect(content).toContain('TestApi');  // Class name in PascalCase
    });

    test('should generate credentials file when auth is enabled', () => {
      const credFile = path.join(outputDir, 'credentials', 'TestAPI.credentials.ts');
      expect(fs.existsSync(credFile)).toBe(true);

      const content = fs.readFileSync(credFile, 'utf8');
      expect(content).toContain('ICredentialType');
      expect(content).toContain('TestApiApi');  // PascalCase class name
    });

    test('should generate valid package.json with correct structure', () => {
      const packageJsonPath = path.join(outputDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.name).toBe('n8n-nodes-testapi');
      expect(packageJson.version).toBe('1.0.0');
      expect(packageJson.keywords).toContain('n8n-community-node-package');
      expect(packageJson.n8n).toBeDefined();
      expect(packageJson.n8n.n8nNodesApiVersion).toBe(1);
      expect(packageJson.n8n.nodes).toHaveLength(1);
      expect(packageJson.n8n.credentials).toHaveLength(1);
    });

    test('should generate README with proper documentation', () => {
      const readmePath = path.join(outputDir, 'README.md');
      const readme = fs.readFileSync(readmePath, 'utf8');

      expect(readme).toContain('n8n-nodes-testapi');
      expect(readme).toContain('Test API');
      expect(readme).toContain('https://api.test.com');
      expect(readme).toContain('Installation');
      expect(readme).toContain('Resources');
    });
  });

  describe('Phase 3: Package Structure Validation', () => {
    test('should have correct directory structure', () => {
      expect(fs.existsSync(path.join(outputDir, 'nodes'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'credentials'))).toBe(true);
    });

    test('should have valid TypeScript configuration', () => {
      const tsconfigPath = path.join(outputDir, 'tsconfig.json');
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

      expect(tsconfig.compilerOptions).toBeDefined();
      expect(tsconfig.compilerOptions.target).toBeDefined();
      expect(tsconfig.compilerOptions.module).toBeDefined();
      expect(tsconfig.include).toBeDefined();
    });

    test('should have valid gulpfile for icon handling', () => {
      const gulpfilePath = path.join(outputDir, 'gulpfile.js');
      const gulpfile = fs.readFileSync(gulpfilePath, 'utf8');

      expect(gulpfile).toContain('gulp');
      expect(gulpfile).toContain('build:icons');
      expect(gulpfile).toContain('TestAPI');
    });

    test('should have comprehensive .gitignore', () => {
      const gitignorePath = path.join(outputDir, '.gitignore');
      const gitignore = fs.readFileSync(gitignorePath, 'utf8');

      expect(gitignore).toContain('node_modules/');
      expect(gitignore).toContain('dist/');
      expect(gitignore).toContain('.env');
    });
  });

  describe('Phase 4: Node Definition Validation', () => {
    let nodeContent;

    beforeAll(() => {
      const nodeFile = path.join(outputDir, 'nodes', 'TestAPI.node.ts');
      nodeContent = fs.readFileSync(nodeFile, 'utf8');
    });

    test('should contain proper n8n node class structure', () => {
      expect(nodeContent).toContain('export class TestApi implements INodeType');
      expect(nodeContent).toContain('description: INodeTypeDescription');
    });

    test('should define all resources from API', () => {
      expect(nodeContent).toContain('users');
      expect(nodeContent).toContain('products');
      expect(nodeContent).toContain('orders');
    });

    test('should define operations for each resource', () => {
      // Check for common operations
      expect(nodeContent).toContain('Get all');
      expect(nodeContent).toContain('Get one');
      expect(nodeContent).toContain('Create');
      expect(nodeContent).toContain('Update');
      expect(nodeContent).toContain('Delete');
    });

    test('should include routing information', () => {
      expect(nodeContent).toContain('routing');
      expect(nodeContent).toContain('request');
      expect(nodeContent).toContain('method');
      expect(nodeContent).toContain('url');
    });
  });

  describe('Phase 5: Credentials Validation', () => {
    let credContent;

    beforeAll(() => {
      const credFile = path.join(outputDir, 'credentials', 'TestAPI.credentials.ts');
      credContent = fs.readFileSync(credFile, 'utf8');
    });

    test('should contain proper credentials class structure', () => {
      expect(credContent).toContain('export class TestApiApi implements ICredentialType');
      expect(credContent).toContain('name = \'testapiApi\'');
    });

    test('should define credential properties', () => {
      expect(credContent).toContain('properties');
      expect(credContent).toContain('apiKey');
    });

    test('should include authentication test method', () => {
      expect(credContent).toContain('authenticate');
    });
  });

  describe('Phase 6: npm Package Installation (Manual)', () => {
    test('should have valid package.json for npm install', () => {
      const packageJsonPath = path.join(outputDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.devDependencies).toBeDefined();
      expect(packageJson.peerDependencies).toBeDefined();
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts.build).toBeDefined();
    });

    test('should have npm scripts configured', () => {
      const packageJsonPath = path.join(outputDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.scripts.build).toBe('tsc && gulp build:icons');
      expect(packageJson.scripts.dev).toBeDefined();
      expect(packageJson.scripts.lint).toBeDefined();
    });

    test('should have correct peer dependencies', () => {
      const packageJsonPath = path.join(outputDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.peerDependencies['n8n-workflow']).toBe('*');
    });
  });

  describe('Phase 7: Build Configuration Validation', () => {
    test('should have valid TypeScript configuration', () => {
      const tsconfigPath = path.join(outputDir, 'tsconfig.json');
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

      expect(tsconfig.compilerOptions.target).toBeDefined();
      expect(tsconfig.compilerOptions.module).toBeDefined();
      expect(tsconfig.compilerOptions.outDir).toBe('./dist');
      expect(tsconfig.compilerOptions.declaration).toBe(true);
    });

    test('should have gulp build configuration', () => {
      const gulpfilePath = path.join(outputDir, 'gulpfile.js');
      const gulpfile = fs.readFileSync(gulpfilePath, 'utf8');

      expect(gulpfile).toContain('build:icons');
      expect(gulpfile).toContain('src');
      expect(gulpfile).toContain('dest');
    });

    test('TypeScript files should have valid syntax', () => {
      const nodeFile = path.join(outputDir, 'nodes', 'TestAPI.node.ts');
      const content = fs.readFileSync(nodeFile, 'utf8');

      // Check for TypeScript syntax
      expect(content).toContain('export class');
      expect(content).toContain('implements');
      expect(content).toContain('INodeType');
    });
  });

  describe('Phase 8: Package Integrity Checks', () => {
    test('should have all source files for n8n nodes', () => {
      const packageJsonPath = path.join(outputDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      // Check that package.json references dist files (for after build)
      packageJson.n8n.nodes.forEach((nodePath) => {
        expect(nodePath).toContain('dist/');
        expect(nodePath).toContain('.node.js');
      });

      // Check that source files exist
      expect(fs.existsSync(path.join(outputDir, 'nodes', 'TestAPI.node.ts'))).toBe(true);
    });

    test('should reference credentials files correctly', () => {
      const packageJsonPath = path.join(outputDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      packageJson.n8n.credentials.forEach((credPath) => {
        expect(credPath).toContain('dist/');
        expect(credPath).toContain('.credentials.js');
      });

      // Check source credentials file exists
      expect(fs.existsSync(path.join(outputDir, 'credentials', 'TestAPI.credentials.ts'))).toBe(true);
    });

    test('should have files array for npm publish', () => {
      const packageJsonPath = path.join(outputDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.files).toBeDefined();
      expect(Array.isArray(packageJson.files)).toBe(true);
      expect(packageJson.files).toContain('dist');
    });
  });

  describe('Phase 9: n8n Integration Validation', () => {
    test('should have valid n8n node structure in source file', () => {
      const nodeFile = path.join(outputDir, 'nodes', 'TestAPI.node.ts');
      const content = fs.readFileSync(nodeFile, 'utf8');

      // Should export the node class
      expect(content).toContain('export class');
      expect(content).toContain('TestApi');
      expect(content).toContain('INodeType');
    });

    test('should have valid n8n credentials structure', () => {
      const credFile = path.join(outputDir, 'credentials', 'TestAPI.credentials.ts');
      const content = fs.readFileSync(credFile, 'utf8');

      // Should export credentials class
      expect(content).toContain('export class');
      expect(content).toContain('TestApiApi');  // PascalCase class name
      expect(content).toContain('ICredentialType');
    });

    test('should have valid n8n API version', () => {
      const packageJsonPath = path.join(outputDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.n8n.n8nNodesApiVersion).toBe(1);
    });
  });

  describe('Phase 10: CLI Functionality', () => {
    test('should support preview mode', async () => {
      const server = new N8nServer({
        apiPath: testApiDir,
        previewOnly: true,
      });

      const preview = await server.preview();

      expect(preview).toBeDefined();
      expect(preview.nodeName).toBeDefined();
      expect(preview.operations).toBeDefined();
      expect(preview.properties).toBeDefined();
    });

    test('should accept custom node name', async () => {
      const customOutputDir = path.join(tempDir, 'custom-output');
      const server = new N8nServer({
        apiPath: testApiDir,
        outputDir: customOutputDir,
        nodeName: 'CustomName',
      });

      await server.start();

      const nodeFile = path.join(customOutputDir, 'nodes', 'CustomName.node.ts');
      expect(fs.existsSync(nodeFile)).toBe(true);

      // Cleanup
      fs.rmSync(customOutputDir, { recursive: true, force: true });
    });

    test('should accept custom base URL', async () => {
      const customOutputDir = path.join(tempDir, 'url-output');
      const server = new N8nServer({
        apiPath: testApiDir,
        outputDir: customOutputDir,
        baseUrl: 'https://custom.api.com',
      });

      await server.start();

      const nodeFile = path.join(customOutputDir, 'nodes', 'CustomAPI.node.ts');
      const content = fs.readFileSync(nodeFile, 'utf8');
      expect(content).toContain('https://custom.api.com');

      // Cleanup
      fs.rmSync(customOutputDir, { recursive: true, force: true });
    });
  });

  describe('Phase 11: Resource and Operation Mapping', () => {
    let nodeContent;

    beforeAll(() => {
      const nodeFile = path.join(outputDir, 'nodes', 'TestAPI.node.ts');
      nodeContent = fs.readFileSync(nodeFile, 'utf8');
    });

    test('should map GET /resource to "Get all" operation', () => {
      expect(nodeContent).toContain('Get all');
    });

    test('should map GET /resource/:id to "Get one" operation', () => {
      expect(nodeContent).toContain('Get one');
    });

    test('should map POST /resource to "Create" operation', () => {
      expect(nodeContent).toContain('Create');
    });

    test('should map PUT/PATCH /resource/:id to "Update" operation', () => {
      expect(nodeContent).toContain('Update');
    });

    test('should map DELETE /resource/:id to "Delete" operation', () => {
      expect(nodeContent).toContain('Delete');
    });
  });

  describe('Phase 12: Field Generation and Validation', () => {
    let nodeContent;

    beforeAll(() => {
      const nodeFile = path.join(outputDir, 'nodes', 'TestAPI.node.ts');
      nodeContent = fs.readFileSync(nodeFile, 'utf8');
    });

    test('should generate fields for query parameters', () => {
      // Users GET endpoint has query params
      expect(nodeContent).toContain('limit');
      expect(nodeContent).toContain('offset');
    });

    test('should generate fields for body parameters', () => {
      // Users POST endpoint has body params
      expect(nodeContent).toContain('name');
      expect(nodeContent).toContain('email');
    });

    test('should generate fields for path parameters', () => {
      // ID parameter for single resource endpoints
      expect(nodeContent).toContain('id');
    });

    test('should include field descriptions', () => {
      expect(nodeContent).toContain('description');
    });

    test('should mark required fields', () => {
      expect(nodeContent).toContain('required');
    });
  });

  describe('Phase 13: Error Handling', () => {
    test('should handle invalid API path gracefully', async () => {
      const server = new N8nServer({
        apiPath: './non-existent-path',
        outputDir: path.join(tempDir, 'error-output'),
      });

      // Should complete successfully even with no routes (generates empty node)
      const result = await server.start();
      expect(result.success).toBe(true);
    });

    test('should handle empty API directory', async () => {
      const emptyDir = path.join(tempDir, 'empty-api');
      fs.mkdirSync(emptyDir, { recursive: true });

      const server = new N8nServer({
        apiPath: emptyDir,
        outputDir: path.join(tempDir, 'empty-output'),
      });

      const result = await server.start();
      expect(result.success).toBe(true);
      // Should generate package even with no routes
    });

    test('should handle malformed API files', async () => {
      const malformedDir = path.join(tempDir, 'malformed-api');
      fs.mkdirSync(malformedDir, { recursive: true });

      // Create invalid JavaScript file
      fs.writeFileSync(
        path.join(malformedDir, 'invalid.js'),
        'this is not valid javascript {{{',
        'utf8'
      );

      const server = new N8nServer({
        apiPath: malformedDir,
        outputDir: path.join(tempDir, 'malformed-output'),
      });

      // Should handle gracefully
      const result = await server.start();
      expect(result.success).toBe(true);
    });
  });

  describe('Phase 14: Multi-Resource Scenarios', () => {
    test('should handle multiple resources correctly', () => {
      const nodeFile = path.join(outputDir, 'nodes', 'TestAPI.node.ts');
      const content = fs.readFileSync(nodeFile, 'utf8');

      // Should have all three resources
      expect(content).toContain('users');
      expect(content).toContain('products');
      expect(content).toContain('orders');
    });

    test('should generate resource selector', () => {
      const nodeFile = path.join(outputDir, 'nodes', 'TestAPI.node.ts');
      const content = fs.readFileSync(nodeFile, 'utf8');

      expect(content).toContain('Resource');
      expect(content).toContain('resource');
      expect(content).toContain('options');
    });

    test('should generate operation selector for each resource', () => {
      const nodeFile = path.join(outputDir, 'nodes', 'TestAPI.node.ts');
      const content = fs.readFileSync(nodeFile, 'utf8');

      expect(content).toContain('Operation');
      expect(content).toContain('operation');
      expect(content).toContain('displayOptions');
    });
  });

  describe('Phase 15: README Documentation Quality', () => {
    let readme;

    beforeAll(() => {
      const readmePath = path.join(outputDir, 'README.md');
      readme = fs.readFileSync(readmePath, 'utf8');
    });

    test('should include installation instructions', () => {
      expect(readme).toContain('Installation');
      expect(readme).toContain('installation guide');
    });

    test('should document all resources', () => {
      expect(readme).toContain('Users');
      expect(readme).toContain('Products');
      expect(readme).toContain('Orders');
    });

    test('should include operations for each resource', () => {
      expect(readme).toContain('Get all');
      expect(readme).toContain('Create');
      expect(readme).toContain('Update');
      expect(readme).toContain('Delete');
    });

    test('should include credentials section', () => {
      expect(readme).toContain('Credentials');
      expect(readme).toContain('https://api.test.com');
    });

    test('should include compatibility information', () => {
      expect(readme).toContain('Compatibility');
      expect(readme).toContain('n8n');
    });

    test('should include usage information', () => {
      expect(readme).toContain('Usage');
    });

    test('should include license information', () => {
      expect(readme).toContain('License');
    });
  });

  describe('Phase 16: Package Publishing Readiness', () => {
    test('should have all metadata for npm publish', () => {
      const packageJsonPath = path.join(outputDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.name).toBeTruthy();
      expect(packageJson.version).toBeTruthy();
      expect(packageJson.description).toBeTruthy();
      expect(packageJson.keywords).toBeDefined();
      expect(packageJson.license).toBeTruthy();
    });

    test('should have proper repository information', () => {
      const packageJsonPath = path.join(outputDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.repository).toBeDefined();
      expect(packageJson.repository.type).toBeTruthy();
    });

    test('should have author information', () => {
      const packageJsonPath = path.join(outputDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.author).toBeDefined();
      expect(packageJson.author.name).toBe('Test Team');
    });
  });
});

/**
 * Helper function to create comprehensive test API structure
 */
function createTestAPI(apiDir) {
  // Create directories
  const usersDir = path.join(apiDir, 'users');
  const usersIdDir = path.join(usersDir, '[id]');
  const productsDir = path.join(apiDir, 'products');
  const productsIdDir = path.join(productsDir, '[id]');
  const ordersDir = path.join(apiDir, 'orders');
  const ordersIdDir = path.join(ordersDir, '[id]');

  fs.mkdirSync(usersIdDir, { recursive: true });
  fs.mkdirSync(productsIdDir, { recursive: true });
  fs.mkdirSync(ordersIdDir, { recursive: true });

  // Users endpoints
  fs.writeFileSync(
    path.join(usersDir, 'get.js'),
    `
class Request {
  constructor() {
    // @description('Maximum number of users to return')
    this.limit = 10;

    // @description('Number of users to skip')
    this.offset = 0;

    // @description('Filter by role')
    this.role = undefined;
  }
}

class Response {
  constructor() {
    this.users = [];
    this.total = 0;
  }
}

// @description('Get all users with pagination and filtering')
// @summary('List users')
// @tags('users')
function process(req, res) {
  const { limit, offset, role } = req.query;
  res.json({ users: [], total: 0 });
}

module.exports = { process };
    `
  );

  fs.writeFileSync(
    path.join(usersDir, 'post.js'),
    `
class Request {
  constructor() {
    // @description('User full name')
    this.name = '';

    // @description('User email address')
    this.email = '';

    // @description('User role')
    this.role = 'user';
  }
}

class Response {
  constructor() {
    this.id = '';
    this.name = '';
    this.email = '';
    this.role = '';
    this.createdAt = '';
  }
}

// @description('Create a new user')
// @summary('Create user')
// @tags('users')
function process(req, res) {
  const { name, email, role } = req.body;
  res.json({
    id: '123',
    name,
    email,
    role,
    createdAt: new Date().toISOString(),
  });
}

module.exports = { process };
    `
  );

  fs.writeFileSync(
    path.join(usersIdDir, 'get.js'),
    `
class Request {
  constructor() {

  }
}

class Response {
  constructor() {
    this.id = '';
    this.name = '';
    this.email = '';
    this.role = '';
    this.createdAt = '';
  }
}

// @description('Get user by ID')
// @summary('Get user')
// @tags('users')
function process(req, res) {
  res.json({
    id: req.params.id,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'admin',
    createdAt: '2025-01-01T00:00:00Z',
  });
}

module.exports = { process };
    `
  );

  fs.writeFileSync(
    path.join(usersIdDir, 'put.js'),
    `
class Request {
  constructor() {
    this.name = '';
    this.email = '';
    this.role = '';
  }
}

class Response {
  constructor() {
    this.id = '';
    this.name = '';
    this.email = '';
    this.role = '';
    this.updatedAt = '';
  }
}

// @description('Update user by ID')
// @summary('Update user')
// @tags('users')
function process(req, res) {
  res.json({
    id: req.params.id,
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
}

module.exports = { process };
    `
  );

  fs.writeFileSync(
    path.join(usersIdDir, 'delete.js'),
    `
class Request {
  constructor() {

  }
}

class Response {
  constructor() {
    this.success = '';
    this.message = '';
  }
}

// @description('Delete user by ID')
// @summary('Delete user')
// @tags('users')
function process(req, res) {
  res.json({
    success: true,
    message: 'User deleted successfully',
  });
}

module.exports = { process };
    `
  );

  // Products endpoints
  fs.writeFileSync(
    path.join(productsDir, 'get.js'),
    `
class Request {
  constructor() {
    this.category = '';
    this.minPrice = 0;
    this.maxPrice = '';
  }
}

class Response {
  constructor() {
    this.products = '';
  }
}

// @description('Get all products')
// @summary('List products')
// @tags('products')
function process(req, res) {
  res.json({ products: [] });
}

module.exports = { process };
    `
  );

  fs.writeFileSync(
    path.join(productsDir, 'post.js'),
    `
class Request {
  constructor() {
    this.name = '';
    this.description = '';
    this.price = '';
    this.category = '';
  }
}

class Response {
  constructor() {
    this.id = '';
    this.name = '';
    this.description = '';
    this.price = '';
    this.category = '';
  }
}

// @description('Create a new product')
// @summary('Create product')
// @tags('products')
function process(req, res) {
  res.json({
    id: '456',
    ...req.body,
  });
}

module.exports = { process };
    `
  );

  fs.writeFileSync(
    path.join(productsIdDir, 'get.js'),
    `
class Request {
  constructor() {

  }
}

class Response {
  constructor() {
    this.id = '';
    this.name = '';
    this.description = '';
    this.price = '';
    this.category = '';
  }
}

// @description('Get product by ID')
// @summary('Get product')
// @tags('products')
function process(req, res) {
  res.json({
    id: req.params.id,
    name: 'Product Name',
    description: 'Product Description',
    price: 99.99,
    category: 'Electronics',
  });
}

module.exports = { process };
    `
  );

  // Orders endpoints
  fs.writeFileSync(
    path.join(ordersDir, 'get.js'),
    `
class Request {
  constructor() {
    this.status = '';
    this.limit = 10;
  }
}

class Response {
  constructor() {
    this.orders = '';
  }
}

// @description('Get all orders')
// @summary('List orders')
// @tags('orders')
function process(req, res) {
  res.json({ orders: [] });
}

module.exports = { process };
    `
  );

  fs.writeFileSync(
    path.join(ordersDir, 'post.js'),
    `
class Request {
  constructor() {
    this.userId = '';
    this.productIds = '';
    this.totalAmount = '';
  }
}

class Response {
  constructor() {
    this.id = '';
    this.userId = '';
    this.productIds = '';
    this.totalAmount = '';
    this.status = '';
    this.createdAt = '';
  }
}

// @description('Create a new order')
// @summary('Create order')
// @tags('orders')
function process(req, res) {
  res.json({
    id: '789',
    ...req.body,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
}

module.exports = { process };
    `
  );

  fs.writeFileSync(
    path.join(ordersIdDir, 'get.js'),
    `
class Request {
  constructor() {

  }
}

class Response {
  constructor() {
    this.id = '';
    this.userId = '';
    this.productIds = '';
    this.totalAmount = '';
    this.status = '';
    this.createdAt = '';
  }
}

// @description('Get order by ID')
// @summary('Get order')
// @tags('orders')
function process(req, res) {
  res.json({
    id: req.params.id,
    userId: '123',
    productIds: ['456'],
    totalAmount: 99.99,
    status: 'completed',
    createdAt: '2025-01-01T00:00:00Z',
  });
}

module.exports = { process };
    `
  );
}
