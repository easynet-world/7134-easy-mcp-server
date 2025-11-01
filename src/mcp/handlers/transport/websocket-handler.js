/**
 * WebSocket Handler
 * 
 * Handles WebSocket connections and messages for MCP server.
 * Converts WebSocket message format to JSON-RPC 2.0 format and delegates
 * processing to MCPRequestProcessor for consistent behavior across transports.
 * 
 * Features:
 * - WebSocket connection management
 * - Message format conversion (WebSocket ↔ JSON-RPC 2.0)
 * - Delegates to MCPRequestProcessor (no duplicate business logic)
 * - Response format conversion back to WebSocket format
 * - Consistent behavior with HTTP handler
 * 
 * Message Flow:
 * 1. Receive WebSocket message
 * 2. Convert to JSON-RPC 2.0 format
 * 3. Delegate to MCPRequestProcessor.processMCPRequest()
 * 4. Convert response back to WebSocket format
 * 5. Send response to client
 * 
 * @class WebSocketHandler
 */

class WebSocketHandler {
  constructor(server, { processMCPRequest }) {
    this.server = server;
    this.processMCPRequest = processMCPRequest;
  }

  /**
   * Handle WebSocket messages
   * Converts WebSocket message format to JSON-RPC format and delegates to processor
   */
  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      
      // Convert WebSocket message format to JSON-RPC format
      const jsonRpcRequest = this.convertWebSocketToJsonRpc(data);
      
      if (!jsonRpcRequest) {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: data.id || null,
          error: {
            code: -32601,
            message: `Unknown message type: ${data.type}`
          }
        }));
        return;
      }
      
      // Process the request using the same processor as HTTP handler
      this.processMCPRequest(jsonRpcRequest)
        .then(response => {
          // Convert JSON-RPC response back to WebSocket format
          const wsResponse = this.convertJsonRpcToWebSocket(response, data.type);
          ws.send(JSON.stringify(wsResponse));
        })
        .catch(error => {
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id: jsonRpcRequest.id || null,
            error: {
              code: -32603,
              message: error.message || 'Internal error'
            }
          }));
        });
    } catch (error) {
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: `Parse error: ${error.message}`
        }
      }));
    }
  }

  /**
   * Convert WebSocket message format to JSON-RPC format
   */
  convertWebSocketToJsonRpc(data) {
    const id = data.id || null;
    
    switch (data.type) {
      case 'list_tools':
        return { jsonrpc: '2.0', id, method: 'tools/list' };
      case 'call_tool':
        return { 
          jsonrpc: '2.0', 
          id, 
          method: 'tools/call', 
          params: { name: data.name, arguments: data.arguments || {} }
        };
      case 'list_prompts':
        return { jsonrpc: '2.0', id, method: 'prompts/list' };
      case 'get_prompt':
        return { 
          jsonrpc: '2.0', 
          id, 
          method: 'prompts/get', 
          params: { name: data.name, arguments: data.arguments || {} }
        };
      case 'list_resources':
        return { jsonrpc: '2.0', id, method: 'resources/list' };
      case 'read_resource':
        return { 
          jsonrpc: '2.0', 
          id, 
          method: 'resources/read', 
          params: { uri: data.uri, arguments: data.arguments || {} }
        };
      case 'ping':
        return { jsonrpc: '2.0', id, method: 'ping' };
      default:
        return null;
    }
  }

  /**
   * Convert JSON-RPC response back to WebSocket format
   */
  convertJsonRpcToWebSocket(response, originalType) {
    if (response.error) {
      return {
        type: 'error',
        id: response.id,
        error: response.error.message || response.error
      };
    }
    
    // Map original WebSocket message type to response type
    const typeMap = {
      'list_tools': 'list_tools_response',
      'call_tool': 'call_tool_response',
      'list_prompts': 'list_prompts_response',
      'get_prompt': 'get_prompt_response',
      'list_resources': 'list_resources_response',
      'read_resource': 'read_resource_response',
      'ping': 'pong'
    };
    
    const responseType = typeMap[originalType] || `${originalType}_response`;
    
    // Build response matching original WebSocket format
    const wsResponse = {
      type: responseType,
      id: response.id
    };
    
    // Add result data based on response type
    if (response.result) {
      if (responseType === 'list_tools_response') {
        wsResponse.tools = response.result.tools || [];
        wsResponse.totalTools = response.result.tools?.length || 0;
      } else if (responseType === 'call_tool_response') {
        wsResponse.result = response.result;
      } else if (responseType === 'list_prompts_response') {
        wsResponse.prompts = response.result.prompts || [];
        wsResponse.total = response.result.total || 0;
      } else if (responseType === 'get_prompt_response') {
        wsResponse.prompt = {
          description: response.result.description,
          messages: response.result.messages || []
        };
      } else if (responseType === 'list_resources_response') {
        wsResponse.resources = response.result.resources || [];
        wsResponse.total = response.result.total || 0;
      } else if (responseType === 'read_resource_response') {
        wsResponse.resource = {
          uri: response.result.contents?.[0]?.uri,
          mimeType: response.result.contents?.[0]?.mimeType,
          contents: response.result.contents || []
        };
      } else if (responseType === 'pong') {
        wsResponse.type = 'pong';
      } else {
        // Fallback: spread all result properties
        Object.assign(wsResponse, response.result);
      }
    }
    
    return wsResponse;
  }

}

module.exports = WebSocketHandler;

