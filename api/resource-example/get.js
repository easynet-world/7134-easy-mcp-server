const BaseAPI = require('../../src/core/base-api');

/**
 * @description Demo API endpoint that showcases MCP resources feature
 * @summary Resource Example API
 * @tags resource-demo
 * @responseSchema {
 *   "type": "object",
 *   "properties": {
 *     "message": { "type": "string" },
 *     "resources": { "type": "array" },
 *     "metadata": { "type": "object" }
 *   }
 * }
 */
class ResourceExampleAPI extends BaseAPI {
  constructor() {
    super();
    
    // Define resources that this API provides
    this.resources = [
      {
        uri: 'resource://project-config',
        name: 'Project Configuration',
        description: 'Current project configuration and settings',
        mimeType: 'application/json',
        content: JSON.stringify({
          name: 'easy-mcp-server',
          version: '1.0.67',
          mcpVersion: '2024-11-05',
          features: ['tools', 'prompts', 'resources'],
          endpoints: {
            rest: 'http://localhost:3000',
            mcp: 'http://localhost:3001',
            websocket: 'ws://localhost:3001'
          },
          capabilities: {
            hotReload: true,
            autoDiscovery: true,
            openApiGeneration: true,
            mcpIntegration: true
          }
        }, null, 2)
      },
      {
        uri: 'resource://server-stats',
        name: 'Server Statistics',
        description: 'Current server performance and usage statistics',
        mimeType: 'application/json',
        content: JSON.stringify({
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          platform: process.platform,
          nodeVersion: process.version,
          pid: process.pid,
          timestamp: new Date().toISOString()
        }, null, 2)
      },
      {
        uri: 'resource://api-schema',
        name: 'API Schema Documentation',
        description: 'OpenAPI schema for all available endpoints',
        mimeType: 'application/json',
        content: JSON.stringify({
          openapi: '3.0.0',
          info: {
            title: 'Easy MCP Server API',
            version: '1.0.67',
            description: 'Dynamic API framework with MCP integration'
          },
          servers: [
            {
              url: 'http://localhost:3000',
              description: 'Local development server'
            }
          ],
          paths: {
            '/prompt-example': {
              get: {
                summary: 'Get prompt examples',
                description: 'Demonstrates MCP prompts feature',
                tags: ['prompt-demo'],
                responses: {
                  '200': {
                    description: 'Successful response'
                  }
                }
              }
            },
            '/resource-example': {
              get: {
                summary: 'Get resource examples',
                description: 'Demonstrates MCP resources feature',
                tags: ['resource-demo'],
                responses: {
                  '200': {
                    description: 'Successful response'
                  }
                }
              }
            }
          }
        }, null, 2)
      },
      {
        uri: 'resource://readme',
        name: 'Project README',
        description: 'Project documentation and usage instructions',
        mimeType: 'text/markdown',
        content: `# Easy MCP Server

A dynamic API framework with easy MCP (Model Context Protocol) integration for AI models.

## Features

- **Dynamic API Discovery**: Automatically discovers API endpoints from file structure
- **MCP Integration**: Full support for tools, prompts, and resources
- **Hot Reload**: Real-time updates during development
- **OpenAPI Generation**: Automatic API documentation
- **Multiple Transports**: WebSocket, HTTP, and Server-Sent Events

## MCP Capabilities

### Tools
- Automatic discovery of API endpoints as MCP tools
- Rich input/output schemas
- Real-time execution

### Prompts
- Template-based prompt system
- Parameter substitution
- Organized by API endpoints

### Resources
- Access to documentation and configuration
- Multiple MIME types supported
- Real-time content updates

## Quick Start

\`\`\`bash
npm install easy-mcp-server
easy-mcp-server
\`\`\`

The server will start on:
- REST API: http://localhost:3000
- MCP Server: http://localhost:3001
- WebSocket: ws://localhost:3001

## Usage with AI Models

Connect your AI model to the MCP server using:
- **URL**: http://localhost:3001
- **Transport**: HTTP/WebSocket
- **Protocol**: MCP 2024-11-05
`
      }
    ];

    // Define prompts for this resource API
    this.prompts = [
      {
        name: 'resource_query_prompt',
        description: 'Template for querying resources effectively',
        template: 'I need to access information about {{resourceType}} from the available resources. Please help me:\n\n1. Identify the most relevant resource URI\n2. Extract the key information about {{specificTopic}}\n3. Summarize the findings in a clear format\n\nAvailable resources: {{availableResources}}',
        arguments: [
          {
            name: 'resourceType',
            description: 'Type of resource to query (config, stats, docs, etc.)',
            required: true
          },
          {
            name: 'specificTopic',
            description: 'Specific topic or information to extract',
            required: true
          },
          {
            name: 'availableResources',
            description: 'List of available resource URIs',
            required: false
          }
        ]
      }
    ];
  }

  process(req, res) {
    res.json({
      message: 'Resource Example API - This endpoint demonstrates MCP resources and dynamic content',
      availableResources: this.resources.map(r => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
        size: r.content.length
      })),
      metadata: {
        timestamp: new Date().toISOString(),
        resourceCount: this.resources.length,
        totalSize: this.resources.reduce((sum, r) => sum + r.content.length, 0),
        mimeTypes: [...new Set(this.resources.map(r => r.mimeType))]
      },
      usage: {
        resources: 'Use MCP resources/list and resources/read to access these resources',
        prompts: 'Use MCP prompts/list and prompts/get to access query templates'
      }
    });
  }
}

module.exports = ResourceExampleAPI;
