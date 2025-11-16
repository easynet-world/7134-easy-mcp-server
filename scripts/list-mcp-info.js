#!/usr/bin/env node
/**
 * MCP Info Lister Script
 * Lists all MCP tools, resources, prompts and their details
 * 
 * Usage:
 *   node scripts/list-mcp-info.js [options]
 * 
 * Options:
 *   --host <host>        MCP server host (default: localhost)
 *   --port <port>        MCP server port (default: 8888)
 *   --transport <type>  Transport type: http, ws, or auto (default: auto)
 *   --format <format>   Output format: json, table, or detailed (default: detailed)
 *   --output <file>     Save output to file (optional)
 */

const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  host: 'localhost',
  port: parseInt(process.env.EASY_MCP_SERVER_MCP_PORT) || 8888,
  transport: 'auto',
  format: 'detailed',
  output: null
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--host' && args[i + 1]) {
    options.host = args[i + 1];
    i++;
  } else if (args[i] === '--port' && args[i + 1]) {
    options.port = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--transport' && args[i + 1]) {
    options.transport = args[i + 1];
    i++;
  } else if (args[i] === '--format' && args[i + 1]) {
    options.format = args[i + 1];
    i++;
  } else if (args[i] === '--output' && args[i + 1]) {
    options.output = args[i + 1];
    i++;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(require('fs').readFileSync(__filename, 'utf8').match(/\/\*\*[\s\S]*?\*\//)[0]);
    process.exit(0);
  }
}

/**
 * Send HTTP MCP request (JSON-RPC)
 */
function sendHTTPRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const requestId = Date.now();
    const data = JSON.stringify({
      jsonrpc: '2.0',
      id: requestId,
      method,
      params
    });

    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error('Request timeout after 10 seconds'));
    }, 10000);

    const req = http.request({
      hostname: options.host,
      port: options.port,
      path: '/mcp',
      method: 'POST',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk.toString();
      });
      res.on('end', () => {
        clearTimeout(timeout);
        try {
          const result = JSON.parse(body);
          // Handle JSON-RPC response
          if (result.id !== requestId) {
            reject(new Error(`Response ID mismatch. Expected ${requestId}, got ${result.id}`));
            return;
          }
          if (result.error) {
            reject(new Error(result.error.message || `MCP error: ${result.error.code || 'unknown'}`));
          } else {
            resolve(result.result || result);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => {
      clearTimeout(timeout);
      if (e.code === 'ECONNREFUSED') {
        reject(new Error(`Cannot connect to MCP server at ${options.host}:${options.port}. Is the server running?`));
      } else if (e.code === 'ETIMEDOUT' || e.code === 'ECONNRESET') {
        reject(new Error(`Connection timeout. Is the MCP server running at ${options.host}:${options.port}?`));
      } else {
        reject(e);
      }
    });

    req.on('timeout', () => {
      req.destroy();
      clearTimeout(timeout);
      reject(new Error('Request timeout'));
    });

    req.write(data);
    req.end();
  });
}

/**
 * Send WebSocket MCP request
 */
function sendWSRequest(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const requestId = Date.now();
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params
    };

    const timeout = setTimeout(() => {
      ws.removeListener('message', messageHandler);
      reject(new Error(`Timeout waiting for response to ${method} after 10 seconds`));
    }, 10000);

    const messageHandler = (data) => {
      try {
        const response = JSON.parse(data.toString());
        if (response.id === requestId) {
          clearTimeout(timeout);
          ws.removeListener('message', messageHandler);
          if (response.error) {
            reject(new Error(response.error.message || 'MCP request failed'));
          } else {
            resolve(response.result || response);
          }
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };

    ws.on('message', messageHandler);
    ws.send(JSON.stringify(request));
  });
}

/**
 * Connect via WebSocket and get all info
 */
