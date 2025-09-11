# Resource Templates

These are simple, one-glance understandable resource templates that demonstrate how to use `{{parameter}}` substitution in the MCP server.

## What are Resource Templates?

Resource templates are files containing `{{parameter}}` placeholders that get replaced with actual values when the resource is read. They support any file format and automatically detect parameters.

## Available Templates

### 1. API Configuration (`api-config-template.json`)
Simple JSON config with 4 parameters:
- `{{service_name}}` - Name of your service
- `{{port}}` - Port number
- `{{db_name}}` - Database name  
- `{{api_key}}` - API key

### 2. Docker Compose (`docker-compose-template.yml`)
Basic Docker setup with 6 parameters:
- `{{app_name}}` - Application name
- `{{image_name}}` - Docker image name
- `{{tag}}` - Image tag
- `{{port}}` - Port mapping
- `{{environment}}` - Environment (dev/prod)
- `{{database_url}}` - Database connection

### 3. Kubernetes Deployment (`kubernetes-deployment-template.yaml`)
Simple K8s deployment with 5 parameters:
- `{{app_name}}` - Application name
- `{{replicas}}` - Number of replicas
- `{{image_name}}` - Container image
- `{{tag}}` - Image tag
- `{{port}}` - Container port

### 4. Terraform Infrastructure (`terraform-infrastructure-template.tf`)
Basic EC2 instance with 3 parameters:
- `{{app_name}}` - Resource name
- `{{ami_id}}` - AMI ID
- `{{instance_type}}` - Instance type

### 5. Email Template (`email-template.html`)
Simple HTML email with 4 parameters:
- `{{subject}}` - Email subject
- `{{name}}` - Recipient name
- `{{message}}` - Email content
- `{{sender}}` - Sender name

### 6. README Template (`readme-template.md`)
Basic project README with 9 parameters:
- `{{project_name}}` - Project name
- `{{description}}` - Project description
- `{{package_name}}` - NPM package name
- `{{module_name}}` - Module name
- `{{function_name}}` - Main function name
- `{{parameter}}` - Function parameter
- `{{param}}` - API parameter
- `{{function_description}}` - Function description
- `{{license}}` - License type

### 7. Simple Config (`simple-config-template.txt`)
Environment variables with 4 parameters:
- `{{app_name}}` - Application name
- `{{port}}` - Port number
- `{{database_url}}` - Database URL
- `{{api_key}}` - API key

### 8. SQL Query (`sql-query-template.sql`)
Basic SQL query with 4 parameters:
- `{{table_name}}` - Table name
- `{{column_name}}` - Column name
- `{{value}}` - Filter value
- `{{date}}` - Date filter

### 9. Python Script (`python-script-template.py`)
Simple Python function with 6 parameters:
- `{{function_name}}` - Function name
- `{{param1}}` - First parameter
- `{{param2}}` - Second parameter
- `{{description}}` - Function description
- `{{value1}}` - First value
- `{{value2}}` - Second value

## How to Use

1. **List all templates:**
   ```bash
   curl -X POST http://localhost:3001/ \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"resources/templates/list"}'
   ```

2. **Read a template with parameters:**
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

## Key Features

- ✅ **Any file format** - JSON, YAML, HTML, Markdown, Python, SQL, etc.
- ✅ **Automatic parameter detection** - Finds `{{parameter}}` patterns
- ✅ **Simple substitution** - Replace parameters with actual values
- ✅ **One-glance understandable** - Clear, minimal examples
- ✅ **MIME type detection** - Proper content types for all formats
