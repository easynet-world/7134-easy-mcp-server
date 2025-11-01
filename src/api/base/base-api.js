/**
 * Base API Class
 * 
 * Provides common OpenAPI structure and MCP integration for all API endpoints.
 * This is the foundation class that all API endpoints should extend.
 * 
 * Features:
 * - Automatic OpenAPI specification generation from class properties
 * - MCP tool integration (APIs automatically become MCP tools)
 * - Schema definition via class properties
 * - JSDoc annotation support
 * - TypeScript support
 * 
 * Subclasses should define the following properties:
 * - description: string - Description of the API endpoint
 * - summary: string - Brief summary of the API endpoint
 * - tags: array - Tags for grouping endpoints in documentation
 * - requestBodySchema: object - JSON schema for request body
 * - responseSchema: object - JSON schema for response
 * - errorResponses: object - Error response schemas (status code → schema)
 * - pathParametersSchema: object - Path parameters schema
 * - queryParametersSchema: object - Query parameters schema
 * 
 * The `process(req, res)` method must be implemented by subclasses.
 * 
 * @class BaseAPI
 * @example
 * class MyAPI extends BaseAPI {
 *   summary = 'Get user information';
 *   description = 'Retrieves user details by ID';
 *   tags = ['users'];
 *   queryParametersSchema = { id: { type: 'string', required: true } };
 *   responseSchema = { user: { type: 'object' } };
 *   
 *   process(req, res) {
 *     res.json({ user: { id: req.query.id } });
 *   }
 * }
 */

