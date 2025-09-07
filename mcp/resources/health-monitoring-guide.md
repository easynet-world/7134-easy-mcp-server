# Easy MCP Server Health Monitoring Guide

## Overview
This guide provides comprehensive information about monitoring Easy MCP Server applications using the framework's built-in health monitoring capabilities, including automatic health endpoints, service status monitoring, and enhanced component health checks.

## Easy MCP Server Built-in Health Monitoring

### Automatic Health Endpoint
The framework provides an automatic `/health` endpoint that returns:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.67"
}
```

### Service Status Monitoring (BaseAPIEnhanced)
Use `getServiceStatus()` to monitor all components:
```javascript
const status = await api.getServiceStatus();
// Returns: { serviceName, isInitialized, components: { logger, redis, llm, resourceLoader } }
```

### Metrics Collection
Use `getMetrics()` for performance data:
```javascript
const metrics = await api.getMetrics();
// Returns: { serviceName, uptime, memory, timestamp, components: {...} }
```

### Component Health Checks
- **Logger**: Always available, structured logging with context
- **Redis**: Connection status, performance metrics, cache hit rates
- **LLM Service**: Provider status, response times, error rates
- **Resource Loader**: MCP resource availability, prompt loading status

## Implementation Examples

### Basic Health Check Endpoint
```javascript
const BaseAPI = require('easy-mcp-server/base-api');

class HealthCheck extends BaseAPI {
  process(req, res) {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }
}
```

### Enhanced Health Monitoring
```javascript
const { BaseAPIEnhanced } = require('easy-mcp-server/lib/base-api-enhanced');

class EnhancedHealthCheck extends BaseAPIEnhanced {
  constructor() {
    super('health-service', {
      redis: { host: 'localhost', port: 6379 },
      llm: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY }
    });
  }

  async process(req, res) {
    const status = await this.getServiceStatus();
    const metrics = await this.getMetrics();
    
    this.responseUtils.sendSuccessResponse(res, {
      status: status.isInitialized ? 'healthy' : 'degraded',
      components: status.components,
      metrics: metrics
    });
  }
}
```

### MCP Health Monitoring
```javascript
// Monitor MCP server health
const mcpHealth = await this.resourceLoader?.getStats();
// Returns: { loadedPrompts, loadedResources, lastReload }
```

## Best Practices

1. **Set Appropriate Thresholds**
   - Define clear alerting thresholds
   - Use different severity levels (warning, critical)
   - Implement escalation procedures

2. **Monitor Dependencies**
   - Track external API calls
   - Monitor database connections
   - Check third-party service availability

3. **Implement Circuit Breakers**
   - Prevent cascade failures
   - Graceful degradation
   - Automatic recovery mechanisms

4. **Log Aggregation**
   - Centralized logging system
   - Structured log formats
   - Real-time log analysis

## Alerting Strategies

### Immediate Alerts
- Service down
- High error rates (>5%)
- Critical resource exhaustion

### Warning Alerts
- Response time degradation
- Memory usage trends
- Disk space warnings

### Escalation Procedures
1. **Level 1**: Automated recovery attempts
2. **Level 2**: On-call engineer notification
3. **Level 3**: Management escalation

## Implementation Checklist

- [ ] Set up monitoring infrastructure
- [ ] Configure health check endpoints
- [ ] Implement metrics collection
- [ ] Create monitoring dashboards
- [ ] Set up alerting rules
- [ ] Test alerting procedures
- [ ] Document runbooks
- [ ] Train operations team

## Common Pitfalls

1. **Alert Fatigue**: Too many non-critical alerts
2. **Insufficient Context**: Alerts without enough information
3. **Missing Dependencies**: Not monitoring external services
4. **Poor Thresholds**: Inappropriate alerting thresholds
5. **No Runbooks**: Missing incident response procedures
