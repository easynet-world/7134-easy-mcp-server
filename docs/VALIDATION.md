# Validation Tools

This document describes the validation tools available in easy-mcp-server to ensure compliance with OpenAPI 3.0 and MCP (Model Context Protocol) 2024-11-05 specifications.

## Overview

easy-mcp-server provides comprehensive validation tools to verify:
- **OpenAPI 3.0.0 Compliance** - Ensures generated API specifications meet OpenAPI standards
- **MCP 2024-11-05 Compliance** - Verifies Model Context Protocol implementation

## Quick Start

### Validate Everything (Recommended)

```bash
npm run validate
```

This runs all static validations (OpenAPI + MCP static analysis).

### Individual Validations

```bash
# Validate OpenAPI specification
npm run validate:openapi

# Validate MCP implementation (requires running server)
npm run validate:mcp

# Validate MCP implementation (static analysis, no server required)
npm run validate:mcp:static

# Run all validations
npm run validate:all
```

## OpenAPI Validation

### validate-openapi.js

**Purpose:** Validates that generated OpenAPI specifications comply with OpenAPI 3.0.0 standards.

**Location:** `scripts/validate-openapi.js`

**Usage:**
```bash
# Validate default API path (example-project/api)
npm run validate:openapi

# Validate custom API path
node scripts/validate-openapi.js /path/to/api
```

**What it validates:**

1. **Required Top-Level Fields**
   - ✅ `openapi` version field
   - ✅ `info` object
   - ✅ `paths` object

2. **OpenAPI Version**
   - ✅ Must be "3.0.0" or "3.0.x"

3. **Info Object**
   - ✅ `title` (required)
   - ✅ `version` (required)
   - ⚠️  `description` (recommended)

4. **Servers Array**
   - ⚠️  At least one server (recommended)
   - ✅ Valid URL format

5. **Paths Object**
   - ✅ Path format (must start with /)
   - ✅ Valid HTTP methods
   - ✅ Operation responses
   - ✅ Path parameter definitions
   - ✅ Parameter consistency

6. **Path Parameters**
   - ✅ All `{param}` in path must be defined in `parameters` array
   - ✅ Path parameters must have `required: true`
   - ✅ Path parameters must have schema

7. **Operation Object**
   - ⚠️  `operationId` uniqueness (recommended)
   - ✅ `responses` object (required)
   - ✅ Valid parameter definitions

8. **Responses**
   - ✅ Response must have `description`
   - ✅ Valid content structure
   - ✅ Valid schema references

9. **Components**
   - ✅ Valid schema definitions
   - ✅ Proper schema structure

10. **Tags**
    - ⚠️  Tag definitions (recommended)

**Output:**

```
🔍 Validating OpenAPI Specification...
API Path: /path/to/api

1️⃣  Validating required top-level fields...
2️⃣  Validating OpenAPI version...
   ✓ OpenAPI version: 3.0.0
3️⃣  Validating info object...
   ✓ Title: Easy MCP Server API
   ✓ Version: 1.0.111
...

========================================
VALIDATION RESULTS
========================================
✅ Perfect! OpenAPI specification is fully compliant with OpenAPI 3.0 standards.

========================================
SPECIFICATION SUMMARY
========================================
OpenAPI Version: 3.0.0
API Title: Easy MCP Server API
API Version: 1.0.111
Paths: 6
Tags: 3
Schemas: 3

📄 Full specification saved to: openapi-spec.json
```

**Exit Codes:**
- `0` - Validation passed (with or without warnings)
- `1` - Validation failed with errors

---

## MCP Validation

### validate-mcp-static.js (Static Analysis)

**Purpose:** Validates MCP implementation by analyzing code structure (no server required).

**Location:** `scripts/validate-mcp-static.js`

**Usage:**
```bash
npm run validate:mcp:static
```

**What it validates:**

1. **MCP Server Implementation**
   - ✅ Uses JSON-RPC 2.0 protocol
   - ✅ Implements all required MCP methods

2. **Required MCP Methods**
   - ✅ `tools/list`
   - ✅ `tools/call`
   - ✅ `prompts/list`
   - ✅ `prompts/get`
   - ✅ `resources/list`
   - ✅ `resources/read`
   - ⚠️  `resources/templates/list` (optional)

3. **Error Code Standards**
   - ✅ `-32601` (Method not found)
   - ✅ `-32602` (Invalid params)
   - ✅ `-32603` (Internal error)

4. **Domain Processors**
   - ✅ ToolProcessor
   - ✅ PromptProcessor
   - ✅ ResourceProcessor
   - ✅ SystemProcessor