async function getInfoViaWebSocket() {
  return new Promise((resolve, reject) => {
    const connectionTimeout = setTimeout(() => {
      ws.close();
      reject(new Error(`WebSocket connection timeout. Is the MCP server running at ${options.host}:${options.port}?`));
    }, 5000);

    const ws = new WebSocket(`ws://${options.host}:${options.port}`);

    ws.on('open', async () => {
      clearTimeout(connectionTimeout);
      try {
        // Initialize connection
        await sendWSRequest(ws, 'initialize', {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'mcp-info-lister',
            version: '1.0.0'
          }
        });

        // Get all info
        const [tools, prompts, resources] = await Promise.all([
          sendWSRequest(ws, 'tools/list', {}).catch(e => ({ tools: [], error: e.message })),
          sendWSRequest(ws, 'prompts/list', {}).catch(e => ({ prompts: [], error: e.message })),
          sendWSRequest(ws, 'resources/list', {}).catch(e => ({ resources: [], error: e.message }))
        ]);

        ws.close();
        resolve({
          tools: tools.tools || tools,
          prompts: prompts.prompts || prompts,
          resources: resources.resources || resources
        });
      } catch (e) {
        ws.close();
        reject(e);
      }
    });

    ws.on('error', (e) => {
      clearTimeout(connectionTimeout);
      if (e.code === 'ECONNREFUSED') {
        reject(new Error(`Cannot connect to MCP server at ${options.host}:${options.port}. Is the server running?`));
      } else {
        reject(e);
      }
    });
  });
}

/**
 * Get all info via HTTP MCP (JSON-RPC)
 */
async function getInfoViaHTTP() {
  // First initialize the MCP connection
  try {
    await sendHTTPRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'mcp-info-lister',
        version: '1.0.0'
      }
    });
  } catch (e) {
    // Ignore initialization errors, server may not require it for HTTP transport
    console.log('Note: Initialization skipped (may not be required for HTTP MCP)');
  }
  
  // Get all info via JSON-RPC
  const [toolsResult, promptsResult, resourcesResult] = await Promise.all([
    sendHTTPRequest('tools/list', {}).catch(e => {
      console.warn(`Warning: Failed to get tools: ${e.message}`);
      return { tools: [] };
    }),
    sendHTTPRequest('prompts/list', {}).catch(e => {
      console.warn(`Warning: Failed to get prompts: ${e.message}`);
      return { prompts: [] };
    }),
    sendHTTPRequest('resources/list', {}).catch(e => {
      console.warn(`Warning: Failed to get resources: ${e.message}`);
      return { resources: [] };
    })
  ]);

  return {
    tools: toolsResult.tools || toolsResult || [],
    prompts: promptsResult.prompts || promptsResult || [],
    resources: resourcesResult.resources || resourcesResult || []
  };
}

/**
 * Format output as table
 */
function formatAsTable(info) {
  let output = '\n' + '='.repeat(80) + '\n';
  output += 'MCP SERVER INFORMATION\n';
  output += '='.repeat(80) + '\n\n';

  // Separate API tools from bridge tools
  const apiTools = info.tools.filter(t => t.name && t.name.startsWith('api_'));
  const bridgeTools = info.tools.filter(t => !t.name || !t.name.startsWith('api_'));

  // API Tools
  output += `\n📋 API TOOLS (${apiTools.length})\n`;
  output += '-'.repeat(80) + '\n';
  if (apiTools.length > 0) {
    apiTools.forEach((tool, idx) => {
      output += `\n${idx + 1}. ${tool.name}\n`;
      if (tool.summary && tool.summary !== tool.description) {
        output += `   Summary: ${tool.summary}\n`;
      }
      output += `   Description: ${tool.description || tool.summary || 'N/A'}\n`;
      if (tool.inputSchema) {
        const props = Object.keys(tool.inputSchema.properties || {});
        output += `   Parameters: ${props.length > 0 ? props.join(', ') : 'None'}\n`;
      }
    });
  } else {
    output += '   No API tools available\n';
  }

  // Bridge Tools
  if (bridgeTools.length > 0) {
    output += `\n🔌 BRIDGE TOOLS (${bridgeTools.length})\n`;
    output += '-'.repeat(80) + '\n';
    bridgeTools.forEach((tool, idx) => {
      output += `\n${idx + 1}. ${tool.name}\n`;
      output += `   Description: ${tool.description || 'N/A'}\n`;
      if (tool.inputSchema) {
        const props = Object.keys(tool.inputSchema.properties || {});
        output += `   Parameters: ${props.length > 0 ? props.join(', ') : 'None'}\n`;
      }
    });
  }

  // Prompts
  output += `\n📝 PROMPTS (${info.prompts.length})\n`;
  output += '-'.repeat(80) + '\n';
  if (info.prompts.length > 0) {
    info.prompts.forEach((prompt, idx) => {
      output += `\n${idx + 1}. ${prompt.name}\n`;
      output += `   Description: ${prompt.description || 'N/A'}\n`;
      if (prompt.arguments) {
        const args = Object.keys(prompt.arguments.properties || {});
        output += `   Arguments: ${args.length > 0 ? args.join(', ') : 'None'}\n`;
      }
    });
  } else {
    output += '   No prompts available\n';
  }

  // Resources
  output += `\n📦 RESOURCES (${info.resources.length})\n`;
  output += '-'.repeat(80) + '\n';
  if (info.resources.length > 0) {
    info.resources.forEach((resource, idx) => {
      output += `\n${idx + 1}. ${resource.uri}\n`;
      output += `   Name: ${resource.name || 'N/A'}\n`;
      output += `   Description: ${resource.description || 'N/A'}\n`;
      output += `   MIME Type: ${resource.mimeType || 'N/A'}\n`;
    });
  } else {
    output += '   No resources available\n';
  }

  output += '\n' + '='.repeat(80) + '\n';
  return output;
}

