const { spawn } = require('child_process');

console.log('Testing chrome-devtools-mcp bridge communication...');

const proc = spawn('npx', ['chrome-devtools-mcp', '--browserUrl', 'http://127.0.0.1:8886'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

proc.stdout.on('data', (chunk) => {
  output += chunk.toString();
  console.log('STDOUT:', chunk.toString());
});

proc.stderr.on('data', (chunk) => {
  errorOutput += chunk.toString();
  console.log('STDERR:', chunk.toString());
});

proc.on('exit', (code, signal) => {
  console.log(`Process exited with code ${code}, signal ${signal}`);
  console.log('Final output:', output);
  console.log('Final error:', errorOutput);
});

// Send a tools/list request after 2 seconds
setTimeout(() => {
  console.log('Sending tools/list request...');
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };
  
  const body = JSON.stringify(request);
  const header = `Content-Length: ${body.length}\r\n\r\n`;
  const message = header + body;
  
  console.log('Sending message:', message);
  proc.stdin.write(message);
  
  // Wait for response
  setTimeout(() => {
    console.log('Killing process...');
    proc.kill();
  }, 5000);
}, 2000);
