const Logger = require('../../utils/logger');
const SchemaNormalizer = require('../../mcp/utils/schema-normalizer');

const logger = Logger.default || new Logger();

/**
 * Builds n8n node definitions from API routes
 */
class N8nNodeBuilder {
  /**
   * Convert API routes to n8n node operations
   * @param {Array} routes - Array of route objects from API loader
   * @param {Object} options - Configuration options
   * @returns {Object} n8n node definition
   */
  static buildNodeDefinition(routes, options = {}) {
    const {
      nodeName = 'CustomAPI',
      displayName = 'Custom API',
      description = 'Generated n8n node from easy-mcp-server',
      icon = 'file:customapi.svg',
      credentials = [],
      baseUrl = 'http://localhost:3000'
    } = options;

    // Group routes by resource (first path segment)
    const operations = this.buildOperations(routes);
    const properties = this.buildProperties(routes, operations);

    return {
      nodeName,
      displayName,
      description,
      icon,
      credentials,
      baseUrl,
      operations,
      properties,
      version: 1,
      defaults: {
        name: displayName,
      },
      inputs: ['main'],
      outputs: ['main'],
      subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    };
  }

  /**
   * Build operations grouped by resource
   * @param {Array} routes - API routes
   * @returns {Object} Resource-based operations
   */
  static buildOperations(routes) {
    const operations = {};

    routes.forEach(route => {
      const { path, method, processor } = route;
      const resource = this.extractResource(path);
      const operation = this.extractOperation(method, path, processor);

      if (!operations[resource]) {
        operations[resource] = [];
      }

      operations[resource].push({
        name: operation.name,
        value: operation.value,
        description: operation.description,
        action: operation.action,
        routing: {
          request: {
            method: method,
            url: path,
          },
        },
      });
    });

    return operations;
  }

  /**
   * Extract resource name from path
   * @param {string} path - API path
   * @returns {string} Resource name
   */
  static extractResource(path) {
    const segments = path.split('/').filter(s => s && !s.startsWith(':'));
    return segments[0] || 'general';
  }

  /**
   * Extract operation details from route
   * @param {string} method - HTTP method
   * @param {string} path - API path
   * @param {Object} processor - Route processor
   * @returns {Object} Operation details
   */
  static extractOperation(method, path, processor) {
    const hasIdParam = path.includes(':id');
    const methodLower = method.toLowerCase();

    // Determine operation type based on method and path
    let operationName = methodLower;
    let operationAction = methodLower;

    if (methodLower === 'get' && hasIdParam) {
      operationName = 'get';
      operationAction = 'Get one';
    } else if (methodLower === 'get') {
      operationName = 'getAll';
      operationAction = 'Get all';
    } else if (methodLower === 'post') {
      operationName = 'create';
      operationAction = 'Create';
    } else if (methodLower === 'put' || methodLower === 'patch') {
      operationName = 'update';
      operationAction = 'Update';
    } else if (methodLower === 'delete') {
      operationName = 'delete';
      operationAction = 'Delete';
    }

    const description = processor?.description || processor?.summary || `${operationAction} ${this.extractResource(path)}`;

    return {
      name: operationName.charAt(0).toUpperCase() + operationName.slice(1),
      value: operationName,
      description,
      action: operationAction,
    };
  }