/**
 * Format output as detailed text
 */
function formatAsDetailed(info) {
  let output = '\n' + '═'.repeat(80) + '\n';
  output += '   MCP SERVER INFORMATION - DETAILED\n';
  output += '═'.repeat(80) + '\n\n';

  // Separate API tools from bridge tools
  const apiTools = info.tools.filter(t => t.name && t.name.startsWith('api_'));
  const bridgeTools = info.tools.filter(t => !t.name || !t.name.startsWith('api_'));

  // API Tools
  output += `\n${'═'.repeat(80)}\n`;
  output += `📋 API TOOLS (${apiTools.length})\n`;
  output += `${'═'.repeat(80)}\n\n`;
  
  if (apiTools.length > 0) {
    apiTools.forEach((tool, idx) => {
      output += `${idx + 1}. ${tool.name}\n`;
      output += `${'─'.repeat(78)}\n`;
      if (tool.summary && tool.summary !== tool.description) {
        output += `   Summary: ${tool.summary}\n`;
      }
      output += `   Description: ${tool.description || tool.summary || 'N/A'}\n`;
      
      if (tool.inputSchema) {
        output += '   Input Schema:\n';
        const schema = tool.inputSchema;
        if (schema.properties) {
          Object.keys(schema.properties).forEach(prop => {
            const propSchema = schema.properties[prop];
            output += `     - ${prop} (${propSchema.type || 'any'})`;
            if (propSchema.description) output += `: ${propSchema.description}`;
            if (schema.required && schema.required.includes(prop)) {
              output += ' [required]';
            }
            output += '\n';
          });
        }
      }
      
      if (tool.responseSchema) {
        output += `   Response Schema: ${JSON.stringify(tool.responseSchema, null, 2).split('\n').join('\n     ')}\n`;
      }
      
      output += '\n';
    });
  } else {
    output += '   ⚠️  No API tools available. Make sure your API routes are loaded.\n\n';
  }

  // Bridge Tools
  if (bridgeTools.length > 0) {
    output += `\n${'═'.repeat(80)}\n`;
    output += `🔌 BRIDGE TOOLS (${bridgeTools.length})\n`;
    output += `${'═'.repeat(80)}\n\n`;
    
    bridgeTools.forEach((tool, idx) => {
      output += `${idx + 1}. ${tool.name}\n`;
      output += `${'─'.repeat(78)}\n`;
      if (tool.summary && tool.summary !== tool.description) {
        output += `   Summary: ${tool.summary}\n`;
      }
      output += `   Description: ${tool.description || tool.summary || 'N/A'}\n`;
      
      if (tool.inputSchema) {
        output += '   Input Schema:\n';
        const schema = tool.inputSchema;
        if (schema.properties) {
          Object.keys(schema.properties).forEach(prop => {
            const propSchema = schema.properties[prop];
            output += `     - ${prop} (${propSchema.type || 'any'})`;
            if (propSchema.description) output += `: ${propSchema.description}`;
            if (schema.required && schema.required.includes(prop)) {
              output += ' [required]';
            }
            output += '\n';
          });
        }
      }
      
      // Show responseSchema if available (optional per MCP spec)
      if (tool.responseSchema) {
        output += `   Response Schema: ${JSON.stringify(tool.responseSchema, null, 2).split('\n').join('\n     ')}\n`;
      } else {
        // Note that responseSchema is optional per MCP specification
        output += '   Response Schema: Not specified (optional per MCP spec)\n';
      }
      
      output += '\n';
    });
  }

  // Prompts
  output += `${'═'.repeat(80)}\n`;
  output += `📝 PROMPTS (${info.prompts.length})\n`;
  output += `${'═'.repeat(80)}\n\n`;
  
  if (info.prompts.length > 0) {
    info.prompts.forEach((prompt, idx) => {
      output += `${idx + 1}. ${prompt.name}\n`;
      output += `${'─'.repeat(78)}\n`;
      output += `   Description: ${prompt.description || 'N/A'}\n`;
      
      if (prompt.arguments) {
        output += '   Arguments:\n';
        if (prompt.arguments.properties) {
          Object.keys(prompt.arguments.properties).forEach(arg => {
            const argSchema = prompt.arguments.properties[arg];
            output += `     - ${arg} (${argSchema.type || 'any'})`;
            if (argSchema.description) output += `: ${argSchema.description}`;
            if (prompt.arguments.required && prompt.arguments.required.includes(arg)) {
              output += ' [required]';
            }
            output += '\n';
          });
        }
      }
      
      output += '\n';
    });
  } else {
    output += '   No prompts available\n\n';
  }

  // Resources
  output += `${'═'.repeat(80)}\n`;
  output += `📦 RESOURCES (${info.resources.length})\n`;
  output += `${'═'.repeat(80)}\n\n`;
  
  if (info.resources.length > 0) {
    info.resources.forEach((resource, idx) => {
      output += `${idx + 1}. ${resource.uri}\n`;
      output += `${'─'.repeat(78)}\n`;
      output += `   Name: ${resource.name || 'N/A'}\n`;
      output += `   Description: ${resource.description || 'N/A'}\n`;
      output += `   MIME Type: ${resource.mimeType || 'N/A'}\n`;
      
      if (resource.text) {
        const preview = resource.text.substring(0, 200);
        output += `   Preview: ${preview}${resource.text.length > 200 ? '...' : ''}\n`;
      }
      
      output += '\n';
    });
  } else {
    output += '   No resources available\n\n';
  }

  output += '═'.repeat(80) + '\n';
  return output;
}

