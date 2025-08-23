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
    
    return {
      openapi: '3.0.0',
      info: this.generateInfo(),
      servers: this.generateServers(),
      paths: paths,
      components: components,
      tags: this.generateTags(routes)
    };
  }

  /**
   * Generate paths object from routes
   */
  generatePaths(routes) {
    const paths = {};
    
    routes.forEach(route => {
      if (!paths[route.path]) {
        paths[route.path] = {};
      }
      
      const processor = route.processorInstance;
      const method = route.method.toLowerCase();
      
      if (processor) {
        // Build API info with available properties
        const apiInfo = {
          summary: `${route.method} ${route.path}`,
          tags: ['api'],
          operationId: `${method}_${route.path.replace(/\//g, '_').replace(/^_/, '')}`
        };
        
        // Add description if available
        if (processor.description) {
          apiInfo.description = processor.description;
        }
        
        // Add custom OpenAPI info if available
        if (processor.openApi) {
          Object.assign(apiInfo, processor.openApi);
        }
        
        // Add default responses
        apiInfo.responses = {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Success'
                }
              }
            }
          },
          '400': {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        };
        
        paths[route.path][method] = apiInfo;
      } else {
        paths[route.path][method] = {
          summary: `${route.method} ${route.path}`,
          tags: ['api'],
          operationId: `${method}_${route.path.replace(/\//g, '_').replace(/^_/, '')}`,
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
      title: 'Easy MCP Framework',
      version: packageJson.version,
      description: 'A dynamic API framework with easy MCP (Model Context Protocol) integration for AI models',
      contact: {
        name: 'API Support',
        url: 'https://github.com/easynet-world/easy-mcp'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    };
  }

  /**
   * Generate servers configuration
   */
  generateServers() {
    const port = process.env.SERVER_PORT || 3000;
    const host = process.env.SERVER_HOST || 'localhost';
    
    return [
      {
        url: `http://${host}:${port}`,
        description: 'Development server'
      },
      {
        url: `https://${host}:${port}`,
        description: 'Production server (HTTPS)'
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
}

module.exports = OpenAPIGenerator;
