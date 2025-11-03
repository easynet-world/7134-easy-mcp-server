const N8nServer = require('../src/n8n/n8n-server');
const N8nNodeBuilder = require('../src/n8n/builders/n8n-node-builder');
const N8nNodeGenerator = require('../src/n8n/generators/n8n-node-generator');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('n8n Node Generation - Complete Test Suite', () => {
  let tempDir;
  let testApiDir;

  beforeEach(() => {
    // Create temporary directories for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-test-'));
    testApiDir = path.join(tempDir, 'api');
    fs.mkdirSync(testApiDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup temporary directories
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('N8nServer', () => {
    describe('Initialization', () => {
      test('should initialize with default options', () => {
        const server = new N8nServer();

        expect(server.options.apiPath).toBeDefined();
        expect(server.options.outputDir).toBe('./n8n-nodes-output');
        expect(server.options.nodeName).toBe('CustomAPI');
        expect(server.options.displayName).toBe('Custom API');
        expect(server.routes).toEqual([]);
      });

      test('should initialize with custom options', () => {
        const customOptions = {
          apiPath: './custom-api',
          outputDir: './custom-output',
          nodeName: 'MyAPI',
          displayName: 'My API',
          baseUrl: 'https://api.example.com',
          author: 'Test Author',
          version: '2.0.0',
          requiresAuth: true,
        };

        const server = new N8nServer(customOptions);

        expect(server.options.apiPath).toBe('./custom-api');
        expect(server.options.outputDir).toBe('./custom-output');
        expect(server.options.nodeName).toBe('MyAPI');
        expect(server.options.displayName).toBe('My API');
        expect(server.options.baseUrl).toBe('https://api.example.com');
        expect(server.options.author).toBe('Test Author');
        expect(server.options.version).toBe('2.0.0');
        expect(server.options.requiresAuth).toBe(true);
      });

      test('should use environment variables as fallback', () => {
        process.env.EASY_MCP_SERVER_API_PATH = './env-api';
        process.env.API_BASE_URL = 'https://env.example.com';

        const server = new N8nServer();

        expect(server.options.apiPath).toBe('./env-api');
        expect(server.options.baseUrl).toBe('https://env.example.com');

        delete process.env.EASY_MCP_SERVER_API_PATH;
        delete process.env.API_BASE_URL;
      });
    });

    describe('Route Loading', () => {
      beforeEach(() => {
        // Create test API files
        const usersDir = path.join(testApiDir, 'users');
        fs.mkdirSync(usersDir, { recursive: true });

        // Create GET endpoint
        fs.writeFileSync(
          path.join(usersDir, 'get.js'),
          `
class Request {
  constructor() {
    // @description('Maximum number of users to return')
    this.limit = 10;
  }
}

class Response {
  constructor() {
    this.users = [];
    this.total = 0;
  }
}

// @description('Get all users from the system')
// @summary('List users')
// @tags('users')
function handler(req, res) {
  res.json({ users: [], total: 0 });
}

module.exports = handler;
          `
        );

        // Create POST endpoint
        fs.writeFileSync(
          path.join(usersDir, 'post.js'),
          `
class Request {
  constructor() {
    // @description('User name')
    this.name = '';

    // @description('User email')
    this.email = '';
  }
}

class Response {
  constructor() {
    this.success = false;
    this.id = '';
  }
}

// @description('Create a new user')
// @summary('Create user')
// @tags('users')
function handler(req, res) {
  res.json({ success: true, id: '123' });
}

module.exports = handler;
          `
        );
      });

      test('should load API routes from directory', async () => {
        const server = new N8nServer({ apiPath: testApiDir });
        await server.loadRoutes();

        expect(server.routes.length).toBeGreaterThan(0);
        expect(server.routes).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: expect.any(String),
              method: expect.any(String),
            }),
          ])
        );
      });

      test('should handle empty API directory', async () => {
        const emptyDir = path.join(tempDir, 'empty-api');
        fs.mkdirSync(emptyDir);

        const server = new N8nServer({ apiPath: emptyDir });
        await server.loadRoutes();

        expect(server.routes).toEqual([]);
      });

      test('should handle non-existent API directory gracefully', async () => {
        const server = new N8nServer({ apiPath: './non-existent' });

        await expect(server.loadRoutes()).rejects.toThrow();
      });
    });

    describe('Node Definition Building', () => {
      let server;
      let mockRoutes;

      beforeEach(() => {
        mockRoutes = [
          {
            path: '/users',
            method: 'GET',
            processor: {
              description: 'Get all users',
              summary: 'List users',
              queryParametersSchema: {
                type: 'object',
                properties: {
                  limit: {
                    type: 'number',
                    description: 'Maximum number of users',
                  },
                },
              },
            },
          },
          {
            path: '/users',
            method: 'POST',
            processor: {
              description: 'Create a new user',
              summary: 'Create user',
              requestBodySchema: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'User name' },
                  email: { type: 'string', description: 'User email' },
                },
                required: ['name', 'email'],
              },
            },
          },
        ];

        server = new N8nServer();
        server.routes = mockRoutes;
      });

      test('should build node definition from routes', () => {
        const nodeDefinition = server.buildNodeDefinition();

        expect(nodeDefinition).toHaveProperty('nodeName');
        expect(nodeDefinition).toHaveProperty('displayName');
        expect(nodeDefinition).toHaveProperty('description');
        expect(nodeDefinition).toHaveProperty('operations');
        expect(nodeDefinition).toHaveProperty('properties');
      });

      test('should group operations by resource', () => {
        const nodeDefinition = server.buildNodeDefinition();

        expect(nodeDefinition.operations).toHaveProperty('users');
        expect(Array.isArray(nodeDefinition.operations.users)).toBe(true);
        expect(nodeDefinition.operations.users.length).toBeGreaterThan(0);
      });

      test('should include resource and operation selectors', () => {
        const nodeDefinition = server.buildNodeDefinition();

        const resourceSelector = nodeDefinition.properties.find(
          (p) => p.name === 'resource'
        );
        const operationSelector = nodeDefinition.properties.find(
          (p) => p.name === 'operation'
        );

        expect(resourceSelector).toBeDefined();
        expect(resourceSelector.type).toBe('options');
        expect(operationSelector).toBeDefined();
        expect(operationSelector.type).toBe('options');
      });

      test('should generate field properties from schemas', () => {
        const nodeDefinition = server.buildNodeDefinition();

        const nameField = nodeDefinition.properties.find((p) => p.name === 'name');
        const emailField = nodeDefinition.properties.find((p) => p.name === 'email');

        expect(nameField).toBeDefined();
        expect(nameField.required).toBe(true);
        expect(emailField).toBeDefined();
        expect(emailField.required).toBe(true);
      });
    });

    describe('File Generation', () => {
      let server;

      beforeEach(() => {
        server = new N8nServer({
          apiPath: testApiDir,
          outputDir: path.join(tempDir, 'output'),
        });

        server.routes = [
          {
            path: '/users',
            method: 'GET',
            processor: {
              description: 'Get users',
            },
          },
        ];
      });

      test('should generate node package files', () => {
        const nodeDefinition = server.buildNodeDefinition();
        const files = server.generateNodePackage(nodeDefinition);

        expect(files).toHaveProperty('package.json');
        expect(files).toHaveProperty('tsconfig.json');
        expect(files).toHaveProperty('README.md');
        expect(files).toHaveProperty('.gitignore');
        expect(files).toHaveProperty('gulpfile.js');
      });

      test('should generate node TypeScript file', () => {
        const nodeDefinition = server.buildNodeDefinition();
        const files = server.generateNodePackage(nodeDefinition);

        const nodeFile = Object.keys(files).find((f) => f.endsWith('.node.ts'));
        expect(nodeFile).toBeDefined();
        expect(files[nodeFile]).toContain('INodeType');
        expect(files[nodeFile]).toContain('INodeTypeDescription');
      });

      test('should generate credentials file when auth is required', () => {
        server.options.requiresAuth = true;
        server.options.credentials = [
          {
            name: 'customapiApi',
            required: true,
          },
        ];

        const nodeDefinition = server.buildNodeDefinition();
        nodeDefinition.credentials = server.options.credentials;

        const files = server.generateNodePackage(nodeDefinition);

        const credFile = Object.keys(files).find((f) =>
          f.endsWith('.credentials.ts')
        );
        expect(credFile).toBeDefined();
        expect(files[credFile]).toContain('ICredentialType');
      });

      test('should not generate credentials file when auth is not required', () => {
        server.options.requiresAuth = false;

        const nodeDefinition = server.buildNodeDefinition();
        const files = server.generateNodePackage(nodeDefinition);

        const credFile = Object.keys(files).find((f) =>
          f.endsWith('.credentials.ts')
        );
        expect(credFile).toBeUndefined();
      });
    });

    describe('Preview Mode', () => {
      let server;

      beforeEach(() => {
        server = new N8nServer({ apiPath: testApiDir });

        // Create a simple API file
        fs.writeFileSync(
          path.join(testApiDir, 'health.js'),
          `
function handler(req, res) {
  res.json({ status: 'ok' });
}
module.exports = handler;
          `
        );
      });

      test('should generate preview without writing files', async () => {
        const preview = await server.preview();

        expect(preview).toHaveProperty('nodeName');
        expect(preview).toHaveProperty('operations');
        expect(preview).toHaveProperty('properties');
      });

      test('should not create output directory in preview mode', async () => {
        const outputDir = path.join(tempDir, 'preview-output');
        server.options.outputDir = outputDir;

        await server.preview();

        expect(fs.existsSync(outputDir)).toBe(false);
      });
    });

    describe('Full Generation Workflow', () => {
      beforeEach(() => {
        // Create comprehensive test API
        const usersDir = path.join(testApiDir, 'users');
        const productsDir = path.join(testApiDir, 'products');

        fs.mkdirSync(usersDir, { recursive: true });
        fs.mkdirSync(productsDir, { recursive: true });

        // Users endpoints
        fs.writeFileSync(
          path.join(usersDir, 'get.js'),
          `
class Request {
  constructor() {
    this.limit = 10;
    this.offset = 0;
  }
}

class Response {
  constructor() {
    this.users = [];
  }
}

// @description('Get all users')
function handler(req, res) {
  res.json({ users: [] });
}

module.exports = handler;
          `
        );

        fs.writeFileSync(
          path.join(usersDir, 'post.js'),
          `
class Request {
  constructor() {
    this.name = '';
    this.email = '';
  }
}

class Response {
  constructor() {
    this.id = '';
    this.name = '';
    this.email = '';
  }
}

// @description('Create a new user')
function handler(req, res) {
  res.json({ id: '123', name: 'Test', email: 'test@example.com' });
}

module.exports = handler;
          `
        );

        // Products endpoints
        fs.writeFileSync(
          path.join(productsDir, 'get.js'),
          `
// @description('Get all products')
function handler(req, res) {
  res.json({ products: [] });
}

module.exports = handler;
          `
        );
      });

      test('should complete full generation workflow', async () => {
        const outputDir = path.join(tempDir, 'full-output');
        const server = new N8nServer({
          apiPath: testApiDir,
          outputDir,
          nodeName: 'TestAPI',
          displayName: 'Test API',
          version: '1.0.0',
        });

        const result = await server.start();

        expect(result.success).toBe(true);
        expect(result.outputDir).toBe(outputDir);
        expect(result.files).toContain('package.json');
        expect(result.files).toContain('README.md');

        // Verify files were written
        expect(fs.existsSync(path.join(outputDir, 'package.json'))).toBe(true);
        expect(fs.existsSync(path.join(outputDir, 'README.md'))).toBe(true);
      });

      test('should handle errors during generation', async () => {
        const server = new N8nServer({
          apiPath: './non-existent-api',
          outputDir: path.join(tempDir, 'error-output'),
        });

        await expect(server.start()).rejects.toThrow();
      });
    });
  });

  describe('N8nNodeBuilder', () => {
    describe('Resource Extraction', () => {
      test('should extract resource from simple path', () => {
        const resource = N8nNodeBuilder.extractResource('/users');
        expect(resource).toBe('users');
      });

      test('should extract resource from nested path', () => {
        const resource = N8nNodeBuilder.extractResource('/users/profile');
        expect(resource).toBe('users');
      });

      test('should extract resource from path with parameters', () => {
        const resource = N8nNodeBuilder.extractResource('/users/:id');
        expect(resource).toBe('users');
      });

      test('should handle empty path', () => {
        const resource = N8nNodeBuilder.extractResource('/');
        expect(resource).toBe('general');
      });

      test('should ignore parameter segments', () => {
        const resource = N8nNodeBuilder.extractResource('/:userId/posts');
        expect(resource).toBe('posts');
      });
    });

    describe('Operation Extraction', () => {
      test('should extract GET operation for list endpoint', () => {
        const operation = N8nNodeBuilder.extractOperation('GET', '/users', {
          description: 'Get users',
        });

        expect(operation.value).toBe('getAll');
        expect(operation.action).toBe('Get all');
      });

      test('should extract GET operation for single item endpoint', () => {
        const operation = N8nNodeBuilder.extractOperation('GET', '/users/:id', {
          description: 'Get user by ID',
        });

        expect(operation.value).toBe('get');
        expect(operation.action).toBe('Get one');
      });

      test('should extract POST operation', () => {
        const operation = N8nNodeBuilder.extractOperation('POST', '/users', {
          description: 'Create user',
        });

        expect(operation.value).toBe('create');
        expect(operation.action).toBe('Create');
      });

      test('should extract PUT operation', () => {
        const operation = N8nNodeBuilder.extractOperation('PUT', '/users/:id', {
          description: 'Update user',
        });

        expect(operation.value).toBe('update');
        expect(operation.action).toBe('Update');
      });

      test('should extract PATCH operation', () => {
        const operation = N8nNodeBuilder.extractOperation('PATCH', '/users/:id', {
          description: 'Update user',
        });

        expect(operation.value).toBe('update');
        expect(operation.action).toBe('Update');
      });

      test('should extract DELETE operation', () => {
        const operation = N8nNodeBuilder.extractOperation('DELETE', '/users/:id', {
          description: 'Delete user',
        });

        expect(operation.value).toBe('delete');
        expect(operation.action).toBe('Delete');
      });

      test('should use processor description in operation', () => {
        const operation = N8nNodeBuilder.extractOperation('POST', '/users', {
          description: 'Custom description',
          summary: 'Custom summary',
        });

        expect(operation.description).toContain('Custom description');
      });
    });

    describe('Field Property Generation', () => {
      test('should create field for string type', () => {
        const field = N8nNodeBuilder.createN8nField(
          'username',
          { type: 'string', description: 'User name' },
          'body',
          'users',
          'create',
          []
        );

        expect(field.name).toBe('username');
        expect(field.type).toBe('string');
        expect(field.description).toBe('User name');
        expect(field.displayName).toBe('Username');
      });

      test('should create field for number type', () => {
        const field = N8nNodeBuilder.createN8nField(
          'age',
          { type: 'number', description: 'User age', minimum: 18, maximum: 120 },
          'body',
          'users',
          'create',
          []
        );

        expect(field.type).toBe('number');
        expect(field.typeOptions).toHaveProperty('minValue', 18);
        expect(field.typeOptions).toHaveProperty('maxValue', 120);
      });

      test('should create field for boolean type', () => {
        const field = N8nNodeBuilder.createN8nField(
          'active',
          { type: 'boolean', description: 'Is active' },
          'body',
          'users',
          'create',
          []
        );

        expect(field.type).toBe('boolean');
      });

      test('should create field for enum type', () => {
        const field = N8nNodeBuilder.createN8nField(
          'status',
          { type: 'string', enum: ['active', 'inactive', 'pending'] },
          'body',
          'users',
          'create',
          []
        );

        expect(field.type).toBe('options');
        expect(field.options).toHaveLength(3);
        expect(field.options).toContainEqual({ name: 'active', value: 'active' });
      });

      test('should mark required fields', () => {
        const field = N8nNodeBuilder.createN8nField(
          'email',
          { type: 'string', description: 'User email' },
          'body',
          'users',
          'create',
          ['email']
        );

        expect(field.required).toBe(true);
      });

      test('should not mark optional fields as required', () => {
        const field = N8nNodeBuilder.createN8nField(
          'phone',
          { type: 'string', description: 'Phone number' },
          'body',
          'users',
          'create',
          ['email']
        );

        expect(field.required).toBeUndefined();
      });

      test('should add routing for query parameters', () => {
        const field = N8nNodeBuilder.createN8nField(
          'limit',
          { type: 'number' },
          'query',
          'users',
          'getAll',
          []
        );

        expect(field.routing).toHaveProperty('send');
        expect(field.routing.send.type).toBe('query');
      });

      test('should add routing for body parameters', () => {
        const field = N8nNodeBuilder.createN8nField(
          'name',
          { type: 'string' },
          'body',
          'users',
          'create',
          []
        );

        expect(field.routing).toHaveProperty('send');
        expect(field.routing.send.type).toBe('body');
      });

      test('should add routing for path parameters', () => {
        const field = N8nNodeBuilder.createN8nField(
          'id',
          { type: 'string' },
          'path',
          'users',
          'get',
          []
        );

        expect(field.routing).toHaveProperty('send');
        expect(field.routing.send.type).toBe('path');
      });
    });

    describe('Display Name Formatting', () => {
      test('should format camelCase to Title Case', () => {
        expect(N8nNodeBuilder.formatDisplayName('userName')).toBe('User Name');
      });

      test('should format snake_case to Title Case', () => {
        expect(N8nNodeBuilder.formatDisplayName('user_name')).toBe('User Name');
      });

      test('should format kebab-case to Title Case', () => {
        expect(N8nNodeBuilder.formatDisplayName('user-name')).toBe('User Name');
      });

      test('should handle single word', () => {
        expect(N8nNodeBuilder.formatDisplayName('user')).toBe('User');
      });

      test('should handle multiple words', () => {
        expect(N8nNodeBuilder.formatDisplayName('userFullName')).toBe(
          'User Full Name'
        );
      });
    });

    describe('Type Conversion', () => {
      test('should convert string type', () => {
        expect(N8nNodeBuilder.jsonSchemaTypeToN8nType('string')).toBe('string');
      });

      test('should convert number type', () => {
        expect(N8nNodeBuilder.jsonSchemaTypeToN8nType('number')).toBe('number');
      });

      test('should convert integer type', () => {
        expect(N8nNodeBuilder.jsonSchemaTypeToN8nType('integer')).toBe('number');
      });

      test('should convert boolean type', () => {
        expect(N8nNodeBuilder.jsonSchemaTypeToN8nType('boolean')).toBe('boolean');
      });

      test('should convert array type', () => {
        expect(N8nNodeBuilder.jsonSchemaTypeToN8nType('array')).toBe('collection');
      });

      test('should convert object type', () => {
        expect(N8nNodeBuilder.jsonSchemaTypeToN8nType('object')).toBe('json');
      });

      test('should convert enum to options', () => {
        expect(
          N8nNodeBuilder.jsonSchemaTypeToN8nType('string', {
            enum: ['a', 'b', 'c'],
          })
        ).toBe('options');
      });

      test('should convert date-time format to dateTime', () => {
        expect(
          N8nNodeBuilder.jsonSchemaTypeToN8nType('string', {
            format: 'date-time',
          })
        ).toBe('dateTime');
      });
    });

    describe('Default Values', () => {
      test('should use schema default if provided', () => {
        expect(N8nNodeBuilder.getDefaultValue({ type: 'string', default: 'test' })).toBe('test');
      });

      test('should return empty string for string type', () => {
        expect(N8nNodeBuilder.getDefaultValue({ type: 'string' })).toBe('');
      });

      test('should return 0 for number type', () => {
        expect(N8nNodeBuilder.getDefaultValue({ type: 'number' })).toBe(0);
      });

      test('should return false for boolean type', () => {
        expect(N8nNodeBuilder.getDefaultValue({ type: 'boolean' })).toBe(false);
      });

      test('should return empty array for array type', () => {
        expect(N8nNodeBuilder.getDefaultValue({ type: 'array' })).toEqual([]);
      });

      test('should return empty object for object type', () => {
        expect(N8nNodeBuilder.getDefaultValue({ type: 'object' })).toEqual({});
      });
    });
  });

  describe('N8nNodeGenerator', () => {
    describe('Class Name Conversion', () => {
      test('should convert to PascalCase', () => {
        expect(N8nNodeGenerator.toClassName('my api')).toBe('MyApi');
      });

      test('should handle special characters', () => {
        expect(N8nNodeGenerator.toClassName('my-api_name')).toBe('MyApiName');
      });

      test('should handle single word', () => {
        expect(N8nNodeGenerator.toClassName('api')).toBe('Api');
      });
    });

    describe('Node Name Conversion', () => {
      test('should convert to kebab-case', () => {
        expect(N8nNodeGenerator.toNodeName('MyAPI')).toBe('myapi');
      });

      test('should handle special characters', () => {
        expect(N8nNodeGenerator.toNodeName('My API Name')).toBe('my-api-name');
      });

      test('should handle multiple hyphens', () => {
        expect(N8nNodeGenerator.toNodeName('my---api')).toBe('my-api');
      });

      test('should trim leading/trailing hyphens', () => {
        expect(N8nNodeGenerator.toNodeName('-my-api-')).toBe('my-api');
      });
    });

    describe('Package.json Generation', () => {
      test('should generate valid package.json', () => {
        const mockNodeDef = {
          nodeName: 'TestAPI',
          displayName: 'Test API',
          operations: {},
          properties: [],
        };

        const packageJson = N8nNodeGenerator.generatePackageJson(mockNodeDef, {
          nodeName: 'TestAPI',
          displayName: 'Test API',
          version: '1.0.0',
          author: 'Test Author',
        });

        const parsed = JSON.parse(packageJson);

        expect(parsed.name).toBe('n8n-nodes-testapi');
        expect(parsed.version).toBe('1.0.0');
        expect(parsed.author.name).toBe('Test Author');
        expect(parsed.keywords).toContain('n8n-community-node-package');
      });

      test('should include n8n configuration', () => {
        const mockNodeDef = {
          nodeName: 'TestAPI',
          operations: {},
          properties: [],
        };

        const packageJson = N8nNodeGenerator.generatePackageJson(mockNodeDef, {
          nodeName: 'TestAPI',
        });

        const parsed = JSON.parse(packageJson);

        expect(parsed.n8n).toBeDefined();
        expect(parsed.n8n.n8nNodesApiVersion).toBe(1);
        expect(parsed.n8n.nodes).toHaveLength(1);
      });

      test('should include credentials when auth is required', () => {
        const mockNodeDef = {
          nodeName: 'TestAPI',
          operations: {},
          properties: [],
        };

        const packageJson = N8nNodeGenerator.generatePackageJson(mockNodeDef, {
          nodeName: 'TestAPI',
          requiresAuth: true,
        });

        const parsed = JSON.parse(packageJson);

        expect(parsed.n8n.credentials).toHaveLength(1);
      });

      test('should not include credentials when auth is not required', () => {
        const mockNodeDef = {
          nodeName: 'TestAPI',
          operations: {},
          properties: [],
        };

        const packageJson = N8nNodeGenerator.generatePackageJson(mockNodeDef, {
          nodeName: 'TestAPI',
          requiresAuth: false,
        });

        const parsed = JSON.parse(packageJson);

        expect(parsed.n8n.credentials).toHaveLength(0);
      });
    });

    describe('README Generation', () => {
      test('should generate comprehensive README', () => {
        const mockNodeDef = {
          nodeName: 'TestAPI',
          displayName: 'Test API',
          operations: {
            users: [
              {
                action: 'Get all',
                description: 'Get all users',
              },
              {
                action: 'Create',
                description: 'Create a user',
              },
            ],
          },
        };

        const readme = N8nNodeGenerator.generateReadme(mockNodeDef, {
          nodeName: 'TestAPI',
          displayName: 'Test API',
          description: 'Test API node',
          baseUrl: 'https://api.example.com',
        });

        expect(readme).toContain('n8n-nodes-testapi');
        expect(readme).toContain('Test API');
        expect(readme).toContain('https://api.example.com');
        expect(readme).toContain('Users');
        expect(readme).toContain('Get all');
        expect(readme).toContain('Create');
      });

      test('should handle node with no operations', () => {
        const mockNodeDef = {
          nodeName: 'TestAPI',
          displayName: 'Test API',
          operations: {},
        };

        const readme = N8nNodeGenerator.generateReadme(mockNodeDef, {
          nodeName: 'TestAPI',
          displayName: 'Test API',
        });

        expect(readme).toContain('n8n-nodes-testapi');
        expect(readme).toContain('Test API');
      });
    });

    describe('.gitignore Generation', () => {
      test('should generate complete gitignore', () => {
        const gitignore = N8nNodeGenerator.generateGitignore();

        expect(gitignore).toContain('node_modules/');
        expect(gitignore).toContain('dist/');
        expect(gitignore).toContain('.env');
        expect(gitignore).toContain('.DS_Store');
      });
    });

    describe('Gulpfile Generation', () => {
      test('should generate valid gulpfile', () => {
        const gulpfile = N8nNodeGenerator.generateGulpfile('TestAPI');

        expect(gulpfile).toContain('gulp');
        expect(gulpfile).toContain('build:icons');
        expect(gulpfile).toContain('TestAPI');
      });
    });

    describe('File Writing', () => {
      test('should write all files to correct locations', () => {
        const outputDir = path.join(tempDir, 'write-test');
        const files = {
          'TestAPI.node.ts': 'node content',
          'TestAPI.credentials.ts': 'credentials content',
          'package.json': '{}',
          'README.md': '# Test',
          '.gitignore': 'node_modules/',
        };

        N8nNodeGenerator.writeFiles(files, outputDir);

        expect(fs.existsSync(path.join(outputDir, 'nodes', 'TestAPI.node.ts'))).toBe(true);
        expect(fs.existsSync(path.join(outputDir, 'credentials', 'TestAPI.credentials.ts'))).toBe(true);
        expect(fs.existsSync(path.join(outputDir, 'package.json'))).toBe(true);
        expect(fs.existsSync(path.join(outputDir, 'README.md'))).toBe(true);
        expect(fs.existsSync(path.join(outputDir, '.gitignore'))).toBe(true);
      });

      test('should create directories if they do not exist', () => {
        const outputDir = path.join(tempDir, 'new-dir', 'nested', 'deep');
        const files = {
          'package.json': '{}',
        };

        N8nNodeGenerator.writeFiles(files, outputDir);

        expect(fs.existsSync(outputDir)).toBe(true);
        expect(fs.existsSync(path.join(outputDir, 'package.json'))).toBe(true);
      });
    });
  });

  describe('Integration Tests', () => {
    test('should generate complete n8n node package from real API structure', async () => {
      // Create realistic API structure
      const apiDir = path.join(tempDir, 'integration-api');
      const usersDir = path.join(apiDir, 'users');
      const usersIdDir = path.join(usersDir, '[id]');
      const productsDir = path.join(apiDir, 'products');

      fs.mkdirSync(usersIdDir, { recursive: true });
      fs.mkdirSync(productsDir, { recursive: true });

      // GET /users
      fs.writeFileSync(
        path.join(usersDir, 'get.js'),
        `
class Request {
  constructor() {
    // @description('Number of users per page')
    this.limit = 10;

    // @description('Page offset')
    this.offset = 0;

    // @description('Filter by role')
    this.role = '';
  }
}

class Response {
  constructor() {
    this.users = [];
    this.total = 0;
  }
}

// @description('Get all users with optional filtering and pagination')
// @summary('List users')
// @tags('users')
function handler(req, res) {
  res.json({ users: [], total: 0 });
}

module.exports = handler;
        `
      );

      // POST /users
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
    this.role = 'user';;
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

// @description('Create a new user in the system')
// @summary('Create user')
// @tags('users')
function handler(req, res) {
  res.json({
    id: '123',
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    createdAt: new Date().toISOString()
  });
}

module.exports = handler;
        `
      );

      // GET /users/:id
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

// @description('Get user details by ID')
// @summary('Get user')
// @tags('users')
function handler(req, res) {
  res.json({
    id: req.params.id,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'admin',
    createdAt: '2025-01-01T00:00:00Z'
  });
}

module.exports = handler;
        `
      );

      // GET /products
      fs.writeFileSync(
        path.join(productsDir, 'get.js'),
        `
class Request {
  constructor() {
    // @description('Product category')
    this.category = '';
    // @description('Minimum price')
    this.minPrice = 0;
  }
}

class Response {
  constructor() {
    this.products = [];
  }
}

// @description('Get products with optional filtering')
// @summary('List products')
// @tags('products')
function handler(req, res) {
  res.json({ products: [] });
}

module.exports = handler;
        `
      );

      const outputDir = path.join(tempDir, 'integration-output');
      const server = new N8nServer({
        apiPath: apiDir,
        outputDir,
        nodeName: 'EcommerceAPI',
        displayName: 'Ecommerce API',
        description: 'n8n node for Ecommerce API',
        baseUrl: 'https://api.ecommerce.example.com',
        author: 'Test Team',
        version: '1.0.0',
        requiresAuth: true,
      });

      const result = await server.start();

      // Verify success
      expect(result.success).toBe(true);

      // Verify all expected files exist
      expect(fs.existsSync(path.join(outputDir, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'README.md'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'tsconfig.json'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, '.gitignore'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'gulpfile.js'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'nodes', 'EcommerceAPI.node.ts'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'credentials', 'EcommerceAPI.credentials.ts'))).toBe(true);

      // Verify package.json content
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(outputDir, 'package.json'), 'utf8')
      );
      expect(packageJson.name).toBe('n8n-nodes-ecommerceapi');
      expect(packageJson.version).toBe('1.0.0');
      expect(packageJson.description).toBe('n8n node for Ecommerce API');
      expect(packageJson.author.name).toBe('Test Team');
      expect(packageJson.n8n.credentials).toHaveLength(1);

      // Verify README content
      const readme = fs.readFileSync(path.join(outputDir, 'README.md'), 'utf8');
      expect(readme).toContain('Ecommerce API');
      expect(readme).toContain('https://api.ecommerce.example.com');
      expect(readme).toContain('Users');
      expect(readme).toContain('Products');
    });

    test('should handle complex schema types in field generation', async () => {
      const apiDir = path.join(tempDir, 'complex-api');
      fs.mkdirSync(apiDir, { recursive: true });

      fs.writeFileSync(
        path.join(apiDir, 'complex.js'),
        `
class Request {
  constructor() {
    // @description('String with pattern validation')
    this.email = '';
    // @description('Number with range validation')
    this.age = '';
    // @description('Boolean flag')
    this.active = '';
    // @description('Enum value')
    this.status = '';
    // @description('Array of tags')
    this.tags = '';
    // @description('Nested object')
    this.metadata = '';
    this.key = '';
    this.value = '';
  }
};
}

class Response {
  constructor() {
    this.success = '';
  }
}

// @description('Complex endpoint with various field types')
function handler(req, res) {
  res.json({ success: true });
}

module.exports = handler;
        `
      );

      const outputDir = path.join(tempDir, 'complex-output');
      const server = new N8nServer({
        apiPath: apiDir,
        outputDir,
      });

      const result = await server.start();

      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'package.json'))).toBe(true);
    });
  });
});