/**
 * Check if MCP server is running
 */
function checkServerConnection() {
  return new Promise((resolve) => {
    // Try to send a ping request to MCP server
    const requestId = Date.now();
    const data = JSON.stringify({
      jsonrpc: '2.0',
      id: requestId,
      method: 'ping',
      params: {}
    });

    const req = http.request({
      hostname: options.host,
      port: options.port,
      path: '/mcp',
      method: 'POST',
      timeout: 3000,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk.toString();
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          // Check if we got a valid JSON-RPC response
          if (result.jsonrpc === '2.0' && (result.id === requestId || result.result || result.error)) {
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (e) {
          resolve(false);
        }
      });
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.write(data);
    req.end();
  });
}

/**
 * Main function
 */
async function main() {
  console.log(`Connecting to MCP server at ${options.host}:${options.port}...`);

  // Quick check if MCP server is reachable
  const isServerRunning = await checkServerConnection();
  if (!isServerRunning) {
    console.error(`\n❌ Cannot connect to MCP server at ${options.host}:${options.port}`);
    console.error('\n💡 Make sure the MCP server is running:');
    console.error('   - Start the server: npm start');
    console.error('   - Or: node src/orchestrator.js');
    console.error('   - Check MCP port in .env (EASY_MCP_SERVER_MCP_PORT, default: 8888)');
    console.error('   - Or specify port: npm run mcp:list -- --port 8888\n');
    process.exit(1);
  }
  
  console.log(`✓ Connected to MCP server at ${options.host}:${options.port}`);

  let info;
  try {
    if (options.transport === 'http' || (options.transport === 'auto')) {
      try {
        console.log('Trying HTTP transport...');
        info = await getInfoViaHTTP();
      } catch (e) {
        if (options.transport === 'auto') {
          console.log('HTTP failed, trying WebSocket...');
          info = await getInfoViaWebSocket();
        } else {
          throw e;
        }
      }
    } else {
      console.log('Using WebSocket transport...');
      info = await getInfoViaWebSocket();
    }

    let output;
    if (options.format === 'json') {
      output = JSON.stringify(info, null, 2);
    } else if (options.format === 'table') {
      output = formatAsTable(info);
    } else {
      output = formatAsDetailed(info);
    }

    if (options.output) {
      fs.writeFileSync(options.output, output);
      console.log(`\n✅ Information saved to ${options.output}\n`);
    } else {
      console.log(output);
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Tools: ${info.tools.length}`);
    console.log(`   Prompts: ${info.prompts.length}`);
    console.log(`   Resources: ${info.resources.length}\n`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    console.error('Make sure the MCP server is running and accessible.');
    console.error(`Try: node scripts/list-mcp-info.js --host ${options.host} --port ${options.port}\n`);
    process.exit(1);
  }
}

// Run main function
if (require.main === module) {
  main();
}

module.exports = { getInfoViaHTTP, getInfoViaWebSocket };

