/**
 * MCP Schema Adapter
 * Translates tool parameters between n8n format and Chrome DevTools MCP format
 */

class MCPSchemaAdapter {
  constructor(bridge) {
    this.bridge = bridge;
  }

  /**
   * Adapt tool call parameters from n8n format to Chrome DevTools MCP format
   */
  adaptToolParameters(toolName, params) {
    // Chrome DevTools MCP tools and their parameter adaptations
    const adaptations = {
      // Navigation tools
      navigate_page: (p) => ({
        url: p.url || p.URL || p.address || p.link
      }),
      
      // Snapshot tools
      take_snapshot: (p) => ({}), // No params needed
      
      // Click tools
      click: (p) => ({
        uid: p.uid || p.id || p.element_id || p.elementId,
        dblClick: p.dblClick || p.doubleClick || p.double_click || false
      }),
      
      // Fill tools
      fill: (p) => ({
        uid: p.uid || p.id || p.element_id || p.elementId,
        value: p.value || p.text || p.input || ''
      }),
      
      // Evaluation tools
      evaluate_script: (p) => ({
        function: p.function || p.script || p.code || p.expression,
        args: p.args || p.arguments || []
      }),
      
      // Wait tools
      wait_for: (p) => ({
        text: p.text || p.content || p.string || ''
      }),
      
      // Page management
      list_pages: (p) => ({}),
      select_page: (p) => ({
        pageIdx: p.pageIdx || p.page_idx || p.index || p.pageIndex || 0
      }),
      new_page: (p) => ({
        url: p.url || p.URL || p.address || ''
      }),
      close_page: (p) => ({
        pageIdx: p.pageIdx || p.page_idx || p.index || p.pageIndex || 0
      }),
      
      // Screenshot tools
      take_screenshot: (p) => ({
        format: p.format || 'png',
        fullPage: p.fullPage || p.full_page || false,
        uid: p.uid || p.id || p.element_id
      }),
      
      // Network tools
      list_network_requests: (p) => ({
        pageIdx: p.pageIdx || p.page_idx || p.index || 0,
        pageSize: p.pageSize || p.page_size || p.limit,
        resourceTypes: p.resourceTypes || p.resource_types || []
      }),
      
      // Console tools
      list_console_messages: (p) => ({}),
      
      // Performance tools
      performance_start_trace: (p) => ({
        reload: p.reload || false,
        autoStop: p.autoStop || p.auto_stop || false
      }),
      performance_stop_trace: (p) => ({}),
      
      // Hover tool
      hover: (p) => ({
        uid: p.uid || p.id || p.element_id || p.elementId
      }),
      
      // Drag tool
      drag: (p) => ({
        from_uid: p.from_uid || p.fromUid || p.from || p.source,
        to_uid: p.to_uid || p.toUid || p.to || p.target
      }),
      
      // Form filling
      fill_form: (p) => ({
        elements: p.elements || p.fields || []
      }),
      
      // File upload
      upload_file: (p) => ({
        uid: p.uid || p.id || p.element_id || p.elementId,
        filePath: p.filePath || p.file_path || p.path || p.file
      }),
      
      // Dialog handling
      handle_dialog: (p) => ({
        action: p.action || 'accept',
        promptText: p.promptText || p.prompt_text || p.text
      }),
      
      // Page navigation
      navigate_page_history: (p) => ({
        navigate: p.navigate || p.direction || 'back'
      }),
      
      // Page resizing
      resize_page: (p) => ({
        width: p.width || 1920,
        height: p.height || 1080
      })
    };

    // Get the adaptation function for this tool
    const adaptFn = adaptations[toolName];
    
    if (!adaptFn) {
      // No specific adaptation, return params as-is
      console.log(`⚠️  No schema adaptation for tool: ${toolName}, using params as-is`);
      return params;
    }

    try {
      const adapted = adaptFn(params || {});
      console.log(`✅ Adapted params for ${toolName}:`, JSON.stringify(params), '→', JSON.stringify(adapted));
      return adapted;
    } catch (err) {
      console.error(`❌ Error adapting params for ${toolName}:`, err);
      return params; // Fallback to original params
    }
  }

  /**
   * Wrap the bridge's rpcRequest method to intercept and adapt tool calls
   * This is the main method used by the MCP server
   */
  async rpcRequest(method, params, timeout) {
    // If this is a tools/call request, adapt the parameters
    if (method === 'tools/call' && params && params.name) {
      const toolName = params.name;
      const originalArgs = params.arguments || {};
      
      console.log(`🔧 [SchemaAdapter] Intercepting tool call: ${toolName}`);
      console.log(`📥 [SchemaAdapter] Original arguments:`, JSON.stringify(originalArgs, null, 2));
      
      // Adapt the arguments
      const adaptedArgs = this.adaptToolParameters(toolName, originalArgs);
      
      console.log(`📤 [SchemaAdapter] Adapted arguments:`, JSON.stringify(adaptedArgs, null, 2));
      
      // Replace the arguments with adapted ones
      params = {
        ...params,
        arguments: adaptedArgs
      };
    }

    // Call the original bridge rpcRequest method
    return this.bridge.rpcRequest(method, params, timeout);
  }

  /**
   * Wrap the bridge's request method to intercept and adapt tool calls
   * (Kept for compatibility if needed)
   */
  async request(method, params, timeout) {
    return this.rpcRequest(method, params, timeout);
  }

  // Proxy all other bridge methods
  start() {
    return this.bridge.start();
  }

  async initialize() {
    return this.bridge.initialize();
  }

  on(event, handler) {
    return this.bridge.on(event, handler);
  }

  once(event, handler) {
    return this.bridge.once(event, handler);
  }

  removeListener(event, handler) {
    return this.bridge.removeListener(event, handler);
  }

  emit(event, ...args) {
    return this.bridge.emit(event, ...args);
  }

  async stop() {
    return this.bridge.stop();
  }

  // Proxy important bridge properties
  get initialized() {
    return this.bridge.initialized;
  }

  get initPromise() {
    return this.bridge.initPromise;
  }

  get proc() {
    return this.bridge.proc;
  }
}

module.exports = MCPSchemaAdapter;

