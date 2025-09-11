# Enhanced MCP Server - Resources and Prompts

This document demonstrates the enhanced MCP server capabilities for supporting any file format with automatic `{{params}}` template support.

## Features

### ✅ Any File Format Support
The MCP server now supports **any file format** for both resources and prompts, not just the limited set previously supported.

### ✅ Automatic Template Parameter Detection
The server automatically detects `{{parameter}}` placeholders in any file and enables template functionality.

### ✅ Template Parameter Substitution
Resources and prompts can be processed with parameter substitution when reading them.

## Configuration

### Default Configuration (Supports All Formats)
```javascript
const server = new DynamicAPIMCPServer('0.0.0.0', 3001, {
  prompts: {
    enabled: true,
    directory: './mcp/prompts',
    watch: true,
    formats: ['*'],              // Support any file format
    enableTemplates: true        // Enable {{params}} template support
  },
  resources: {
    enabled: true,
    directory: './mcp/resources',
    watch: true,
    formats: ['*'],              // Support any file format
    enableTemplates: true        // Enable {{params}} template support
  }
});
```

### Custom Format Restrictions
```javascript
const server = new DynamicAPIMCPServer('0.0.0.0', 3001, {
  resources: {
    enabled: true,
    directory: './mcp/resources',
    formats: ['js', 'py', 'md', 'txt'],  // Only specific formats
    enableTemplates: true
  }
});
```

## Supported File Formats

The server now supports **any file format** including but not limited to:

### Programming Languages
- `.js` - JavaScript
- `.ts` - TypeScript
- `.py` - Python
- `.java` - Java
- `.cpp`, `.c`, `.h` - C/C++
- `.cs` - C#
- `.php` - PHP
- `.rb` - Ruby
- `.go` - Go
- `.rs` - Rust
- `.swift` - Swift
- `.kt` - Kotlin
- `.scala` - Scala
- `.dart` - Dart
- `.elm` - Elm
- `.clj`, `.cljs` - Clojure
- `.hs` - Haskell
- `.ml` - OCaml
- `.fs` - F#
- `.vb` - Visual Basic

### Markup and Data
- `.md` - Markdown
- `.html`, `.htm` - HTML
- `.xml` - XML
- `.json` - JSON
- `.yaml`, `.yml` - YAML
- `.toml` - TOML
- `.ini` - INI
- `.cfg`, `.conf` - Configuration
- `.properties` - Properties
- `.env` - Environment

### Styles and Scripts
- `.css` - CSS
- `.scss` - SCSS
- `.sass` - Sass
- `.less` - Less
- `.sh`, `.bash` - Shell scripts
- `.zsh` - Zsh
- `.fish` - Fish
- `.ps1` - PowerShell
- `.bat`, `.cmd` - Batch

### Documentation
- `.rst` - reStructuredText
- `.adoc`, `.asciidoc` - AsciiDoc
- `.org` - Org mode
- `.wiki` - Wiki markup
- `.tex` - LaTeX

### Other
- `.sql` - SQL
- `.r` - R
- `.m`, `.mm` - Objective-C
- `.pl`, `.pm` - Perl
- `.lua` - Lua
- `.asm`, `.s` - Assembly
- `.dockerfile` - Dockerfile
- `.makefile` - Makefile
- `.cmake` - CMake
- `.gradle` - Gradle
- `.log` - Log files
- `.diff`, `.patch` - Patches
- `.csv` - CSV
- `.tsv` - TSV
- `.rtf` - RTF
- `.vtt` - WebVTT
- `.srt` - SubRip
- `.sub` - SubViewer
- `.smi` - SAMI

## Examples

### Resource Examples

#### JavaScript Resource with Templates
**File: `mcp/resources/api-client.js`**
```javascript
// API Client for {{service_name}}
class {{service_name}}Client {
  constructor(apiKey, baseUrl = '{{base_url}}') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async {{method_name}}({{params}}) {
    const response = await fetch(`${this.baseUrl}/{{endpoint}}`, {
      method: '{{http_method}}',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({{request_body}})
    });
    
    return response.json();
  }
}
```

#### Python Resource with Templates
**File: `mcp/resources/data_processor.py`**
```python
# Data processor for {{data_type}}
import pandas as pd
import numpy as np

def process_{{data_type}}(input_file, output_file, {{processing_params}}):
    """
    Process {{data_type}} data with the following parameters:
    - Input: {{input_file}}
    - Output: {{output_file}}
    - Processing: {{processing_params}}
    """
    df = pd.read_csv(input_file)
    
    # Apply {{transformation_type}} transformation
    processed_df = df.{{transformation_method}}({{transformation_params}})
    
    processed_df.to_csv(output_file, index=False)
    return f"Processed {{data_type}} data saved to {output_file}"
```

