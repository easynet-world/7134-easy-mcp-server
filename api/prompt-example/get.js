const BaseAPI = require('../../src/core/base-api');

/**
 * @description Demo API endpoint that showcases MCP prompts feature
 * @summary Prompt Example API
 * @tags prompt-demo
 * @responseSchema {
 *   "type": "object",
 *   "properties": {
 *     "message": { "type": "string" },
 *     "prompts": { "type": "array" },
 *     "resources": { "type": "array" }
 *   }
 * }
 */
class PromptExampleAPI extends BaseAPI {
  constructor() {
    super();
    
    // Define prompts that this API provides
    this.prompts = [
      {
        name: 'code_review_prompt',
        description: 'A prompt template for conducting code reviews',
        template: 'Please review the following {{language}} code for best practices, security issues, and potential improvements:\n\n```{{language}}\n{{code}}\n```\n\nPlease provide:\n1. Overall assessment\n2. Specific issues found\n3. Recommendations for improvement\n4. Security considerations',
        arguments: [
          {
            name: 'language',
            description: 'Programming language of the code',
            required: true
          },
          {
            name: 'code',
            description: 'The code to review',
            required: true
          }
        ]
      },
      {
        name: 'api_documentation_prompt',
        description: 'Generate documentation for an API endpoint',
        template: 'Create comprehensive documentation for the following API endpoint:\n\nMethod: {{method}}\nPath: {{path}}\nDescription: {{description}}\n\nPlease include:\n1. Purpose and use cases\n2. Request/response examples\n3. Error handling\n4. Authentication requirements',
        arguments: [
          {
            name: 'method',
            description: 'HTTP method (GET, POST, etc.)',
            required: true
          },
          {
            name: 'path',
            description: 'API endpoint path',
            required: true
          },
          {
            name: 'description',
            description: 'Brief description of the endpoint',
            required: true
          }
        ]
      }
    ];

    // Define resources that this API provides
    this.resources = [
      {
        uri: 'prompt://code-review-guidelines',
        name: 'Code Review Guidelines',
        description: 'Best practices and guidelines for conducting code reviews',
        mimeType: 'text/markdown',
        content: `# Code Review Guidelines

## Overview
This document outlines best practices for conducting effective code reviews.

## Review Checklist
- [ ] Code follows project style guidelines
- [ ] Functions are well-documented
- [ ] Error handling is appropriate
- [ ] Security vulnerabilities are addressed
- [ ] Performance considerations are met
- [ ] Tests are included and comprehensive

## Common Issues to Look For
1. **Security**: SQL injection, XSS, authentication bypass
2. **Performance**: N+1 queries, memory leaks, inefficient algorithms
3. **Maintainability**: Code duplication, overly complex functions
4. **Documentation**: Missing comments, unclear variable names

## Feedback Guidelines
- Be constructive and specific
- Explain the reasoning behind suggestions
- Acknowledge good practices when you see them
- Focus on the code, not the person
`
      },
      {
        uri: 'prompt://api-design-principles',
        name: 'API Design Principles',
        description: 'Core principles for designing RESTful APIs',
        mimeType: 'text/markdown',
        content: `# API Design Principles

## RESTful Design
- Use appropriate HTTP methods (GET, POST, PUT, DELETE)
- Use meaningful resource URLs
- Return appropriate HTTP status codes
- Use consistent naming conventions

## Error Handling
- Provide clear error messages
- Use standard HTTP status codes
- Include error details in response body
- Log errors for debugging

## Security
- Implement proper authentication and authorization
- Validate all input data
- Use HTTPS for all endpoints
- Rate limiting for API protection

## Documentation
- Provide comprehensive API documentation
- Include request/response examples
- Document error responses
- Keep documentation up to date
`
      }
    ];
  }

  process(req, res) {
    res.json({
      message: 'Prompt Example API - This endpoint demonstrates MCP prompts and resources',
      availablePrompts: this.prompts.map(p => ({
        name: p.name,
        description: p.description,
        arguments: p.arguments
      })),
      availableResources: this.resources.map(r => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType
      })),
      usage: {
        prompts: 'Use MCP prompts/list and prompts/get to access prompt templates',
        resources: 'Use MCP resources/list and resources/read to access documentation resources'
      }
    });
  }
}

module.exports = PromptExampleAPI;
