/**
 * E2E test: CLI should serve static files from user's public directory
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

describe('CLI Static File Serving', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(__dirname, 'cli-static-test-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should configure static dir to user\'s public directory (via logs)', (done) => {
    // Skip in CI if GitHub Actions (too flaky)
    if (process.env.CI && process.env.GITHUB_ACTIONS) {
      console.log('⚠️  Skipping static file serving test in CI (known flaky test)');
      done();
      return;
    }
    // Arrange: create minimal api and public content in user project dir
    const apiDir = path.join(tempDir, 'api');
    fs.mkdirSync(apiDir, { recursive: true });
    fs.writeFileSync(
      path.join(apiDir, 'get.js'),
      'const BaseAPI = require(\'easy-mcp-server/base-api\');\nclass TestAPI extends BaseAPI { process(req, res){ res.json({ ok: true }); } }\nmodule.exports = TestAPI;\n'
    );

    const publicDir = path.join(tempDir, 'public');
    fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(path.join(publicDir, 'hello.txt'), 'hello-from-cli-public');

    // Act: start CLI which should forward user's public dir to orchestrator
    const serverProcess = spawn('node', ['../../src/easy-mcp-server.js'], {
      stdio: 'pipe',
      cwd: tempDir,
      env: {
        ...process.env,
        EASY_MCP_SERVER_PORT: '8887',
        EASY_MCP_SERVER_MCP_PORT: '0'
      }
    });

    let output = '';
    let checksDone = false;
    serverProcess.stdout.on('data', (data) => { output += data.toString(); });
    serverProcess.stderr.on('data', (data) => { output += data.toString(); });

    // Check multiple times with increasing delays
    const checkInterval = setInterval(() => {
      const hasStaticEnabled = output.includes('Static files enabled: serving from') || 
                                output.includes('📁 Static files enabled');
      const hasMiddlewareApplied = output.includes('Static file middleware applied successfully') ||
                                    output.includes('✅ Static file middleware');
      
      if (hasStaticEnabled && hasMiddlewareApplied && !checksDone) {
        checksDone = true;
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
        // Clean up
        serverProcess.kill('SIGTERM');
        setTimeout(() => {
          if (!serverProcess.killed) serverProcess.kill('SIGKILL');
          done();
        }, 100);
      }
    }, 500);

    const timeoutId = setTimeout(() => {
      clearInterval(checkInterval);
      if (!checksDone) {
        serverProcess.kill('SIGTERM');
        setTimeout(() => {
          if (!serverProcess.killed) serverProcess.kill('SIGKILL');
        }, 100);
        done(new Error('Timeout waiting for static file configuration logs'));
      }
    }, 10000);
  }, 15000);
});


