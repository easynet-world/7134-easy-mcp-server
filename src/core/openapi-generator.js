/**
 * OpenAPI Generator
 * Generates OpenAPI 3.0 specifications from discovered API routes
 */

class OpenAPIGenerator {
  constructor(apiLoader) {
    this.apiLoader = apiLoader;
  }

  /**
   * Generate OpenAPI specification
   */
  generateSpec() {
    const routes = this.apiLoader.getRoutes();
    const paths = this.generatePaths(routes);
    const components = this.generateComponents();
    
    const spec = {
      openapi: '3.0.0',
      info: this.generateInfo(),
      servers: this.generateServers(),
      paths: paths,
      components: components,
      tags: this.generateTags(routes)
    };
    
    // Validate and fix the spec to ensure OpenAPI compliance
    this.validateAndFixSpec(spec);
    
    return spec;
  }

  /**
   * Validate and fix OpenAPI specification to ensure compliance
   * @param {Object} spec - OpenAPI specification object
   */
  validateAndFixSpec(spec) {
    if (!spec.paths) return;
    
    const operationIds = new Set();
    
    // Ensure all path parameters in path are defined in parameters array
    Object.entries(spec.paths).forEach(([path, pathItem]) => {
      // Extract parameter names from path (OpenAPI format: {param})
      const pathParamNames = new Set();
      const pathParamRegex = /\{([^}]+)\}/g;
      let match;
      while ((match = pathParamRegex.exec(path)) !== null) {
        pathParamNames.add(match[1]);
      }
      
      // Check each operation in the path
      Object.entries(pathItem).forEach(([method, operation]) => {
        if (!operation || typeof operation !== 'object' || ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].indexOf(method) === -1) {
          return;
        }
        
        // Ensure operationId is unique
        if (operation.operationId) {
          if (operationIds.has(operation.operationId)) {
            // Make operationId unique by appending method and index
            let counter = 1;
            let uniqueId = `${operation.operationId}_${counter}`;
            while (operationIds.has(uniqueId)) {
              counter++;
              uniqueId = `${operation.operationId}_${counter}`;
            }
            operation.operationId = uniqueId;
          }
          operationIds.add(operation.operationId);
        }
        
        // Ensure all path parameters are defined
        if (pathParamNames.size > 0) {
          operation.parameters = operation.parameters || [];
          
          // Check if all path parameters are defined
          pathParamNames.forEach(paramName => {
            const paramDefined = operation.parameters.some(p => 
              p.name === paramName && p.in === 'path'
            );
            
            if (!paramDefined) {
              // Add missing path parameter
              operation.parameters.push({
                name: paramName,
                in: 'path',
                required: true,
                description: `${paramName} path parameter`,
                schema: {
                  type: 'string'
                }
              });
            } else {
              // Ensure existing path parameter has required: true
              const param = operation.parameters.find(p => p.name === paramName && p.in === 'path');
              if (param) {
                param.required = true;
              }
            }
          });
        }
        
        // Ensure responses object exists
        if (!operation.responses) {
          operation.responses = {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Success'
                  }
                }
              }
            }
          };
        }
        
        // Ensure all responses have content structure (if they have content)
        Object.entries(operation.responses).forEach(([statusCode, response]) => {
          if (response && typeof response === 'object' && response.content) {
            // Ensure content has at least one media type
            if (Object.keys(response.content).length === 0) {
              response.content['application/json'] = {
                schema: statusCode.startsWith('2') || statusCode === '200' || statusCode === '201' 
                  ? { $ref: '#/components/schemas/Success' }
                  : { $ref: '#/components/schemas/Error' }
              };
            }
          }
        });
      });
    });
  }

  /**
   * Convert Express-style path parameters (:param) to OpenAPI format ({param})
   * @param {string} path - Express-style path (e.g., /users/:id)
   * @returns {string} OpenAPI-style path (e.g., /users/{id})
   */
  convertPathToOpenAPIFormat(path) {
    if (!path || typeof path !== 'string') {
      return path;
    }
    // Convert :param to {param} format for OpenAPI spec
    return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}');
  }

  /**
   * Generate paths object from routes
   */
  generatePaths(routes) {
    const paths = {};
    
    if (!routes || !Array.isArray(routes)) {
      return paths;
    }
    
    routes.forEach(route => {
      if (!route || !route.path || !route.method) {
        return; // Skip malformed routes
      }
      
      // Convert Express path format to OpenAPI format
      const openApiPath = this.convertPathToOpenAPIFormat(route.path);
      
      if (!paths[openApiPath]) {
        paths[openApiPath] = {};
      }
      
      const processor = route.processorInstance;
      const method = route.method.toLowerCase();
      
      if (processor) {
        // Build API info with available properties
        // Use OpenAPI path format for operationId
        const operationIdPath = openApiPath.replace(/\//g, '_').replace(/^_/, '').replace(/\{([^}]+)\}/g, '_$1_');
        const apiInfo = {
          summary: `${route.method} ${route.path}`,
          tags: ['api'],
          operationId: `${method}_${operationIdPath}`
        };
        
        // Add description if available
        if (processor.description) {
          apiInfo.description = processor.description;
        }
        
        // Add custom OpenAPI info if available (including annotation-based responses)
        if (processor.openApi) {
          Object.assign(apiInfo, processor.openApi);
        }
        
        // Extract path parameters from route and add them to the API info
        // Use the original Express path format for parameter extraction
        const pathParams = this.extractPathParameters(route.path);
        if (pathParams.length > 0) {
          // Merge with existing parameters if any
          apiInfo.parameters = apiInfo.parameters || [];
          
          // Add path parameters that don't already exist
          pathParams.forEach(param => {
            const existingParam = apiInfo.parameters.find(p => p.name === param.name && p.in === 'path');
            if (!existingParam) {
              apiInfo.parameters.push(param);
            }
          });
        }
        
        // Only auto-generate responses if no annotation-based responses are available
        if (!apiInfo.responses || Object.keys(apiInfo.responses).length === 0) {
          apiInfo.responses = this.generateResponseSchema(processor);
        }
        
        // Add default error responses if not provided
        if (!apiInfo.responses['400']) {
          apiInfo.responses['400'] = {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          };
        }
        
        if (!apiInfo.responses['500']) {
          apiInfo.responses['500'] = {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          };
        }
        
        paths[openApiPath][method] = apiInfo;
      } else {
        paths[openApiPath][method] = {
          summary: `${route.method} ${route.path}`,
          tags: ['api'],
          operationId: `${method}_${openApiPath.replace(/\//g, '_').replace(/^_/, '').replace(/\{([^}]+)\}/g, '_$1_')}`,
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Success'
                  }
                }
              }
            }
          }
        };
      }
    });
    
    return paths;
  }

  /**
   * Generate API info
   */
  generateInfo() {
    const packageJson = require('../../package.json');
    return {
      title: 'Easy MCP Server API',
      version: packageJson.version,
      description: 'A dynamic API framework with easy MCP (Model Context Protocol) integration for AI models. Includes LLM.txt support for AI model context.',
      contact: {
        name: 'API Support',
        url: 'https://github.com/easynet-world/easy-mcp-server'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      },
      externalDocs: {
        description: 'LLM.txt - AI Model Context',
        url: '/LLM.txt'
      }
    };
  }

  /**
   * Generate servers configuration
   */
  generateServers() {
    const port = process.env.EASY_MCP_SERVER_PORT || 8887;
    const host = process.env.EASY_MCP_SERVER_HOST || 'localhost';
    
    return [
      {
        url: `http://${host}:${port}`,
        description: 'Local development server'
      }
    ];
  }

  /**
   * Generate components (schemas, etc.)
   */
  generateComponents() {
    return {
      schemas: {
        Error: {
          type: 'object',
          required: ['success', 'error', 'timestamp'],
          properties: {
            success: { 
              type: 'boolean', 
              example: false,
              description: 'Operation success status'
            },
            error: { 
              type: 'string', 
              example: 'Error message',
              description: 'Error description'
            },
            timestamp: { 
              type: 'string', 
              format: 'date-time',
              description: 'Error timestamp'
            }
          }
        },
        Success: {
          type: 'object',
          required: ['success', 'timestamp'],
          properties: {
            success: { 
              type: 'boolean', 
              example: true,
              description: 'Operation success status'
            },
            data: { 
              type: 'object',
              description: 'Response data'
            },
            timestamp: { 
              type: 'string', 
              format: 'date-time',
              description: 'Response timestamp'
            }
          }
        },
        APIResponse: {
          type: 'object',
          properties: {
            success: { 
              type: 'boolean',
              description: 'Operation success status'
            },
            data: { 
              type: 'object',
              description: 'Response data'
            },
            message: { 
              type: 'string',
              description: 'Response message'
            },
            timestamp: { 
              type: 'string', 
              format: 'date-time',
              description: 'Response timestamp'
            }
          }
          // Additional properties can be added dynamically based on route schemas
        }
      },
      securitySchemes: {
        // Add security schemes if needed
      }
    };
  }

  /**
   * Generate tags for API grouping
   */
  generateTags(routes) {
    const tags = [
      {
        name: 'api',
        description: 'Dynamic API endpoints'
      }
    ];
    
    if (!routes || !Array.isArray(routes)) {
      return tags;
    }
    
    // Extract unique tags from routes
    const routeTags = new Set();
    routes.forEach(route => {
      if (route.processorInstance?.openApi?.tags) {
        route.processorInstance.openApi.tags.forEach(tag => routeTags.add(tag));
      }
    });
    
    routeTags.forEach(tag => {
      tags.push({
        name: tag,
        description: `${tag} related endpoints`
      });
    });
    
    return tags;
  }

  /**
   * Extract path parameters from route path
   * @param {string} path - The route path (e.g., /users/:userId/posts/:postId)
   * @returns {Array} Array of OpenAPI parameter objects
   */
  extractPathParameters(path) {
    const params = [];
    const paramRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    
    while ((match = paramRegex.exec(path)) !== null) {
      const paramName = match[1];
      params.push({
        name: paramName,
        in: 'path',
        required: true,
        description: `${paramName} parameter`,
        schema: {
          type: 'string'
        }
      });
    }
    
    return params;
  }

  /**
   * Auto-generate response schema by analyzing the processor
   * @param {Object} processor - The API processor instance
   * @returns {Object} OpenAPI response schema
   */
  generateResponseSchema(processor) {
    try {
      // Try to get a sample response by calling the process method with mock data
      const mockReq = {
        body: {},
        query: {},
        params: {},
        headers: {}
      };
      
      const mockRes = {
        json: (data) => {
          // Capture the response data
          mockRes.responseData = data;
        },
        status: (code) => {
          mockRes.statusCode = code;
          return mockRes;
        }
      };

      // Call the process method to get sample response
      if (typeof processor.process === 'function') {
        processor.process(mockReq, mockRes);
        
        if (mockRes.responseData) {
          return this.generateSchemaFromData(mockRes.responseData);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not auto-generate schema for ${processor.constructor.name}:`, error.message);
    }

    // Fallback to default success response
    return {
      '200': {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Success'
            }
          }
        }
      }
    };
  }

  /**
   * Generate OpenAPI schema from response data
   * @param {*} data - The response data
   * @returns {Object} OpenAPI response schema
   */
  generateSchemaFromData(data) {
    const schema = this.inferSchemaType(data);
    
    return {
      '200': {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: schema
          }
        }
      }
    };
  }

  /**
   * Infer OpenAPI schema type from data
   * @param {*} data - The data to analyze
   * @returns {Object} OpenAPI schema object
   */
  inferSchemaType(data) {
    if (data === null) {
      return { type: 'null' };
    }
    
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return { type: 'array', items: {} };
      }
      return {
        type: 'array',
        items: this.inferSchemaType(data[0])
      };
    }
    
    if (typeof data === 'object') {
      const properties = {};
      const required = [];
      
      for (const [key, value] of Object.entries(data)) {
        properties[key] = this.inferSchemaType(value);
        
        // Consider primitive values as required
        if (value !== null && value !== undefined && typeof value !== 'object') {
          required.push(key);
        }
      }
      
      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined
      };
    }
    
    // Handle primitive types
    switch (typeof data) {
    case 'string':
      return { type: 'string' };
    case 'number':
      return Number.isInteger(data) ? { type: 'integer' } : { type: 'number' };
    case 'boolean':
      return { type: 'boolean' };
    default:
      return { type: 'string' };
    }
  }
}

module.exports = OpenAPIGenerator;