class BaseAPI {
  /**
   * Process the request and generate response
   * Must be implemented by subclasses
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  process(_req, _res) {
    throw new Error('process method must be implemented by subclass');
  }

  /**
   * Get OpenAPI specification
   * Auto-generates response schema from subclass properties
   * @returns {Object} OpenAPI specification
   */
  get openApi() {
    const baseSpec = {
      summary: this.summary || 'API endpoint summary',
      description: this.description || 'API endpoint description',
      tags: this.tags || ['api'],
    };

    // Add request body schema if available
    const requestBody = this.requestBodySchema;
    if (requestBody) {
      baseSpec.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: requestBody
          }
        }
      };
    }

    // Add path parameters if available
    const pathParameters = this.pathParametersSchema;
    const queryParameters = this.queryParametersSchema;
    
    let allParameters = [];
    
    if (pathParameters) {
      allParameters = allParameters.concat(this.formatPathParameters(pathParameters));
    }
    
    if (queryParameters) {
      allParameters = allParameters.concat(this.formatQueryParameters(queryParameters));
    }
    
    if (allParameters.length > 0) {
      baseSpec.parameters = allParameters;
    }

    // Add response schemas if available
    const responseSchema = this.responseSchema;
    const errorResponses = this.errorResponses;
    
    if (responseSchema || errorResponses) {
      baseSpec.responses = {};
      
      // Add success response
      if (responseSchema) {
        baseSpec.responses['200'] = {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: responseSchema
            }
          }
        };
      }
      
      // Add error responses
      if (errorResponses) {
        Object.assign(baseSpec.responses, errorResponses);
      }
    }

    return baseSpec;
  }

  /**
   * Get description from subclass property or fallback to default
   * @returns {string} Description from subclass property or default
   */
  get description() {
    return this._description || 'API endpoint description';
  }

  /**
   * Set description from subclass via super.description = '...'
   */
  set description(value) {
    this._description = value;
  }

  /**
   * Get summary from subclass property or fallback to default
   * @returns {string} Summary from subclass property or default
   */
  get summary() {
    return this._summary || 'API endpoint summary';
  }

  /**
   * Set summary from subclass via super.summary = '...'
   */
  set summary(value) {
    this._summary = value;
  }

  /**
   * Get tags from subclass property or fallback to default
   * @returns {Array} Tags from subclass property or default
   */
  get tags() {
    return this._tags || ['api'];
  }

  /**
   * Set tags from subclass via super.tags = ['a', 'b']
   */
  set tags(value) {
    this._tags = Array.isArray(value) ? value : ['api'];
  }

  /**
   * Get request body schema from subclass property
   * @returns {Object|null} Request body schema or null if not specified
   */
  get requestBodySchema() {
    return this._requestBodySchema || null;
  }

  /**
   * Unified input setter/getter
   * Set via: super.input = { body, query, path }
   */
  set input(value) {
    if (!value || typeof value !== 'object') return;
    if (value.body) this._requestBodySchema = value.body;
    if (value.query) this._queryParametersSchema = value.query;
    if (value.path) this._pathParametersSchema = value.path;
  }

  get input() {
    return {
      body: this.requestBodySchema,
      query: this.queryParametersSchema,
      path: this.pathParametersSchema
    };
  }

  /**
   * Get response schema from subclass property
   * @returns {Object|null} Response schema or null if not specified
   */
  get responseSchema() {
    if (this._responseSchema) {
      return this._responseSchema;
    }

    // If a model class is provided, derive schema automatically
    const ctor = this.constructor;
    const explicitModel = this._modelClass || ctor.model;
    if (explicitModel) {
      const baseSchema = BaseAPI.jsonSchemaFromClass(explicitModel);
      if (!baseSchema) return null;

      // Infer container shape from API class name if not explicitly set
      const rootKey = this._responseRootKey || BaseAPI.inferResourceKeyFromApiClass(ctor.name);
      const isArray = this._responseItemsClass || BaseAPI.inferIsArrayFromApiClass(ctor.name);

      if (isArray) {
        return {
          type: 'object',
          properties: {
            [rootKey]: {
              type: 'array',
              items: baseSchema
            }
          },
          required: [rootKey]
        };
      }

      // Single object response
      return baseSchema;
    }

    // If array items class and a root key are provided, build object schema
    if (this._responseItemsClass && this._responseRootKey) {
      const itemsSchema = BaseAPI.jsonSchemaFromClass(this._responseItemsClass);
      if (itemsSchema) {
        return {
          type: 'object',
          properties: {
            [this._responseRootKey]: {
              type: 'array',
              items: itemsSchema
            }
          },
          required: [this._responseRootKey]
        };
      }
    }

    return null;
  }

  /**
   * Get error responses from subclass property
   * @returns {Object|null} Error responses or null if not specified
   */
  get errorResponses() {
    return this._errorResponses || null;
  }

  /**
   * Get path parameters schema from subclass property
   * @returns {Object|null} Path parameters schema or null if not specified
   */
  get pathParametersSchema() {
    return this._pathParametersSchema || null;
  }

  /**
   * Format path parameters schema for OpenAPI
   * @param {Object} pathSchema - Path parameters schema
   * @returns {Array} Formatted parameters array for OpenAPI
   */
  formatPathParameters(pathSchema) {
    if (!pathSchema || !pathSchema.properties) {
      return [];
    }

    const parameters = [];

    Object.entries(pathSchema.properties).forEach(([name, schema]) => {
      const parameter = {
        name: name,
        in: 'path',
        required: true, // Path parameters are always required
        schema: {
          type: schema.type,
          description: schema.description
        }
      };

      // Add description if available
      if (schema.description) {
        parameter.description = schema.description;
      }

      parameters.push(parameter);
    });

    return parameters;
  }

  /**
   * Get query parameters schema from subclass property
   * @returns {Object|null} Query parameters schema or null if not specified
   */
  get queryParametersSchema() {
    if (this._queryParametersSchema) {
      return this._queryParametersSchema;
    }
    // Fallback: if model class exposes a static querySchema, use it
    const ctor = this.constructor;
    const explicitModel = this._modelClass || ctor.model;
    if (explicitModel && typeof explicitModel.querySchema === 'object') {
      return explicitModel.querySchema;
    }
    return null;
  }

  /**
   * Format query parameters schema for OpenAPI
   * @param {Object} querySchema - Query parameters schema
   * @returns {Array} Formatted parameters array for OpenAPI
   */
  formatQueryParameters(querySchema) {
    if (!querySchema || !querySchema.properties) {
      return [];
    }

    const parameters = [];
    const required = querySchema.required || [];

    Object.entries(querySchema.properties).forEach(([name, schema]) => {
      const parameter = {
        name: name,
        in: 'query',
        schema: schema,
        required: required.includes(name)
      };

      // Add description if available
      if (schema.description) {
        parameter.description = schema.description;
      }

      // Add example if available
      if (schema.example !== undefined) {
        parameter.example = schema.example;
      }

      parameters.push(parameter);
    });

    return parameters;
  }

  /**
   * Get MCP description (uses OpenAPI description)
   * @returns {string} Description for MCP
   */
  get mcpDescription() {
    return this.openApi.description;
  }

  /**
   * Output schema convenience accessor
   * Set via: super.output = schema
   */
  set output(schema) {
    this._responseSchema = schema;
  }

  get output() {
    return this.responseSchema;
  }

  /**
   * Convert a simple class into a JSON Schema by introspecting a default instance
   * Only supports primitive fields (string, number, boolean) and ignores functions/undefined
   * @param {Function} ClassRef - Constructor function for the model
   * @returns {Object|null} JSON Schema object or null if derivation failed
   */
  static jsonSchemaFromClass(ClassRef) {
    try {
      const instance = new ClassRef();
      if (!instance || typeof instance !== 'object') {
        return null;
      }

      const properties = {};
      const required = [];

      Object.keys(instance).forEach((key) => {
        const value = instance[key];
        if (value === undefined || typeof value === 'function') {
          return;
        }
        const typeOf = typeof value;
        let jsonType = null;
        if (typeOf === 'string') jsonType = 'string';
        else if (typeOf === 'number') jsonType = Number.isInteger(value) ? 'integer' : 'number';
        else if (typeOf === 'boolean') jsonType = 'boolean';
        else if (Array.isArray(value)) jsonType = 'array';
        else if (typeOf === 'object') jsonType = 'object';

        if (jsonType) {
          properties[key] = { type: jsonType };
          required.push(key);
        }
      });

      return {
        type: 'object',
        properties,
        required
      };
    } catch (_e) {
      return null;
    }
  }

  /**
   * Infer response root key from API class name (e.g., GetUsers -> 'users')
   */
  static inferResourceKeyFromApiClass(apiClassName) {
    if (!apiClassName || typeof apiClassName !== 'string') return 'items';
    const name = apiClassName.replace(/^(Get|Post|Put|Patch|Delete)/, '');
    const lower = name.charAt(0).toLowerCase() + name.slice(1);
    return lower || 'items';
  }

  /**
   * Infer if response should be an array from API class name ("...s" -> array)
   */
  static inferIsArrayFromApiClass(apiClassName) {
    if (!apiClassName || typeof apiClassName !== 'string') return false;
    const name = apiClassName.replace(/^(Get|Post|Put|Patch|Delete)/, '');
    return /s$/.test(name);
  }
}

module.exports = BaseAPI;

