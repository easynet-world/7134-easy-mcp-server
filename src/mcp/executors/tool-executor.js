/**
 * Tool Executor
 * 
 * Executes MCP tools by running API endpoints and bridge tools.
 * Handles argument mapping from flat MCP format to nested Express
 * request structure, and creates mock request/response objects.
 * 
 * Features:
 * - API endpoint execution (via Express route processors)
 * - Bridge tool execution (external MCP servers)
 * - Argument mapping (flat → nested: body, query, headers, params)
 * - Mock request/response object creation
 * - Error handling and result formatting
 * - Schema-aware parameter mapping
 * 
 * Execution Flow:
 * 1. Map flat MCP arguments to Express structure
 * 2. Create mock req/res objects
 * 3. Execute route.processorInstance.process(req, res)
 * 4. Extract and return result
 * 
 * @class ToolExecutor
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
  async executeTool(name, args, { getLoadedRoutes, bridgeReloader, executeAPIEndpoint, getToolsList } = {}) {
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
        
        // First, try to get the original tool name from the tools list metadata
        let originalToolName = null;
        let targetServerName = null;
        if (getToolsList) {
          try {
            const toolsList = await getToolsList();
            if (Array.isArray(toolsList)) {
              // Find the tool in the list that matches the requested name
              const tool = toolsList.find(t => t && t.name === name);
              if (tool && tool._bridgeToolName && tool._bridgeServerName) {
                originalToolName = tool._bridgeToolName;
                targetServerName = tool._bridgeServerName;
              }
            }
          } catch (e) {
            // If getToolsList fails, fall back to querying bridges
            console.warn('⚠️  Failed to get tools list, will query bridges directly:', e.message);
          }
        }
        
        // If we found the original tool name from metadata, use it directly
        if (originalToolName && targetServerName) {
          const bridge = bridges.get(targetServerName);
          if (bridge) {
            try {
              const bridgeResult = await bridge.rpcRequest('tools/call', { name: originalToolName, arguments: args }, 10000);
              if (bridgeResult && bridgeResult.content) {
                return bridgeResult;
              }
            } catch (e) {
              console.warn(`⚠️  Failed to call tool ${originalToolName} on ${targetServerName}:`, e.message);
              // Fall through to try other bridges
            }
          }
        }
        
        // Fallback: query bridges to find the tool
        for (const [serverName, bridge] of bridges.entries()) {
          // Skip if we already tried this server with the original name
          if (targetServerName === serverName && originalToolName) {
            continue;
          }
          
          try {
            // Query bridge's tools/list to find the correct original tool name
            // This handles cases where tool names have been cleaned (e.g., server_new_page -> new_page)
            let foundOriginalToolName = null;
            try {
              const bridgeToolsList = await bridge.rpcRequest('tools/list', {}, 10000);
              if (bridgeToolsList && Array.isArray(bridgeToolsList.tools)) {
                for (const tool of bridgeToolsList.tools) {
                  if (!tool || !tool.name) continue;
                  
                  // Check if this tool matches the requested name
                  // Strip server-specific prefixes to match (e.g., server_new_page -> new_page)
                  let cleanToolName = tool.name;
                  const prefixes = [`${serverName}_`, 'mcp_'];
                  for (const prefix of prefixes) {
                    if (cleanToolName.startsWith(prefix)) {
                      cleanToolName = cleanToolName.substring(prefix.length);
                      break;
                    }
                  }
                  
                  // If the clean name matches, use the original tool name
                  if (cleanToolName === name) {
                    foundOriginalToolName = tool.name;
                    break;
                  }
                }
              }
            } catch (e) {
              // If tools/list fails or times out, fall back to name variations
              // This is expected for slow bridges, so we continue with name variations
              if (e.message && e.message.includes('timeout')) {
                console.warn(`⚠️  tools/list timeout from ${serverName}, trying name variations for tool: ${name}`);
              } else {
                console.warn(`⚠️  Failed to query tools/list from ${serverName}, trying name variations:`, e.message);
              }
            }
            
            // Build list of names to try: original from tools/list, then variations
            const namesToTry = [];
            if (foundOriginalToolName) {
              namesToTry.push(foundOriginalToolName);
            }
            // Add fallback variations - try common patterns
            namesToTry.push(
              name,                           // Original clean name
              `${serverName}_${name}`,       // With server prefix
              `mcp_${name}`,                 // With mcp_ prefix (common for MCP tools)
              `${name}_${serverName}`        // With server suffix
            );
            
            // Try each name variation
            let lastError = null;
            for (const toolName of namesToTry) {
              try {
                const bridgeResult = await bridge.rpcRequest('tools/call', { name: toolName, arguments: args }, 10000);
                if (bridgeResult && bridgeResult.content) {
                  return bridgeResult;
                }
              } catch (e) {
                // Store the last error for better error reporting
                lastError = e;
                // This name variation didn't work, try next one
                continue;
              }
            }
            
            // If we tried all variations and none worked, log helpful error
            if (lastError) {
              console.warn(`⚠️  Tool ${name} not found in ${serverName} bridge after trying: ${namesToTry.join(', ')}`);
            }
          } catch (e) {
            // Tool not found in this bridge, try next one
            console.warn(`⚠️  Error querying ${serverName} bridge for tool ${name}:`, e.message);
            continue;
          }
        }
      } catch (e) {
        // Bridge error, fall through to not found
        console.warn(`⚠️  Bridge error while looking for tool ${name}:`, e.message);
      }
    }
    
    // Tool not found in either API routes or bridge tools
    throw new Error(`Tool not found: ${name}`);
  }
}

module.exports = ToolExecutor;

