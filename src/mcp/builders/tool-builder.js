/**
 * Tool Builder
 * 
 * Builds MCP tool definitions from API routes.
 * Transforms OpenAPI schemas into flat MCP tool input schemas,
 * handling parameter flattening and schema normalization.
 * 
 * Features:
 * - Converts API routes to MCP tool definitions
 * - Flattens nested request body schemas to top-level properties
 * - Merges query, header, and path parameters
 * - Schema normalization via SchemaNormalizer
 * - Bridge tool merging support
 * - Tool naming convention (method_path_method)
 * 
 * Tool Schema Structure:
 * - Flat input schema (all parameters at top level)
 * - Normalized types (consistent schema format)
 * - Required field tracking
 * - Description and metadata preservation
 * 
 * @class ToolBuilder
 */

const SchemaNormalizer = require('../utils/schema-normalizer');

class ToolBuilder {
  constructor(schemaNormalizer) {
    this.schemaNormalizer = schemaNormalizer || new SchemaNormalizer();
  }

  /**
   * Build tool definition from a route
   */
  buildToolFromRoute(route, { warn, getLoadedRoutes, bridgeReloader } = {}) {
    const processor = route.processorInstance;
    const openApi = processor?.openApi;

    // Build standard flat MCP tool inputSchema format
    // All parameters go directly into properties (no nested body/query/headers/path structure)
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
        // CRITICAL: Normalize parameter schemas to ensure nested structures are valid
        // Add parameters directly to properties (query, header, path params all at top level)
        inputSchema.properties[p.name] = this.schemaNormalizer.normalizeNestedSchema(propValue);
        if (p.required) {
          inputSchema.required.push(p.name);
        }
      }
    }

    // Handle request body: flatten nested object properties to top level
    // This prevents n8n from having issues with nested object structures
    if (openApi?.requestBody?.content?.['application/json']?.schema) {
      const bodySchema = openApi.requestBody.content['application/json'].schema;
      this.schemaNormalizer.flattenBodyProperties(
        bodySchema,
        inputSchema,
        (schema) => this.schemaNormalizer.normalizeNestedSchema(schema)
      );
      if (openApi.requestBody.required && bodySchema.type !== 'object') {
        inputSchema.required.push('body');
      }
    }

    // Handle path parameters from route pattern (if not already in OpenAPI)
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

    // Get summary (brief) and description (detailed) following MCP best practices
    // Summary: brief overview for quick scanning
    // Description: detailed explanation for full understanding
    const summary = openApi?.summary || processor?.summary || `Execute ${route.method} ${route.path}`;
    
    // Create enhanced description (detailed)
    let enhancedDescription = processor?.mcpDescription || openApi?.description || processor?.description;
    
    // If description is missing, use summary as fallback or create default
    if (!enhancedDescription) {
      enhancedDescription = summary !== `Execute ${route.method} ${route.path}` 
        ? `${summary}. ${`Execute ${route.method} request to ${route.path}`}`
        : `Execute ${route.method} request to ${route.path}`;
    }
    
    // Add response type info if available
    if (openApi?.responses?.['200']?.content?.['application/json']?.schema) {
      const responseSchema = openApi.responses['200'].content['application/json'].schema;
      enhancedDescription += `\n\n**Response**: ${responseSchema.type || 'object'}`;
    }

    // Normalize the schema to ensure all structures are valid
    // CRITICAL: For flattened schemas, we need to ensure arrays preserve their items field
    // Instead of full normalization which might strip items, do a careful pass
    const normalizedInputSchema = {
      type: inputSchema.type || 'object',
      properties: {},
      ...(inputSchema.required && { required: inputSchema.required })
    };
    
    // Carefully normalize each property, ensuring arrays keep their items
    for (const [key, value] of Object.entries(inputSchema.properties)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // CRITICAL: Check if this is an array type - n8n requires items field for arrays
        const isArrayType = value.type === 'array' || (value.items && !value.properties);
        if (isArrayType) {
          // CRITICAL: For arrays, ALWAYS ensure items field exists - n8n requires this!
          // n8n accesses items.inputType, so items MUST exist and have a type field
          let itemsValue;
          if (value.items && value.items !== null && value.items !== undefined) {
            // Items exists - normalize it
            itemsValue = typeof value.items === 'object' && !Array.isArray(value.items)
              ? this.schemaNormalizer.normalizeNestedSchema(value.items)
              : value.items;
            // Ensure items has type
            if (itemsValue && typeof itemsValue === 'object' && !itemsValue.type) {
              itemsValue.type = 'string';
            }
          } else {
            // Items is missing - add default (REQUIRED for n8n)
            itemsValue = { type: 'string' };
          }
          // Create array schema with items ALWAYS present
          // CRITICAL: items field is REQUIRED for n8n - it accesses items.inputType
          const finalArraySchema = {
            type: 'array'
          };
          // ALWAYS set items - this is critical for n8n compatibility
          if (itemsValue) {
            finalArraySchema.items = itemsValue;
          } else {
            finalArraySchema.items = { type: 'string' };
          }
          // Preserve other fields
          if (value.description) finalArraySchema.description = value.description;
          if (value.example !== undefined) finalArraySchema.example = value.example;
          
          normalizedInputSchema.properties[key] = finalArraySchema;
        } else {
          // Normalize non-array properties
          normalizedInputSchema.properties[key] = this.schemaNormalizer.normalizeNestedSchema(value);
        }
      } else {
        normalizedInputSchema.properties[key] = value;
      }
    }
    
    // Normalize response schema to ensure nested structures are valid (especially arrays with items)
    let normalizedResponseSchema = null;
    if (openApi?.responses?.['200']?.content?.['application/json']?.schema) {
      normalizedResponseSchema = this.schemaNormalizer.normalizeNestedSchema(
        openApi.responses['200'].content['application/json'].schema
      );
    }

    return {
      name: `api_${route.path.replace(/\//g, '_')}_${route.method.toLowerCase()}`,
      // MCP best practice: include both summary (brief) and description (detailed)
      summary: summary,  // Brief overview for quick scanning
      description: enhancedDescription,  // Detailed explanation
      inputSchema: normalizedInputSchema,
      // Add normalized response schema
      responseSchema: normalizedResponseSchema,
      // Add additional metadata
      method: route.method,
      path: route.path,
      tags: openApi?.tags || ['api']
    };
  }

  /**
   * Build tools list from routes
   */
  async buildToolsList(routes, { bridgeReloader, warn } = {}) {
    const tools = routes.map(route => this.buildToolFromRoute(route, { warn }));
    
    // Merge bridge tools if available
    if (bridgeReloader) {
      try {
        const bridges = bridgeReloader.ensureBridges();
        for (const [serverName, bridge] of bridges.entries()) {
          try {
            const bridgeResult = await bridge.rpcRequest('tools/list', {}, 5000); // 5 second timeout
            if (bridgeResult && Array.isArray(bridgeResult.tools)) {
              bridgeResult.tools.forEach(t => {
                // Skip null/undefined tools
                if (!t || typeof t !== 'object') {
                  if (warn) warn(`Skipping invalid bridge tool from ${serverName}`, { tool: t });
                  return;
                }
                
                // Only strip prefixes from Chrome DevTools to avoid naming conflicts
                let cleanName = t.name;
                if (!cleanName) {
                  if (warn) warn(`Skipping bridge tool without name from ${serverName}`, { tool: t });
                  return;
                }
                
                if (serverName === 'chrome') {
                  const prefixes = ['chrome_', 'mcp_'];
                  for (const prefix of prefixes) {
                    if (cleanName.startsWith(prefix)) {
                      cleanName = cleanName.substring(prefix.length);
                      break;
                    }
                  }
                }
                
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
                
                // Preserve responseSchema from bridge tool if available (MCP spec: optional field)
                // According to MCP spec, responseSchema is optional but useful when available
                let responseSchema = null;
                if (t.responseSchema || t.outputSchema) {
                  // Use responseSchema if available, fallback to outputSchema for compatibility
                  responseSchema = t.responseSchema || t.outputSchema;
                  // Normalize the schema if it's an object
                  if (typeof responseSchema === 'object' && responseSchema !== null) {
                    responseSchema = this.schemaNormalizer.normalizeNestedSchema(responseSchema);
                  }
                }
                
                tools.push({
                  name: cleanName, // Cleaned name (only for Chrome tools)
                  description: `[${serverName}] ${t.description || 'Bridge tool'}`,
                  inputSchema: inputSchema,
                  responseSchema: responseSchema, // Preserve if bridge provides it, otherwise null (optional per MCP spec)
                  tags: ['bridge', serverName],
                  // Store original name for mapping back when calling the tool
                  _bridgeToolName: t.name,
                  _bridgeServerName: serverName
                });
              });
            }
          } catch (e) {
            // Log bridge errors but don't fail the whole list
            if (warn) warn(`Bridge tools unavailable for ${serverName}`, { error: e.message, serverName });
          }
        }
      } catch (e) {
        // Ignore overall bridge errors
      }
    }

    return tools;
  }
}

module.exports = ToolBuilder;

