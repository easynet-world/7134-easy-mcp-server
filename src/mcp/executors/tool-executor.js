/**
 * Tool Executor
 * Handles executing MCP tools (API endpoints and bridge tools)
 */

class ToolExecutor {
  /**
   * Execute an API endpoint
   */
  async executeAPIEndpoint(route, args, { schemaNormalizer } = {}) {
    const processor = route.processorInstance;
    const openApi = processor?.openApi;
    
    // Map flat args structure to nested API handler structure
    // The tool now uses flat structure (possibly with flattened keys like "product.id"),
    // but handlers expect body/query/headers/params
    const body = {};
    const query = {};
    const headers = {};
    const params = {};
    
    // Categorize parameters based on OpenAPI definition
    if (Array.isArray(openApi?.parameters)) {
      for (const p of openApi.parameters) {
        if (!p || !p.name || !p.in || !(p.name in args)) continue;
        if (p.in === 'query') {
          query[p.name] = args[p.name];
        } else if (p.in === 'header') {
          headers[p.name] = args[p.name];
        } else if (p.in === 'path') {
          params[p.name] = args[p.name];
        }
      }
    }
    
    // Handle request body properties - reconstruct nested objects from flattened keys
    if (openApi?.requestBody?.content?.['application/json']?.schema) {
      const bodySchema = openApi.requestBody.content['application/json'].schema;
      if (bodySchema.type === 'object' && bodySchema.properties) {
        // Reconstruct nested objects from flattened keys (e.g., "product.id" -> product: { id: ... })
        for (const [key, value] of Object.entries(bodySchema.properties)) {
          if (value.type === 'object' && value.properties) {
            // This was flattened, reconstruct the nested object
            const nestedObj = {};
            let hasNestedProps = false;
            for (const nestedKey of Object.keys(value.properties)) {
              const flatKey = `${key}.${nestedKey}`;
              if (flatKey in args) {
                nestedObj[nestedKey] = args[flatKey];
                hasNestedProps = true;
              }
            }
            if (hasNestedProps) {
              body[key] = nestedObj;
            }
          } else if (key in args) {
            // Non-nested property, add directly
            body[key] = args[key];
          }
        }
      } else {
        // Non-object body type
        if ('body' in args) {
          Object.assign(body, typeof args.body === 'object' ? args.body : { body: args.body });
        }
      }
    } else {
      // Fallback: if args has 'body', use it
      if (args.body) {
        Object.assign(body, typeof args.body === 'object' ? args.body : { body: args.body });
      }
    }
    
    // Handle path parameters from route pattern
    const matches = route.path.match(/:([A-Za-z0-9_]+)/g) || [];
    for (const m of matches) {
      const name = m.slice(1);
      if (name in args && !params[name]) {
        params[name] = args[name];
      }
    }
    
    // Create mock request and response objects
    const mockReq = {
      method: route.method,
      path: route.path,
      body: body,
      query: query,
      headers: headers,
      params: params
    };

    const mockRes = {
      statusCode: 200,
      headers: {},
      json: function(data) {
        this.data = data;
        // Only set statusCode to 200 if it hasn't been explicitly set
        if (!this._statusSet) {
          this.statusCode = 200;
        }
        return this;
      },
      send: function(data) {
        this.data = data;
        // Only set statusCode to 200 if it hasn't been explicitly set
        if (!this._statusSet) {
          this.statusCode = 200;
        }
        return this;
      },
      status: function(code) {
        this.statusCode = code;
        this._statusSet = true;
        return this;
      }
    };

    // Execute the processor
    if (route.processorInstance && typeof route.processorInstance.process === 'function') {
      await route.processorInstance.process(mockReq, mockRes);
      return {
        success: true,
        statusCode: mockRes.statusCode,
        data: mockRes.data,
        endpoint: `${route.method} ${route.path}`,
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error(`Processor not available for ${route.method} ${route.path}`);
    }
  }

  /**
   * Execute a tool (either API endpoint or bridge tool)
   */
  async executeTool(name, args, { getLoadedRoutes, bridgeReloader, executeAPIEndpoint } = {}) {
    const routes = getLoadedRoutes ? getLoadedRoutes() : [];
    
    // First try to find API route (format: api_[path]_[http_method])
    const route = routes.find(r => 
      `api_${r.path.replace(/\//g, '_')}_${r.method.toLowerCase()}` === name
    );
    
    if (route) {
      // Handle API route
      const result = await executeAPIEndpoint(route, args, {});
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
    
    // If not found in API routes, try bridge tools
    if (bridgeReloader) {
      try {
        const bridges = bridgeReloader.ensureBridges();
        for (const [serverName, bridge] of bridges.entries()) {
          try {
            // Try different name variations to find the right tool
            const namesToTry = [
              name,                           // Original clean name
              `${serverName}_${name}`,       // With server prefix
              `${serverName}${serverName}_${name}` // With double prefix
            ];
            
            for (const toolName of namesToTry) {
              try {
                const bridgeResult = await bridge.rpcRequest('tools/call', { name: toolName, arguments: args }, 5000);
                if (bridgeResult && bridgeResult.content) {
                  return bridgeResult;
                }
              } catch (e) {
                // This name variation didn't work, try next one
                continue;
              }
            }
          } catch (e) {
            // Tool not found in this bridge, try next one
            continue;
          }
        }
      } catch (e) {
        // Bridge error, fall through to not found
      }
    }
    
    // Tool not found in either API routes or bridge tools
    throw new Error(`Tool not found: ${name}`);
  }
}

module.exports = ToolExecutor;

