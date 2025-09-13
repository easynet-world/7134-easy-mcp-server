# Resource Templates

Simple templates demonstrating `{{parameter}}` substitution in the MCP server.

## Available Templates

### API Configuration (`api-config-template.json`)
- `{{service_name}}` - Service name
- `{{port}}` - Port number  
- `{{db_name}}` - Database name
- `{{api_key}}` - API key

### README Template (`readme-template.md`)
- `{{project_name}}` - Project name
- `{{description}}` - Project description
- `{{package_name}}` - NPM package name
- `{{function_name}}` - Main function name
- `{{license}}` - License type

## Usage

```bash
curl -X POST http://localhost:3001/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"resources/read",
    "params":{
      "uri":"resource://templates/api-config-template.json",
      "arguments":{
        "service_name":"my-api",
        "port":3000,
        "db_name":"myapp_db",
        "api_key":"abc123"
      }
    }
  }'
```
