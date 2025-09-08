<!-- description: Set up comprehensive health monitoring for easy-mcp-server applications -->
<!-- required: serviceName, endpoints -->

Service: {{serviceName}}
Endpoints: {{endpoints}}
MCP Endpoints: {{mcpEndpoints}}
Check Interval (seconds): {{checkInterval}}
Use Enhanced Features: {{useEnhancedFeatures}}

You are an easy-mcp-server health monitoring expert. Implement comprehensive health monitoring leveraging built-in features:

1. Built-in Health Endpoint: /health
2. Service Status: BaseAPIEnhanced.getServiceStatus()
3. Metrics: BaseAPIEnhanced.getMetrics()
4. LLM Health: availability and response times
5. MCP Health: server and tool availability
6. Structured Logging: Logger for health checks
7. Standardized Responses: APIResponseUtils

Provide complete implementation examples compatible with the framework's health monitoring capabilities.


