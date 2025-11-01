#!/usr/bin/env node
/**
 * MCP (Model Context Protocol) Static Compliance Validator
 * Validates MCP implementation by analyzing code structure (no server required)
 *
 * Based on MCP Specification 2024-11-05
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 MCP Static Code Compliance Analysis...');
console.log('MCP Protocol Version: 2024-11-05');
console.log('');

let errors = [];
let warnings = [];
let checks = {
  passed: 0,
  failed: 0,
  total: 0
};

function check(condition, passMsg, failMsg) {
  checks.total++;
  if (condition) {
    console.log(`   ✓ ${passMsg}`);
    checks.passed++;
    return true;
  } else {
    console.log(`   ✗ ${failMsg}`);
    errors.push(failMsg);
    checks.failed++;
    return false;
  }
}

function warn(condition, passMsg, warnMsg) {
  if (condition) {
    console.log(`   ✓ ${passMsg}`);
  } else {
    console.log(`   ⚠ ${warnMsg}`);
    warnings.push(warnMsg);
  }
}

console.log('========================================');
console.log('1️⃣  Analyzing MCP Server Implementation');
console.log('========================================');

// Read MCP server file
const mcpServerPath = path.join(__dirname, '../src/mcp/mcp-server.js');
const mcpServerCode = fs.readFileSync(mcpServerPath, 'utf8');

// Check for JSON-RPC 2.0 compliance
check(
  mcpServerCode.includes('jsonrpc: \'2.0\'') || mcpServerCode.includes('jsonrpc: "2.0"'),
  'Uses JSON-RPC 2.0 protocol',
  'Missing JSON-RPC 2.0 protocol identifier'
);

// Check for required MCP methods
const requiredMethods = [
  { name: 'tools/list', pattern: /['"]tools\/list['"]/ },
  { name: 'tools/call', pattern: /['"]tools\/call['"]/ },
  { name: 'prompts/list', pattern: /['"]prompts\/list['"]/ },
  { name: 'prompts/get', pattern: /['"]prompts\/get['"]/ },
  { name: 'resources/list', pattern: /['"]resources\/list['"]/ },
  { name: 'resources/read', pattern: /['"]resources\/read['"]/ }
];

console.log('');
console.log('========================================');
console.log('2️⃣  Checking Required MCP Methods');
console.log('========================================');

requiredMethods.forEach(method => {
  check(
    method.pattern.test(mcpServerCode),
    `Implements ${method.name} method`,
    `Missing required method: ${method.name}`
  );
});

// Check for optional MCP methods
warn(
  /['"]resources\/templates\/list['"]/.test(mcpServerCode),
  'Implements resources/templates/list (optional)',
  'resources/templates/list not implemented (optional method)'
);

console.log('');
console.log('========================================');
console.log('3️⃣  Checking Error Code Standards');
console.log('========================================');

// JSON-RPC 2.0 standard error codes
const errorCodes = [
  { code: -32700, name: 'Parse error' },
  { code: -32600, name: 'Invalid Request' },
  { code: -32601, name: 'Method not found' },
  { code: -32602, name: 'Invalid params' },
  { code: -32603, name: 'Internal error' }
];

// Check for method not found error
check(
  /-32601/.test(mcpServerCode),
  'Implements -32601 (Method not found) error code',
  'Missing -32601 error code for method not found'
);

// Check for invalid params error
check(
  /-32602/.test(mcpServerCode),
  'Implements -32602 (Invalid params) error code',
  'Missing -32602 error code for invalid params'
);

// Check for internal error
check(
  /-32603/.test(mcpServerCode),
  'Implements -32603 (Internal error) error code',
  'Missing -32603 error code for internal errors'
);

console.log('');
console.log('========================================');
console.log('4️⃣  Analyzing Request Processor');
console.log('========================================');

const processorPath = path.join(__dirname, '../src/mcp/processors/mcp-request-processor.js');
const processorCode = fs.readFileSync(processorPath, 'utf8');

// Check for domain-specific processors
const processors = [
  { name: 'ToolProcessor', file: 'tool-processor' },
  { name: 'PromptProcessor', file: 'prompt-processor' },
  { name: 'ResourceProcessor', file: 'resource-processor' },
  { name: 'SystemProcessor', file: 'system-processor' }
];

processors.forEach(proc => {
  check(
    processorCode.includes(proc.name),
    `Uses ${proc.name} for domain separation`,
    `Missing ${proc.name}`
  );
});

// Check routing logic
check(
  processorCode.includes('processMCPRequest'),
  'Has main request processing method',
  'Missing processMCPRequest method'
);

console.log('');
console.log('========================================');
console.log('5️⃣  Analyzing Tool Builder');
console.log('========================================');

const toolBuilderPath = path.join(__dirname, '../src/mcp/builders/tool-builder.js');
const toolBuilderCode = fs.readFileSync(toolBuilderPath, 'utf8');

// Check for JSON Schema conversion
check(
  toolBuilderCode.includes('inputSchema') && toolBuilderCode.includes('properties'),
  'Generates JSON Schema for tool inputs',
  'Missing JSON Schema generation for tool inputs'
);

// Check for OpenAPI to MCP conversion
check(
  toolBuilderCode.includes('convertOpenAPIToJSONSchema') || toolBuilderCode.includes('convertToJSONSchema'),
  'Converts OpenAPI schemas to JSON Schema',
  'Missing OpenAPI to JSON Schema conversion'
);

console.log('');
console.log('========================================');
console.log('6️⃣  Analyzing Response Formats');
console.log('========================================');

// Check tool response format
const toolProcessorPath = path.join(__dirname, '../src/mcp/processors/domains/tool-processor.js');
if (fs.existsSync(toolProcessorPath)) {
  const toolProcessorCode = fs.readFileSync(toolProcessorPath, 'utf8');

  check(
    toolProcessorCode.includes('tools:') || toolProcessorCode.includes('"tools"'),
    'tools/list returns tools array',
    'tools/list might not return tools array'
  );

  check(
    toolProcessorCode.includes('content:') || toolProcessorCode.includes('"content"'),
    'tools/call returns content array',
    'tools/call might not return content array'
  );
}

// Check prompt response format
const promptProcessorPath = path.join(__dirname, '../src/mcp/processors/domains/prompt-processor.js');
if (fs.existsSync(promptProcessorPath)) {
  const promptProcessorCode = fs.readFileSync(promptProcessorPath, 'utf8');

  check(
    promptProcessorCode.includes('prompts:') || promptProcessorCode.includes('"prompts"'),
    'prompts/list returns prompts array',
    'prompts/list might not return prompts array'
  );

  check(
    promptProcessorCode.includes('messages:') || promptProcessorCode.includes('"messages"') ||
    promptProcessorCode.includes('description:'),
    'prompts/get returns prompt content',
    'prompts/get might not return correct format'
  );
}

// Check resource response format
const resourceProcessorPath = path.join(__dirname, '../src/mcp/processors/domains/resource-processor.js');
if (fs.existsSync(resourceProcessorPath)) {
  const resourceProcessorCode = fs.readFileSync(resourceProcessorPath, 'utf8');

  check(
    resourceProcessorCode.includes('resources:') || resourceProcessorCode.includes('"resources"'),
    'resources/list returns resources array',
    'resources/list might not return resources array'
  );

  check(
    resourceProcessorCode.includes('contents:') || resourceProcessorCode.includes('"contents"'),
    'resources/read returns contents array',
    'resources/read might not return contents array'
  );
}

console.log('');
console.log('========================================');
console.log('7️⃣  Checking Notification Support');
console.log('========================================');

// Check for notification methods
const notifications = [
  'notifications/toolsChanged',
  'notifications/promptsChanged',
  'notifications/resourcesChanged'
];

notifications.forEach(notif => {
  const hasNotification = mcpServerCode.includes(notif);
  warn(
    hasNotification,
    `Supports ${notif} notification`,
    `${notif} notification not implemented (recommended)`
  );
});

console.log('');
console.log('========================================');
console.log('8️⃣  Checking Transport Support');
console.log('========================================');

// Check for HTTP transport
const httpHandlerPath = path.join(__dirname, '../src/mcp/handlers/transport/http-handler.js');
check(
  fs.existsSync(httpHandlerPath),
  'Implements HTTP transport',
  'Missing HTTP transport handler'
);

// Check for WebSocket transport
const wsHandlerPath = path.join(__dirname, '../src/mcp/handlers/transport/websocket-handler.js');
warn(
  fs.existsSync(wsHandlerPath),
  'Implements WebSocket transport (optional)',
  'WebSocket transport not implemented (optional)'
);

console.log('');
console.log('========================================');
console.log('9️⃣  Checking Schema Normalization');
console.log('========================================');

const schemaNormalizerPath = path.join(__dirname, '../src/mcp/utils/schema-normalizer.js');
check(
  fs.existsSync(schemaNormalizerPath),
  'Has schema normalization utility',
  'Missing schema normalization utility'
);

if (fs.existsSync(schemaNormalizerPath)) {
  const normalizerCode = fs.readFileSync(schemaNormalizerPath, 'utf8');

  warn(
    normalizerCode.includes('normalize') && normalizerCode.includes('schema'),
    'Schema normalizer appears functional',
    'Schema normalizer might be incomplete'
  );
}

console.log('');
console.log('========================================');
console.log('🔟  Checking Documentation');
console.log('========================================');

// Check for JSDoc comments
warn(
  mcpServerCode.includes('/**') && mcpServerCode.includes('* @'),
  'MCP server has JSDoc documentation',
  'Missing comprehensive JSDoc documentation'
);

// Check for README or documentation
const docFiles = ['README.md', 'docs/mcp.md', 'docs/MCP.md'];
const hasDoc = docFiles.some(file => fs.existsSync(path.join(__dirname, '..', file)));
warn(
  hasDoc,
  'Project has documentation',
  'Missing MCP-specific documentation'
);

console.log('');
console.log('========================================');
console.log('VALIDATION RESULTS');
console.log('========================================');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ Perfect! MCP implementation passes all static compliance checks.');
} else {
  if (errors.length > 0) {
    console.log('');
    console.log(`❌ ERRORS (${errors.length}):`);
    errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  if (warnings.length > 0) {
    console.log('');
    console.log(`⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
  }
}

console.log('');
console.log('========================================');
console.log('CHECK SUMMARY');
console.log('========================================');
console.log(`Total Checks: ${checks.total}`);
console.log(`✅ Passed:    ${checks.passed}`);
console.log(`❌ Failed:    ${checks.failed}`);
console.log(`Pass Rate:    ${checks.total > 0 ? ((checks.passed / checks.total) * 100).toFixed(1) : 0}%`);
console.log('');

console.log('========================================');
console.log('NEXT STEPS');
console.log('========================================');
console.log('To perform runtime validation:');
console.log('  1. Start the server: cd example-project && ./start.sh');
console.log('  2. Run: node scripts/validate-mcp.js');
console.log('');

// Exit with appropriate code
if (errors.length > 0) {
  console.log('❌ Static validation found compliance issues');
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('⚠️  Static validation passed with warnings');
  process.exit(0);
} else {
  console.log('✅ Static validation passed successfully');
  process.exit(0);
}
