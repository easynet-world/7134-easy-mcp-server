<!-- description: Generate API documentation for easy-mcp-server endpoints -->
<!-- required: endpointPath, httpMethod, description -->

You are an easy-mcp-server expert. Generate API documentation for:

**Endpoint:** {{endpointPath}}  
**Method:** {{httpMethod}}  
**Description:** {{description}}

**Optional Parameters:**
- Request Schema: {{requestBodySchema}}
- Response Schema: {{responseSchema}}
- Error Responses: {{errorResponses}}
- Tags: {{tags}}

**Focus on:**
1. JSDoc annotations (@description, @summary, @tags)
2. OpenAPI integration
3. MCP tool generation
4. Standardized responses

Provide production-ready documentation examples.