  /**
   * Build n8n properties (input fields) from routes
   * @param {Array} routes - API routes
   * @param {Object} operations - Grouped operations
   * @returns {Array} n8n property definitions
   */
  static buildProperties(routes, operations) {
    const properties = [];

    // Add resource selector
    const resources = Object.keys(operations);
    properties.push({
      displayName: 'Resource',
      name: 'resource',
      type: 'options',
      noDataExpression: true,
      options: resources.map(r => ({
        name: r.charAt(0).toUpperCase() + r.slice(1),
        value: r,
      })),
      default: resources[0] || 'general',
    });

    // Add operation selector (dynamic based on resource)
    resources.forEach(resource => {
      properties.push({
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: [resource],
          },
        },
        options: operations[resource].map(op => ({
          name: op.action,
          value: op.value,
          description: op.description,
          action: op.action,
          routing: op.routing,
        })),
        default: operations[resource][0]?.value || '',
      });
    });

    // Add field properties for each route
    routes.forEach(route => {
      const resource = this.extractResource(route.path);
      const operation = this.extractOperation(route.method, route.path, route.processor);
      const fieldProperties = this.buildFieldProperties(route, resource, operation.value);
      properties.push(...fieldProperties);
    });

    return properties;
  }

  /**
   * Build input field properties for a specific route
   * @param {Object} route - API route
   * @param {string} resource - Resource name
   * @param {string} operation - Operation value
   * @returns {Array} n8n field properties
   */
  static buildFieldProperties(route, resource, operation) {
    const properties = [];
    const { processor, processorInstance, path, method } = route;

    // Support both processorInstance (real routes) and processor (mock routes for testing)
    const proc = processorInstance || processor;
    if (!proc) return properties;

    // Extract schemas from processorInstance.openApi or processor directly
    const openApi = proc.openApi || {};

    // Convert OpenAPI parameters array to schema format
    let pathSchema = null;
    let querySchema = null;
    if (openApi.parameters && Array.isArray(openApi.parameters)) {
      const pathParams = openApi.parameters.filter(p => p.in === 'path');
      const queryParams = openApi.parameters.filter(p => p.in === 'query');

      if (pathParams.length > 0) {
        pathSchema = {
          type: 'object',
          properties: {},
          required: []
        };
        pathParams.forEach(p => {
          pathSchema.properties[p.name] = p.schema;
          if (p.required) pathSchema.required.push(p.name);
        });
      }

      if (queryParams.length > 0) {
        querySchema = {
          type: 'object',
          properties: {},
          required: []
        };
        queryParams.forEach(p => {
          querySchema.properties[p.name] = p.schema;
          if (p.required) querySchema.required.push(p.name);
        });
      }
    }

    // Fallback to other schema sources
    pathSchema = pathSchema || proc.pathParametersSchema || proc.input?.path;
    querySchema = querySchema || proc.queryParametersSchema || proc.input?.query;
    const bodySchema = openApi.requestBody?.content?.['application/json']?.schema || proc.requestBodySchema || proc.input?.body;

    // Normalize schemas
    const schemaNormalizer = new SchemaNormalizer();
    const normalizedPathSchema = pathSchema ? schemaNormalizer.normalizeNestedSchema(pathSchema) : null;
    const normalizedQuerySchema = querySchema ? schemaNormalizer.normalizeNestedSchema(querySchema) : null;
    const normalizedBodySchema = bodySchema ? schemaNormalizer.normalizeNestedSchema(bodySchema) : null;

    // Build path parameter fields
    if (normalizedPathSchema?.properties) {
      Object.entries(normalizedPathSchema.properties).forEach(([name, schema]) => {
        properties.push(this.createN8nField(name, schema, 'path', resource, operation, normalizedPathSchema.required));
      });
    }

    // Build query parameter fields
    if (normalizedQuerySchema?.properties) {
      Object.entries(normalizedQuerySchema.properties).forEach(([name, schema]) => {
        properties.push(this.createN8nField(name, schema, 'query', resource, operation, normalizedQuerySchema.required));
      });
    }

    // Build body parameter fields (flatten nested structures for n8n compatibility)
    if (normalizedBodySchema?.properties) {
      Object.entries(normalizedBodySchema.properties).forEach(([name, schema]) => {
        properties.push(this.createN8nField(name, schema, 'body', resource, operation, normalizedBodySchema.required));
      });
    }

    return properties;
  }

  /**
   * Create an n8n field definition
   * @param {string} name - Field name
   * @param {Object} schema - JSON schema for field
   * @param {string} paramType - 'path', 'query', or 'body'
   * @param {string} resource - Resource name
   * @param {string} operation - Operation value
   * @param {Array} requiredFields - List of required field names
   * @returns {Object} n8n field definition
   */
  static createN8nField(name, schema, paramType, resource, operation, requiredFields = []) {
    const n8nType = this.jsonSchemaTypeToN8nType(schema.type, schema);
    const isRequired = requiredFields.includes(name);

    const field = {
      displayName: this.formatDisplayName(name),
      name: name,
      type: n8nType,
      default: this.getDefaultValue(schema),
      description: schema.description || `${this.formatDisplayName(name)} parameter`,
      displayOptions: {
        show: {
          resource: [resource],
          operation: [operation],
        },
      },
    };

    // Add required indicator
    if (isRequired) {
      field.required = true;
    }

    // Add routing information based on parameter type
    if (paramType === 'path') {
      field.routing = {
        request: {
          url: `={{$value}}`, // Path params are injected into URL
        },
        send: {
          property: name,
          type: 'path',
        },
      };
    } else if (paramType === 'query') {
      field.routing = {
        send: {
          property: name,
          type: 'query',
        },
      };
    } else if (paramType === 'body') {
      field.routing = {
        send: {
          property: name,
          type: 'body',
        },
      };
    }

    // Add options for enum types
    if (schema.enum && Array.isArray(schema.enum)) {
      field.options = schema.enum.map(value => ({
        name: String(value),
        value: value,
      }));
    }

    // Add validation for number types
    if (schema.type === 'number' || schema.type === 'integer') {
      if (schema.minimum !== undefined) field.typeOptions = { ...field.typeOptions, minValue: schema.minimum };
      if (schema.maximum !== undefined) field.typeOptions = { ...field.typeOptions, maxValue: schema.maximum };
    }

    // Add validation for string types
    if (schema.type === 'string') {
      if (schema.minLength !== undefined) field.typeOptions = { ...field.typeOptions, minLength: schema.minLength };
      if (schema.maxLength !== undefined) field.typeOptions = { ...field.typeOptions, maxLength: schema.maxLength };
      if (schema.pattern) field.typeOptions = { ...field.typeOptions, pattern: schema.pattern };
    }

    return field;
  }

  /**
   * Convert JSON Schema type to n8n field type
   * @param {string} jsonSchemaType - JSON Schema type
   * @param {Object} schema - Full schema object
   * @returns {string} n8n field type
   */
  static jsonSchemaTypeToN8nType(jsonSchemaType, schema = {}) {
    if (schema.enum) return 'options';

    switch (jsonSchemaType) {
      case 'string':
        if (schema.format === 'date-time') return 'dateTime';
        if (schema.format === 'date') return 'dateTime';
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        return 'collection';
      case 'object':
        return 'json';
      default:
        return 'string';
    }
  }

  /**
   * Get default value for a schema
   * @param {Object} schema - JSON schema
   * @returns {*} Default value
   */
  static getDefaultValue(schema) {
    if (schema.default !== undefined) return schema.default;

    switch (schema.type) {
      case 'string': return '';
      case 'number':
      case 'integer': return 0;
      case 'boolean': return false;
      case 'array': return [];
      case 'object': return {};
      default: return '';
    }
  }

  /**
   * Format field name for display
   * @param {string} name - Field name
   * @returns {string} Formatted display name
   */
  static formatDisplayName(name) {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Build complete n8n node package structure
   * @param {Array} routes - API routes
   * @param {Object} options - Configuration options
   * @returns {Object} Complete node package data
   */
  static buildNodePackage(routes, options = {}) {
    const nodeDefinition = this.buildNodeDefinition(routes, options);

    return {
      nodeDefinition,
      packageJson: this.buildPackageJson(options),
      credentials: this.buildCredentials(options),
    };
  }

  /**
   * Build package.json for n8n node
   * @param {Object} options - Configuration options
   * @returns {Object} package.json content
   */
  static buildPackageJson(options = {}) {
    const {
      nodeName = 'CustomAPI',
      displayName = 'Custom API',
      description = 'Generated n8n node from easy-mcp-server',
      version = '1.0.0',
      author = '',
      keywords = []
    } = options;

    const packageName = `n8n-nodes-${nodeName.toLowerCase().replace(/\s+/g, '-')}`;

    return {
      name: packageName,
      version,
      description,
      keywords: ['n8n-community-node-package', ...keywords],
      license: 'MIT',
      homepage: '',
      author: {
        name: author,
        email: '',
      },
      repository: {
        type: 'git',
        url: '',
      },
      main: 'index.js',
      scripts: {
        build: 'tsc && gulp build:icons',
        dev: 'tsc --watch',
        format: 'prettier nodes --write',
        lint: 'eslint nodes package.json',
        lintfix: 'eslint nodes package.json --fix',
        prepublishOnly: 'npm run build && npm run lint -c .eslintrc.prepublish.js nodes package.json',
      },
      files: ['dist'],
      n8n: {
        n8nNodesApiVersion: 1,
        credentials: [],
        nodes: [`dist/nodes/${nodeName}/${nodeName}.node.js`],
      },
      devDependencies: {
        '@typescript-eslint/parser': '^5.0.0',
        eslint: '^8.0.0',
        'eslint-plugin-n8n-nodes-base': '^1.11.0',
        gulp: '^4.0.2',
        n8n: '*',
        'n8n-workflow': '*',
        prettier: '^2.7.1',
        typescript: '^4.8.4',
      },
      peerDependencies: {
        n8n: '*',
        'n8n-workflow': '*',
      },
    };
  }

  /**
   * Build credentials definition if needed
   * @param {Object} options - Configuration options
   * @returns {Object|null} Credentials definition
   */
  static buildCredentials(options = {}) {
    const { requiresAuth = false, authType = 'apiKey' } = options;

    if (!requiresAuth) return null;

    return {
      name: `${options.nodeName || 'CustomAPI'}Api`,
      displayName: `${options.displayName || 'Custom API'} API`,
      documentationUrl: '',
      properties: [
        {
          displayName: 'API Key',
          name: 'apiKey',
          type: 'string',
          typeOptions: { password: true },
          default: '',
        },
      ],
    };
  }
}

module.exports = N8nNodeBuilder;