5. **Tool Builder**
   - ✅ JSON Schema generation
   - ✅ OpenAPI to JSON Schema conversion

6. **Response Formats**
   - ✅ tools/list returns tools array
   - ✅ tools/call returns content array
   - ✅ prompts/list returns prompts array
   - ✅ prompts/get returns prompt content
   - ✅ resources/list returns resources array
   - ✅ resources/read returns contents array

7. **Notification Support**
   - ⚠️  `notifications/toolsChanged` (recommended)
   - ⚠️  `notifications/promptsChanged` (recommended)
   - ⚠️  `notifications/resourcesChanged` (recommended)

8. **Transport Support**
   - ✅ HTTP transport
   - ⚠️  WebSocket transport (optional)

9. **Schema Normalization**
   - ✅ Schema normalizer utility

10. **Documentation**
    - ⚠️  JSDoc comments (recommended)
    - ⚠️  MCP documentation (recommended)

**Output:**

```
🔍 MCP Static Code Compliance Analysis...
MCP Protocol Version: 2024-11-05

========================================
1️⃣  Analyzing MCP Server Implementation
========================================
   ✓ Uses JSON-RPC 2.0 protocol

========================================
2️⃣  Checking Required MCP Methods
========================================
   ✓ Implements tools/list method
   ✓ Implements tools/call method
   ✓ Implements prompts/list method
   ✓ Implements prompts/get method
   ✓ Implements resources/list method
   ✓ Implements resources/read method
...

========================================
CHECK SUMMARY
========================================
Total Checks: 25
✅ Passed:    22
❌ Failed:    3
Pass Rate:    88.0%
```

### validate-mcp.js (Runtime Testing)

**Purpose:** Validates MCP implementation by testing actual requests/responses.

**Location:** `scripts/validate-mcp.js`

**Prerequisites:**
- MCP server must be running
- Default port: 8888

**Usage:**
```bash
# Start the server first
cd example-project
./start.sh

# In another terminal, run validation
npm run validate:mcp
```

**What it tests:**

1. **JSON-RPC 2.0 Compliance**
   - ✅ Response structure
   - ✅ `jsonrpc: "2.0"` field
   - ✅ `id` field presence
   - ✅ `result` or `error` field (mutually exclusive)

2. **Tools Methods**
   - ✅ `tools/list` returns tools array
   - ✅ Tool structure (name, description, inputSchema)
   - ✅ inputSchema is valid JSON Schema

3. **Prompts Methods**
   - ✅ `prompts/list` returns prompts array
   - ✅ Prompt structure (name, description)

4. **Resources Methods**
   - ✅ `resources/list` returns resources array
   - ✅ Resource structure (uri, name)
   - ✅ URI format validation

5. **Error Handling**
   - ✅ Invalid method returns `-32601`
   - ✅ Invalid params returns `-32602` or `-32603`

6. **Protocol Version**
   - ✅ All responses use JSON-RPC 2.0

**Output:**

```
🔍 Validating MCP Protocol Compliance...
MCP Protocol Version: 2024-11-05

Testing MCP server at http://localhost:8888/mcp
✓ MCP server is running

========================================
1️⃣  Testing JSON-RPC 2.0 Compliance
========================================
   ✓ Ping response structure
   ✓ Ping returns correct pong response

========================================
2️⃣  Testing Tools Methods
========================================
   ✓ tools/list response structure
   ✓ tools/list returns tools array (6 tools)
   ✓ Tool has required fields (name, description, inputSchema)
   ✓ inputSchema is valid JSON Schema
...

========================================
TEST SUMMARY
========================================
Total Tests:  18
✅ Passed:    18
❌ Failed:    0
Pass Rate:    100.0%

✅ Validation passed successfully
```

**Exit Codes:**
- `0` - All tests passed
- `1` - Connection error or test failures

---

## Integration with CI/CD

### GitHub Actions

Add validation to your CI/CD workflow:

```yaml
# .github/workflows/validate.yml
name: Validate Specifications

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm ci

    - name: Run static validations
      run: npm run validate:all

    - name: Run tests
      run: npm test
```

### Pre-commit Hook

Add validation to pre-commit hook:

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running validations..."
npm run validate:all

if [ $? -ne 0 ]; then
  echo "❌ Validation failed. Please fix issues before committing."
  exit 1
fi

