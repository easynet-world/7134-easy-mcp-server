<!-- name: markdown-prompt-guide -->
<!-- description: Comprehensive guide for creating and managing Markdown-based prompts in easy-mcp-server -->
<!-- uri: resource://guides/markdown-prompt-guide -->
<!-- mime-type: text/markdown -->
<!-- version: 1.0.0 -->
<!-- author: EasyNet Team -->
<!-- category: guides -->
<!-- tags: markdown, prompts, documentation, guide -->
<!-- type: guide -->
<!-- format: markdown -->
<!-- language: en -->
<!-- source: easy-mcp-server framework -->
<!-- last-modified: 2024-01-01 -->
<!-- size: 2048 -->

# Markdown Prompt Guide for Easy-MCP-Server

## Overview

This guide explains how to create and manage Markdown-based prompts in the easy-mcp-server framework. The new Markdown format provides a more maintainable and readable way to define prompts with automatic parameter parsing.

## Benefits of Markdown Prompts

- **65% reduction in file count** (37 → 13 files in our test)
- **Eliminated all duplicate files**
- **Simplified maintenance** - no JSON configuration needed
- **Better readability** with native Markdown format
- **Easier collaboration** with clear diffs in version control
- **Faster development** with direct template editing

## Markdown Prompt Structure

### Metadata Section (HTML Comments)

```markdown
<!-- name: my_prompt -->
<!-- description: My prompt description -->
<!-- version: 1.0.0 -->
<!-- author: EasyNet Team -->
<!-- category: content_creation -->
<!-- tags: ai, agent, content -->
<!-- required: content, context -->
```

### Template Content

```markdown
# My Prompt Template

You are a specialized AI agent.

## Core Functionality

Process user input: {{content}}
Use context: {{context}}
Apply settings: {{enabled}}
```

## Parameter Parsing

The system automatically parses `{{parameter_name}}` placeholders and infers:

- **Parameter types** (string, number, boolean, array)
- **Required status** from metadata or context
- **Descriptions** based on parameter names
- **Validation rules** and constraints

### Supported Parameter Types

- `string` - Text content (default)
- `number` - Numeric values
- `boolean` - True/false values
- `array` - Lists of items
- `object` - Complex data structures

### Type Inference Examples

- `{{url}}` → string with format: uri
- `{{count}}` → number
- `{{enabled}}` → boolean
- `{{language}}` → string with enum values
- `{{tags}}` → array of strings

## Priority Loading

The system loads prompts in this priority order:

1. `.md` files (Markdown format)
2. `-config.json` files (JSON with config suffix)
3. `.json` files (standard JSON format)
4. `.yaml` / `.yml` files (YAML format)

## Migration from JSON

### Before (JSON Format)

```json
{
  "name": "my_prompt",
  "description": "My prompt description",
  "arguments": {
    "type": "object",
    "properties": {
      "content": {
        "type": "string",
        "description": "Input content"
      }
    },
    "required": ["content"]
  },
  "template": "Process {{content}} with {{context}}..."
}
```

### After (Markdown Format)

```markdown
<!-- name: my_prompt -->
<!-- description: My prompt description -->
<!-- required: content -->

# My Prompt Template

Process {{content}} with {{context}}...
```

## Best Practices

### 1. Use Descriptive Metadata

```markdown
<!-- name: youtube-video-analyzer -->
<!-- description: Analyze YouTube videos and extract metadata -->
<!-- category: video_analysis -->
<!-- tags: youtube, video, analysis, metadata -->
```

### 2. Group Related Parameters

```markdown
## Video Information
- **URL**: {{videoUrl}}
- **Language**: {{language}}
- **Format**: {{outputFormat}}

## Analysis Options
- **Include Comments**: {{includeComments}}
- **Max Results**: {{maxResults}}
```

### 3. Provide Context for Parameters

```markdown
Analyze the video at {{videoUrl}} and extract subtitles in {{language}} format.
Limit results to {{maxResults}} items if specified.
```

### 4. Use Semantic Parameter Names

- ✅ `{{videoUrl}}` instead of `{{url}}`
- ✅ `{{subtitleLanguage}}` instead of `{{lang}}`
- ✅ `{{includeMetadata}}` instead of `{{meta}}`

## CLI Tools

### Convert Existing Prompts

```bash
# Convert single prompt
./bin/markdown-converter.js convert -i prompts/my-prompt.json -f to-markdown

# Batch convert all prompts
./bin/markdown-converter.js batch-convert -i ./mcp/prompts -o ./mcp/prompts/markdown

# Validate Markdown prompts
./bin/markdown-converter.js validate -i ./mcp/prompts -r
```

### Statistics and Analysis

```bash
# Show statistics
./bin/markdown-converter.js stats -i ./mcp

# Export as JSON
./bin/markdown-converter.js stats -i ./mcp -f json
```

## Framework Integration

The Markdown prompt system integrates seamlessly with:

- **MCP Protocol** - Automatic tool generation
- **OpenAPI Generation** - Schema extraction
- **Hot Reloading** - Real-time updates
- **Validation** - Automatic error checking
- **Backward Compatibility** - Existing JSON prompts continue to work

## Troubleshooting

### Common Issues

1. **Missing Required Parameters**
   - Ensure all required parameters are listed in metadata
   - Check that parameters are used in the template

2. **Type Inference Errors**
   - Use descriptive parameter names
   - Provide context clues in the template

3. **Validation Failures**
   - Run validation: `./bin/markdown-converter.js validate -i your-file.md`
   - Check metadata format and parameter usage

### Getting Help

- Check the framework documentation
- Use the CLI validation tools
- Review example prompts in the repository
- Enable debug logging for detailed information

## Examples

See the `mcp/prompts/` directory for complete examples of Markdown prompts covering:

- API documentation generation
- Content creation
- Data analysis
- Health monitoring
- Tool creation

Each example demonstrates best practices and advanced features of the Markdown prompt system.
