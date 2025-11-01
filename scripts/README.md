# Scripts

## list-mcp-info.js

Lists all MCP tools, resources, prompts and their details.

### Usage

```bash
# Basic usage (connects to localhost:8888)
npm run mcp:list

# Or directly
node scripts/list-mcp-info.js

# With options
node scripts/list-mcp-info.js --host localhost --port 8888 --format detailed

# Save to file
node scripts/list-mcp-info.js --format json --output mcp-info.json
```

### Options

- `--host <host>` - MCP server host (default: localhost)
- `--port <port>` - MCP server port (default: 8888 or EASY_MCP_SERVER_MCP_PORT)
- `--transport <type>` - Transport type: `http`, `ws`, or `auto` (default: auto)
- `--format <format>` - Output format: `json`, `table`, or `detailed` (default: detailed)
- `--output <file>` - Save output to file (optional)
- `--help` or `-h` - Show help message

### Examples

```bash
# Get detailed information
node scripts/list-mcp-info.js --format detailed

# Get JSON output
node scripts/list-mcp-info.js --format json

# Save JSON to file
node scripts/list-mcp-info.js --format json --output mcp-info.json

# Connect to remote server
node scripts/list-mcp-info.js --host example.com --port 8888

# Force WebSocket transport
node scripts/list-mcp-info.js --transport ws
```

### Output Formats

- **detailed** (default): Human-readable detailed format with all information
- **table**: Compact table format
- **json**: JSON format for programmatic use

