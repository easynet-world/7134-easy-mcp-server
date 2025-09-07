# easy-mcp-server Health Monitoring Guide

> **Comprehensive health monitoring for easy-mcp-server applications**

## 🎯 **Overview**

This guide covers monitoring easy-mcp-server applications using built-in health monitoring capabilities, including automatic health endpoints, service status monitoring, and enhanced component health checks.

## 🏥 **Built-in Health Monitoring**

### Automatic Health Endpoint
The framework provides an automatic `/health` endpoint:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.67"
}
```

### Service Status Monitoring (BaseAPIEnhanced)
```javascript
const status = await api.getServiceStatus();
// Returns: { serviceName, isInitialized, components: { logger, llm, resourceLoader } }
```

### Metrics Collection
```javascript
const metrics = await api.getMetrics();
// Returns: { serviceName, uptime, memory, timestamp, components: {...} }
```

### Component Health Checks
| Component | Status | Description |
|-----------|--------|-------------|
| **Logger** | Always available | Structured logging with context |
| **LLM Service** | Provider status | Response times, error rates |
| **Resource Loader** | MCP resource availability | Prompt loading status |

## 🛠 **Implementation Examples**

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

## ✅ **Best Practices**

| Practice | Description | Benefit |
|----------|-------------|---------|
| **Set Appropriate Thresholds** | Define clear alerting thresholds with severity levels | Prevent false alarms |
| **Monitor Dependencies** | Track external API calls and database connections | Early failure detection |
| **Implement Circuit Breakers** | Prevent cascade failures with graceful degradation | System resilience |
| **Log Aggregation** | Centralized logging with structured formats | Better debugging |

## 🚨 **Alerting Strategies**

| Alert Type | Triggers | Response |
|------------|----------|----------|
| **Immediate** | Service down, High error rates (>5%), Critical resource exhaustion | Automated recovery attempts |
| **Warning** | Response time degradation, Memory usage trends, Disk space warnings | On-call engineer notification |
| **Escalation** | Level 1 fails, Critical system failure | Management escalation |

## 📋 **Implementation Checklist**

| Task | Status | Priority |
|------|--------|----------|
| Set up monitoring infrastructure | ⬜ | High |
| Configure health check endpoints | ⬜ | High |
| Implement metrics collection | ⬜ | High |
| Create monitoring dashboards | ⬜ | Medium |
| Set up alerting rules | ⬜ | Medium |
| Test alerting procedures | ⬜ | Medium |
| Document runbooks | ⬜ | Low |
| Train operations team | ⬜ | Low |

## ⚠️ **Common Pitfalls**

| Pitfall | Impact | Solution |
|---------|--------|----------|
| **Alert Fatigue** | Too many non-critical alerts | Set appropriate thresholds |
| **Insufficient Context** | Alerts without enough information | Include relevant context |
| **Missing Dependencies** | Not monitoring external services | Monitor all dependencies |
| **Poor Thresholds** | Inappropriate alerting thresholds | Test and adjust thresholds |
| **No Runbooks** | Missing incident response procedures | Create detailed runbooks |

---

## 📚 **Related Documentation**

| Document | Purpose | Best For |
|----------|---------|----------|
| **[README](README.md)** | Quick start and overview | Getting started |
| **[Framework Guide](easy-mcp-server.md)** | Complete framework documentation | Deep dive, production setup |
| **[Agent Context](Agent.md)** | AI agent integration guide | Building AI-powered applications |

### 📋 **Quick Reference**
- **Getting Started**: [README Quick Start](README.md#-quick-start) → [Framework Guide](easy-mcp-server.md)
- **Framework Details**: [Framework Guide](easy-mcp-server.md) → [Health Monitoring](#-built-in-health-monitoring)
- **AI Integration**: [Agent Context](Agent.md) → [Agent Monitoring](#-agent-monitoring)
- **Production**: [Production Deployment](easy-mcp-server.md#-production-deployment) → [Implementation Examples](#-implementation-examples)