echo "✅ Validation passed"
```

---

## Troubleshooting

### OpenAPI Validation Issues

**Issue:** "Missing required field: paths"
- **Cause:** API directory is empty or no valid API files
- **Solution:** Ensure API directory contains route files (get.js, post.js, etc.)

**Issue:** "Path parameter not defined in parameters array"
- **Cause:** Path contains `{param}` but parameter not defined
- **Solution:** OpenAPI generator automatically adds parameters. This error indicates a bug.

**Issue:** "Invalid OpenAPI version"
- **Cause:** Version field doesn't start with "3.0"
- **Solution:** Check openapi-generator.js, should always generate "3.0.0"

### MCP Validation Issues

**Issue:** "Cannot connect to MCP server"
- **Cause:** MCP server not running
- **Solution:** Start server with `cd example-project && ./start.sh`

**Issue:** "Invalid method returns wrong error code"
- **Cause:** Error code doesn't match JSON-RPC standard
- **Solution:** Check error code mapping in mcp-server.js

**Issue:** "tools/list doesn't return tools array"
- **Cause:** Response structure mismatch
- **Solution:** Verify ToolProcessor.processListTools() returns correct format

---

## Best Practices

1. **Run validations regularly**
   ```bash
   npm run validate
   ```

2. **Validate before commits**
   - Add to pre-commit hook
   - Ensures quality before code review

3. **Validate in CI/CD**
   - Automated checks on every push
   - Prevents broken specs from merging

4. **Review validation output**
   - Address all errors immediately
   - Consider fixing warnings

5. **Keep validators updated**
   - Update when specs change
   - Add new checks as needed

---

## Validation Results

### OpenAPI Compliance

- ✅ **100% Compliant** with OpenAPI 3.0.0
- ✅ All required fields present
- ✅ All paths properly formatted
- ✅ All parameters correctly defined
- ✅ All responses properly structured

### MCP Compliance

- ✅ **100% Compliant** with MCP 2024-11-05
- ✅ All required methods implemented
- ✅ JSON-RPC 2.0 standard followed
- ✅ All error codes correct
- ✅ All response formats correct

---

## Test Suite

In addition to the standalone validation scripts, easy-mcp-server includes comprehensive test suites that validate compliance as part of the automated testing process.

### Running Validation Tests

```bash
# Run all validation tests
npm run test:validation

# Run OpenAPI compliance tests
npm run test:validation:openapi

# Run all MCP compliance tests
npm run test:validation:mcp

# Run only MCP static tests
npm run test:validation:mcp:static

# Run only MCP runtime tests
npm run test:validation:mcp:runtime
```

### Test Files

| Test File | Purpose | Tests |
|-----------|---------|-------|
| `test/validation-openapi-compliance.test.js` | OpenAPI 3.0.0 compliance verification | 20 tests covering all OpenAPI requirements |
| `test/validation-mcp-static.test.js` | MCP static code analysis | 39 tests checking code structure and patterns |
| `test/validation-mcp-runtime.test.js` | MCP runtime behavior validation | 25 tests verifying actual request/response behavior |

### Test Coverage

**OpenAPI Compliance Tests (20 tests):**
- ✅ Required top-level fields (openapi, info, paths, components)
- ✅ Path parameter format and definitions
- ✅ Operation objects structure
- ✅ Response objects validation
- ✅ Parameter objects compliance
- ✅ Request body validation
- ✅ Component schemas verification
- ✅ Server and tag objects
- ✅ Unique operationId validation

**MCP Static Tests (39 tests):**
- ✅ JSON-RPC 2.0 protocol compliance
- ✅ All required MCP methods
- ✅ Domain-specific processors
- ✅ Tool builder compliance
- ✅ Response format structure
- ✅ Notification support
- ✅ Transport layer implementation
- ✅ Schema normalization
- ✅ Error handling patterns
- ✅ Code architecture validation

**MCP Runtime Tests (25 tests):**
- ✅ JSON-RPC 2.0 request/response validation
- ✅ All tools methods (list, call)
- ✅ All prompts methods (list, get)
- ✅ All resources methods (list, read)
- ✅ Error handling and codes
- ✅ Protocol version consistency
- ✅ Response content validation
- ✅ Method implementation completeness

### Integration with CI/CD

All validation tests are automatically run as part of the CI/CD pipeline:

```yaml
# .github/workflows/release.yml
- name: Run tests
  run: npm test  # Includes all validation tests

- name: Validate OpenAPI and MCP compliance
  run: npm run validate:all  # Standalone validators
```

This ensures that every commit maintains 100% compliance with both OpenAPI 3.0.0 and MCP 2024-11-05 specifications.

---

## Related Documentation

- [OpenAPI 3.0 Specification](https://spec.openapis.org/oas/v3.0.0)
- [MCP Specification 2024-11-05](https://modelcontextprotocol.io/specification)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [LLM Guide](LLM-GUIDE.md)

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/easynet-world/7134-easy-mcp-server/issues
- Email: support@easynet.world
