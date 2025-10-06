const { spawn } = require('child_process');

console.log('Testing STDIO communication with chrome-devtools-mcp...');

const proc = spawn('npx', ['chrome-devtools-mcp', '--browserUrl', 'http://127.0.0.1:8886'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

proc.stdout.on('data', (chunk) => {
  const data = chunk.toString();
  output += data;
  console.log('STDOUT:', JSON.stringify(data));
});

proc.stderr.on('data', (chunk) => {
  const data = chunk.toString();
  errorOutput += data;
  console.log('STDERR:', JSON.stringify(data));
});

proc.on('exit', (code, signal) => {
  console.log(`Process exited with code ${code}, signal ${signal}`);
  console.log('Final output:', JSON.stringify(output));
  console.log('Final error:', JSON.stringify(errorOutput));
});

// Send initialization request
setTimeout(() => {
  console.log('Sending initialization request...');
  const request = {
    jsonrpc: '2.0',
    id: 0,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };
  
  const body = JSON.stringify(request);
  const header = `Content-Length: ${body.length}\r\n\r\n`;
  const message = header + body;
  
  console.log('Sending message:', JSON.stringify(message));
  proc.stdin.write(message);
  
  // Wait for response
  setTimeout(() => {
    console.log('Sending tools/list request...');
    const toolsRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    };
    
    const toolsBody = JSON.stringify(toolsRequest);
    const toolsHeader = `Content-Length: ${toolsBody.length}\r\n\r\n`;
    const toolsMessage = toolsHeader + toolsBody;
    
    console.log('Sending tools message:', JSON.stringify(toolsMessage));
    proc.stdin.write(toolsMessage);
    
    // Wait for response
    setTimeout(() => {
      console.log('Killing process...');
      proc.kill();
    }, 3000);
  }, 2000);
}, 1000);
