# MCP Bridge Configuration

## Environment Variable Pattern

All MCP bridge servers now use a simple environment variable pattern:

```
EASY_MCP_SERVER.[SERVER_NAME].[PARAMETER_NAME]=[value]
```

## How It Works

1. **Automatic Environment Building**: The bridge reloader automatically scans for environment variables that start with `EASY_MCP_SERVER.[SERVER_NAME].` and passes them to the MCP server.

2. **Automatic Failure Handling**: If an MCP server fails to start, it will show an informative message and skip that server without crashing the entire system.

3. **No Complex Configuration**: No more `envMap` or `passthroughPrefixes` - just simple environment variables.

## Example Configuration

For a GitHub MCP server, you would set:

```bash
# GitHub MCP Server
EASY_MCP_SERVER.github.token=your_github_token_here
EASY_MCP_SERVER.github.api_url=https://api.github.com
```

This automatically becomes:
- `TOKEN=your_github_token_here`
- `API_URL=https://api.github.com`

## Supported MCP Servers

The following MCP servers are configured in `mcp-bridge.json`:

- **Core MCP Servers**:
  - `github` - GitHub API tools
  - `gitlab` - GitLab API tools  
  - `slack` - Slack workspace integration
  - `filesystem` - Local filesystem access
  - `postgres` - Postgres database access
  - `memory` - Simple persistent memory
  - `everything` - Test/showcase server

- **Vendor MCP Servers**:
  - `playwright` - Microsoft Playwright browser automation
  - `clarity` - Microsoft Clarity analytics
  - `salesforce` - Salesforce DX integration
  - `notion` - Notion workspace integration
  - `contentful` - Contentful content management
  - `chrome` - Chrome DevTools integration
  - `iterm2` - iTerm2 terminal integration

## Environment Variable Examples

```bash
# GitHub
EASY_MCP_SERVER.github.token=ghp_xxxxxxxxxxxx
EASY_MCP_SERVER.github.api_url=https://api.github.com

# Postgres
EASY_MCP_SERVER.postgres.host=localhost
EASY_MCP_SERVER.postgres.db=myapp
EASY_MCP_SERVER.postgres.user=postgres
EASY_MCP_SERVER.postgres.password=secret
EASY_MCP_SERVER.postgres.port=5432

# Chrome DevTools
EASY_MCP_SERVER.chrome.debug_port=9222
EASY_MCP_SERVER.chrome.user_data_dir=/tmp/chrome-profile

# iTerm2
EASY_MCP_SERVER.iterm2.session_id=w0t0p0
EASY_MCP_SERVER.iterm2.profile=Default
```

## Failure Handling

If an MCP server fails to start (due to missing environment variables or other issues), you'll see a message like:

```
⚠️  MCP Bridge 'github' failed to start - check your environment variables (EASY_MCP_SERVER.github.*)
```

This helps you identify which environment variables need to be configured for each server.
