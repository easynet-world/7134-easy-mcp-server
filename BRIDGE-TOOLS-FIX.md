# MCP Bridge Tools Fix - Using Original Tool Names

## Problem
When using easy-mcp-server to access bridge MCP servers (like chrome-devtools-mcp), the system was returning error:
```
-32602 error, Tool not found: chrome_new_page
```

The issue was that easy-mcp-server was adding a server name prefix to bridge tool names, causing a mismatch.

## Root Cause
The original implementation added the server name as a prefix to all bridge tools:
- Bridge tool from chrome-devtools-mcp: `new_page`
- Easy-mcp-server added prefix: `chrome_new_page` 
- When calling `chrome_new_page`, it stripped `chrome_` and sent `new_page` to the bridge ✅
- But chrome-devtools-mcp might have its own naming (e.g., `chrome-devtools_new_page`)

## Solution
Modified the code to use **original tool names** from bridge MCP servers without adding prefixes:

### Changes Made

#### 1. `/src/mcp/mcp-server.js` - Line 1402-1429
**Before:**
```javascript
tools.push({
  name: `${serverName}_${t.name}`, // Added prefix
  description: `[${serverName}] ${t.description || 'Bridge tool'}`,
  ...
});
```

**After:**
```javascript
tools.push({
  name: t.name, // Use original tool name from bridge MCP
  description: `[${serverName}] ${t.description || 'Bridge tool'}`,
  ...
});
```

#### 2. `/src/mcp/mcp-server.js` - Line 1469-1493  
**Before:**
```javascript
const prefix = `${serverName}_`;
if (name.startsWith(prefix)) {
  const originalToolName = name.substring(prefix.length);
  const bridgeResult = await bridge.rpcRequest('tools/call', 
    { name: originalToolName, arguments: args }, 5000);
}
```

**After:**
```javascript
// Try calling the tool directly with the original name from bridge MCP
const bridgeResult = await bridge.rpcRequest('tools/call', 
  { name: name, arguments: args }, 5000);
```

#### 3. `/src/easy-mcp-server.js` - Line 907-918
Added automatic detection of `mcp-bridge.json`:
```javascript
// Set bridge config path if mcp-bridge.json exists in the current directory
const bridgeConfigPath = path.join(originalCwd, 'mcp-bridge.json');
if (!process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH && fs.existsSync(bridgeConfigPath)) {
  process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH = bridgeConfigPath;
  console.log(`🔌 Auto-detected MCP bridge config: ${bridgeConfigPath}`);
}
```

## Usage

### 1. Set up mcp-bridge.json
Create or use existing `mcp-bridge.json` in your project:
```json
{
  "mcpServers": {
    "chrome": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp"],
      "description": "Chrome DevTools for browser automation"
    }
  }
}
```

### 2. Start the server
The server will automatically detect `mcp-bridge.json`:
```bash
cd example-project
node ../src/easy-mcp-server.js
```

Or set the environment variable explicitly:
```bash
EASY_MCP_SERVER_BRIDGE_CONFIG_PATH=./mcp-bridge.json node ../src/easy-mcp-server.js
```

### 3. List available bridge tools
```bash
curl -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools[] | select(.tags[]? == "bridge")'
```

**Output:**
```
list_console_messages - List all console messages
emulate_cpu - Emulates CPU throttling
click - Clicks on the provided element
fill - Type text into an input
list_pages - Get a list of pages open in the browser
new_page - Creates a new page
navigate_page - Navigates the currently selected page
...
```

### 4. Call bridge tools with original names
```bash
# List pages in the browser
curl -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_pages","arguments":{}}}'
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [{
      "type": "text",
      "text": "# list_pages response\n## Pages\n0: about:blank\n1: https://example.com/ [selected]"
    }]
  }
}
```

## Key Benefits

1. ✅ **Use original tool names** - No more confusion about prefixes
2. ✅ **Automatic detection** - mcp-bridge.json is auto-detected
3. ✅ **Multiple bridges** - System tries each bridge until tool is found
4. ✅ **Clear tagging** - Bridge tools are tagged with ['bridge', 'serverName']
5. ✅ **Works with AI** - Tools show up correctly in MCP tool lists

## Testing

### Test 1: List tools
```bash
curl -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | jq -r '.result.tools[] | select(.tags[]? == "bridge") | "\(.name) - \(.description)"' \
  | head -10
```

### Test 2: Call a tool
```bash
curl -X POST http://localhost:8888/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_pages","arguments":{}}}'
```

## Notes

- Bridge tools are exposed with their **original names** as returned by the bridge MCP server
- The `[serverName]` tag in descriptions helps identify which bridge provides the tool
- If a tool exists in multiple bridges, the first one that responds successfully is used
- Chrome-devtools-mcp must have a browser instance running for tools to work

## Migration

If you were using prefixed tool names before:
- **Old:** `chrome_list_pages` ❌
- **New:** `list_pages` ✅

- **Old:** `iterm2_execute_command` ❌  
- **New:** `execute_command` ✅

## Status
✅ **Working** - Bridge tools are now accessible with their original names
✅ **Tested** - list_pages and other chrome-devtools-mcp tools work correctly
✅ **Auto-detection** - mcp-bridge.json is automatically found and loaded

