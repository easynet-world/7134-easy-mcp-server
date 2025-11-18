/**
 * MCP Tool Merger
 * 
 * Builds merged tools list from local routes and bridge servers
 */

class MCPToolMerger {
  constructor({
    getLoadedRoutes,
    schemaNormalizer,
    bridgeReloader
  }) {
    this.getLoadedRoutes = getLoadedRoutes;
    this.schemaNormalizer = schemaNormalizer;
    this.bridgeReloader = bridgeReloader;
  }

  /**
   * Build the merged tools list from local routes and bridge servers.
   */
  async buildMergedToolsList() {
    const routes = this.getLoadedRoutes();
    const tools = routes.map(route => {
      const processor = route.processorInstance;
      const openApi = processor?.openApi;

      // Build standard flat MCP tool inputSchema format
      const inputSchema = {
        type: 'object',
        properties: {},
        required: []
      };

      // Add query, header, and path parameters directly to properties
      if (Array.isArray(openApi?.parameters) && openApi.parameters.length > 0) {
        for (const p of openApi.parameters) {
          if (!p || !p.name || !p.in) continue;
          const propValue = this.schemaNormalizer.safeExtractParameterSchema(p);
          inputSchema.properties[p.name] = propValue;
          if (p.required) {
            inputSchema.required.push(p.name);
          }
        }
      }

      // Handle request body: flatten nested object properties to top level
      if (openApi?.requestBody?.content?.['application/json']?.schema) {
        const bodySchema = openApi.requestBody.content['application/json'].schema;
        this.schemaNormalizer.flattenBodyProperties(bodySchema, inputSchema, (s) => 
          this.schemaNormalizer.normalizeNestedSchema(s)
        );
        if (openApi.requestBody.required && bodySchema.type !== 'object') {
          inputSchema.required.push('body');
        }
      }

      // Handle path parameters from route pattern
      if (!openApi?.parameters || !openApi.parameters.some(p => p.in === 'path')) {
        const matches = route.path.match(/:([A-Za-z0-9_]+)/g) || [];
        for (const m of matches) {
          const name = m.slice(1);
          if (!inputSchema.properties[name]) {
            inputSchema.properties[name] = { type: 'string', description: `${name} parameter` };
            inputSchema.required.push(name);
          }
        }
      }

      const normalizedInputSchema = this.schemaNormalizer.normalizeNestedSchema(inputSchema);

      return {
        name: `${route.method.toLowerCase()}_${route.path.replace(/\//g, '_').replace(/^_/, '')}`,
        description: processor?.mcpDescription || openApi?.description || processor?.description || `Execute ${route.method} request to ${route.path}`,
        inputSchema: normalizedInputSchema,
        responseSchema: openApi?.responses?.['200']?.content?.['application/json']?.schema || null,
        method: route.method,
        path: route.path,
        tags: openApi?.tags || ['api']
      };
    });

    // Track tool names to prevent duplicates
    const toolNames = new Set(tools.map(t => t.name));
    
    // Merge bridge tools
    if (this.bridgeReloader) {
      try {
        const bridges = this.bridgeReloader.ensureBridges();
        for (const [serverName, bridge] of bridges.entries()) {
          try {
            const bridgeResult = await bridge.rpcRequest('tools/list', {}, 10000); // 10 second timeout
            if (bridgeResult && Array.isArray(bridgeResult.tools)) {
              bridgeResult.tools.forEach(t => {
                // Skip null/undefined tools
                if (!t || typeof t !== 'object') {
                  console.warn(`⚠️  Skipping invalid bridge tool from ${serverName}`);
                  return;
                }
                
                // Strip server-specific prefixes to avoid naming conflicts
                let cleanName = t.name;
                if (!cleanName) {
                  console.warn(`⚠️  Skipping bridge tool without name from ${serverName}`);
                  return;
                }
                
                // Strip server-specific prefixes (e.g., chrome_new_page -> new_page)
                const prefixes = [`${serverName}_`, 'mcp_'];
                for (const prefix of prefixes) {
                  if (cleanName.startsWith(prefix)) {
                    cleanName = cleanName.substring(prefix.length);
                    break;
                  }
                }
                
                // Skip duplicate tools (same name already exists)
                if (toolNames.has(cleanName)) {
                  console.warn(`⚠️  Skipping duplicate tool '${cleanName}' from bridge '${serverName}' (already exists)`);
                  return;
                }
                
                // Mark this tool name as used
                toolNames.add(cleanName);
                
                // Safely process inputSchema - handle various formats
                let inputSchema = { type: 'object', properties: {} };
                if (t.inputSchema) {
                  if (typeof t.inputSchema === 'object') {
                    // Ensure inputSchema has required structure
                    inputSchema = {
                      type: t.inputSchema.type || 'object',
                      properties: t.inputSchema.properties || {},
                      ...(t.inputSchema.required && { required: t.inputSchema.required }),
                      ...(t.inputSchema.additionalProperties !== undefined && { additionalProperties: t.inputSchema.additionalProperties })
                    };
                  }
                }
                
                tools.push({
                  name: cleanName, // Cleaned name (server-specific prefixes stripped)
                  description: `[${serverName}] ${t.description || 'Bridge tool'}`,
                  inputSchema: inputSchema,
                  responseSchema: null,
                  tags: ['bridge', serverName],
                  // Store original name for mapping back when calling the tool
                  _bridgeToolName: t.name,
                  _bridgeServerName: serverName
                });
              });
            }
          } catch (e) {
            // Log bridge errors but don't fail the whole list
            console.warn(`⚠️  Bridge tools unavailable: ${e.message}`);
          }
        }
      } catch (_) {
        // ignore overall bridge errors
      }
    }
    return tools;
  }
}

module.exports = MCPToolMerger;