#### YAML Configuration with Templates
**File: `mcp/resources/app-config.yaml`**
```yaml
app:
  name: "{{app_name}}"
  version: "{{version}}"
  environment: "{{environment}}"

database:
  host: "{{db_host}}"
  port: {{db_port}}
  name: "{{db_name}}"
  username: "{{db_user}}"
  password: "{{db_password}}"

api:
  base_url: "{{api_base_url}}"
  timeout: {{api_timeout}}
  retries: {{api_retries}}
```

### Prompt Examples

#### Markdown Prompt with Templates
**File: `mcp/prompts/code-review.md`**
```markdown
# {{review_type}} Code Review

You are a senior {{language}} developer reviewing code for {{project_name}}.

## Review Guidelines
- Focus on {{focus_areas}}
- Check for {{checklist_items}}
- Ensure {{quality_standards}}

## Code to Review
```{{language}}
{{code}}
```

Please provide:
1. **Issues Found**: List any problems
2. **Suggestions**: Improvement recommendations
3. **Security Concerns**: Any security issues
4. **Performance**: Performance considerations
```

#### JSON Prompt with Metadata
**File: `mcp/prompts/api-documentation.json`**
```json
{
  "name": "api_documentation_generator",
  "description": "Generate API documentation for {{api_name}}",
  "instructions": "Create comprehensive API documentation for {{api_name}} with the following specifications:\n\n**API Details:**\n- Name: {{api_name}}\n- Version: {{api_version}}\n- Base URL: {{base_url}}\n- Authentication: {{auth_type}}\n\n**Endpoints:**\n{{endpoints}}\n\n**Request/Response Examples:**\n{{examples}}\n\nPlease generate:\n1. Overview section\n2. Authentication guide\n3. Endpoint documentation\n4. Code examples in {{programming_language}}\n5. Error handling guide",
  "arguments": {
    "properties": {
      "api_name": { "description": "Name of the API" },
      "api_version": { "description": "API version" },
      "base_url": { "description": "Base URL for the API" },
      "auth_type": { "description": "Authentication type" },
      "endpoints": { "description": "List of API endpoints" },
      "examples": { "description": "Request/response examples" },
      "programming_language": { "description": "Programming language for examples" }
    },
    "required": ["api_name", "api_version", "base_url"]
  }
}
```

## Using Templates

### Reading Resources with Parameter Substitution

#### HTTP Request
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "resources/read",
    "params": {
      "uri": "resource://api-client.js",
      "arguments": {
        "service_name": "UserService",
        "base_url": "https://api.example.com",
        "method_name": "getUser",
        "params": "userId",
        "endpoint": "users",
        "http_method": "GET",
        "request_body": "null"
      }
    }
  }'
```

#### WebSocket Request
```javascript
ws.send(JSON.stringify({
  type: 'read_resource',
  id: 1,
  uri: 'resource://api-client.js',
  arguments: {
    service_name: 'UserService',
    base_url: 'https://api.example.com',
    method_name: 'getUser',
    params: 'userId',
    endpoint: 'users',
    http_method: 'GET',
    request_body: 'null'
  }
}));
```

### Reading Prompts with Parameter Substitution

#### HTTP Request
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "prompts/get",
    "params": {
      "name": "code_review",
      "arguments": {
        "review_type": "security",
        "language": "JavaScript",
        "project_name": "MyApp",
        "focus_areas": "authentication and authorization",
        "checklist_items": "input validation, error handling, secure coding practices",
        "quality_standards": "clean code principles and security best practices",
        "code": "function authenticateUser(username, password) { /* implementation */ }"
      }
    }
  }'
```

## Template Metadata

When reading resources or prompts with template parameters, the response includes metadata:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "contents": [
      {
        "uri": "resource://api-client.js",
        "mimeType": "application/javascript",
        "text": "// Processed content with substituted parameters"
      }
    ],
    "template": {
      "hasParameters": true,
      "parameters": ["service_name", "base_url", "method_name"],
      "parameterCount": 3
    }
  }
}
```

## Benefits

1. **Universal Format Support**: Use any file format for resources and prompts
2. **Automatic Parameter Detection**: No manual configuration needed for template parameters
3. **Flexible Template System**: Support for `{{parameter}}` syntax in any file type
4. **Rich Metadata**: Automatic extraction of parameter information
5. **Backward Compatibility**: Existing functionality continues to work
6. **Hot Reloading**: Changes to files are automatically detected and loaded
7. **MIME Type Detection**: Proper content type detection for all supported formats

## Migration from Previous Version

The enhanced functionality is backward compatible. Existing configurations will continue to work, but you can now:

1. Use `formats: ['*']` to support any file format
2. Enable `enableTemplates: true` for automatic parameter detection
3. Add `{{parameters}}` to any file for template functionality
4. Use any file extension for resources and prompts

No changes are required to existing code - the enhancements are additive and optional.
