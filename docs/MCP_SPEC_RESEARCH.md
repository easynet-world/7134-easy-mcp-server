# MCP (Model Context Protocol) Specification Research

## Overview

Based on research of MCP specification (protocol version 2024-11-05), the following findings have been implemented:

## Description vs Summary

According to MCP best practices and technical specifications:

### Summary
- **Purpose**: Brief overview for quick scanning
- **Length**: Short, concise (typically one sentence)
- **Use Case**: When users need to quickly understand what a tool does
- **Example**: "List products" or "Create a new user"

### Description
- **Purpose**: Detailed explanation for full understanding
- **Length**: Longer, comprehensive (can be multiple sentences)
- **Use Case**: When users need complete information about functionality, parameters, and behavior
- **Example**: "List products with optional limit. Returns an array of product records filtered by the specified limit parameter."

## MCP Tool Schema Requirements

MCP tools should include:

1. **name** (required): Unique identifier for the tool
2. **description** (required): Detailed explanation of the tool
3. **summary** (recommended): Brief overview of the tool
4. **inputSchema** (required): JSON Schema for input parameters
5. **responseSchema** (optional): JSON Schema for response structure

### Response Schema Status

According to MCP specification:
- **responseSchema is OPTIONAL** - not required by the protocol
- **Bridge tools** may not provide responseSchema if the external MCP server doesn't include it
- **API tools** typically include responseSchema derived from OpenAPI response definitions
- When available, responseSchema helps AI models understand the expected output format
- When not available, it's acceptable to omit the field or set it to `null`

**Implementation Decision:**
- API tools: Include responseSchema when available from OpenAPI definitions
- Bridge tools: Preserve responseSchema if provided by the external MCP server, otherwise `null` (optional)

## Implementation in This Codebase

### Current Implementation

The codebase now supports both `summary` and `description`:

1. **Source**: 
   - `@summary()` annotation in API files
   - `@description()` annotation in API files
   - OpenAPI `summary` and `description` fields
   - Processor `summary` and `description` properties

2. **Tool Builder** (`src/mcp/builders/tool-builder.js`):
   - Extracts `summary` from OpenAPI or processor
   - Extracts `description` from OpenAPI, processor, or `mcpDescription`
   - Returns both fields in tool definition

3. **Display Script** (`scripts/list-mcp-info.js`):
   - Shows `summary` if it exists and differs from `description`
   - Shows `description` as the main detailed explanation

### Best Practices Followed

✅ Both `summary` and `description` are included in tool definitions
✅ `summary` is brief and suitable for quick scanning
✅ `description` provides detailed information
✅ Fallback logic ensures tools always have descriptions
✅ Display script shows both fields when available

## References

- MCP Protocol Specification (2024-11-05)
- Based on JSON-RPC 2.0
- All tools, prompts, and resources use JSON Schema Draft 2020-12

