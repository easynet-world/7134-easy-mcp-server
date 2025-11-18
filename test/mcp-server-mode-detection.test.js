/**
 * Tests for MCP Server Mode Detection and Bin Script Features
 * Tests automatic mode detection, port configuration, and log output
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

describe('MCP Server Mode Detection and Bin Script', () => {
  const testProjectsDir = path.join(__dirname, 'init-test-projects');
  let projectName;
  let projectDir;

  beforeAll(() => {
    if (!fs.existsSync(testProjectsDir)) {
      fs.mkdirSync(testProjectsDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testProjectsDir)) {
      const projects = fs.readdirSync(testProjectsDir);
      projects.forEach(project => {
        const projectPath = path.join(testProjectsDir, project);
        if (fs.statSync(projectPath).isDirectory()) {
          fs.rmSync(projectPath, { recursive: true, force: true });
        }
      });
    }
  });

  beforeEach(() => {
    projectName = `test-mcp-mode-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    projectDir = path.join(testProjectsDir, projectName);
  });

  afterEach(() => {
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  const runInitCommand = (projectName) => {
    return new Promise((resolve, reject) => {
      // Change to test projects directory before running init
      const originalCwd = process.cwd();
      process.chdir(testProjectsDir);
      
      const { initProject } = require('../src/utils/cli/init-project');
      try {
        initProject(projectName);
        process.chdir(originalCwd);
        resolve({ success: true });
      } catch (error) {
        process.chdir(originalCwd);
        reject(error);
      }
    });
  };

  const runBinScript = (projectDir, env = {}) => {
    return new Promise((resolve, reject) => {
      const binScript = path.join(projectDir, 'bin', 'cli.js');
      if (!fs.existsSync(binScript)) {
        reject(new Error('Bin script not found'));
        return;
      }

      const proc = spawn('node', [binScript], {
        cwd: projectDir,
        env: { ...process.env, ...env },
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';
      let output = '';

      proc.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        output += text;
      });

      proc.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        output += text;
      });

      // Kill after 2 seconds to capture initial output
      const timeout = setTimeout(() => {
        proc.kill();
        resolve({ stdout, stderr, output, code: 0 });
      }, 2000);

      proc.on('close', (code) => {
        clearTimeout(timeout);
        resolve({ stdout, stderr, output, code });
      });

      proc.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  };

  describe('Bin Script Generation', () => {
    test('should create bin/cli.js with automatic mode detection', async () => {
      await runInitCommand(projectName);

      const binScriptPath = path.join(projectDir, 'bin', 'cli.js');
      expect(fs.existsSync(binScriptPath)).toBe(true);

      const content = fs.readFileSync(binScriptPath, 'utf8');
      expect(content).toContain('Detect STDIO mode');
      expect(content).toContain('EASY_MCP_SERVER_MCP_PORT');
      expect(content).toContain('EASY_MCP_SERVER_STDIO_MODE');
      expect(content).toContain('HTTP/Streamable');
      expect(content).toContain('STDIO');
    });

    test('should have correct usage documentation in bin script', async () => {
      await runInitCommand(projectName);

      const binScriptPath = path.join(projectDir, 'bin', 'cli.js');
      const content = fs.readFileSync(binScriptPath, 'utf8');

      expect(content).toContain('Automatically detects mode');
      expect(content).toContain('EASY_MCP_SERVER_STDIO_MODE=true: STDIO mode');
      expect(content).toContain('If EASY_MCP_SERVER_MCP_PORT is set: HTTP/Streamable mode');
      expect(content).toContain('If not set: STDIO mode');
    });
  });

  describe('Automatic Mode Detection - STDIO Mode', () => {
    test('should detect STDIO mode when no port is configured', async () => {
      await runInitCommand(projectName);

      // Remove or don't set MCP_PORT in .env
      const envPath = path.join(projectDir, '.env');
      let envContent = fs.readFileSync(envPath, 'utf8');
      // Remove MCP_PORT line if it exists
      envContent = envContent.split('\n')
        .filter(line => !line.includes('EASY_MCP_SERVER_MCP_PORT'))
        .join('\n');
      fs.writeFileSync(envPath, envContent);

      const result = await runBinScript(projectDir, {
        EASY_MCP_SERVER_MCP_PORT: '' // Explicitly unset
      });

      expect(result.output).toContain('MCP Server Mode: STDIO');
      expect(result.output).toContain('stdin/stdout');
      expect(result.output).toContain('JSON-RPC');
    });

    test('should log STDIO mode information correctly', async () => {
      await runInitCommand(projectName);

      const result = await runBinScript(projectDir, {
        EASY_MCP_SERVER_MCP_PORT: ''
      });

      // Check for messages with or without emojis (STDIO mode writes to stderr without emojis)
      expect(result.output).toMatch(/MCP Server Mode: STDIO/);
      expect(result.output).toMatch(/Communication: stdin\/stdout \(JSON-RPC\)/);
      expect(result.output).toMatch(/To use HTTP\/Streamable mode/);
    });

    test('should set EASY_MCP_SERVER_STDIO_MODE=true when in STDIO mode', async () => {
      await runInitCommand(projectName);

      // Mock the bin script execution to check environment variable
      const binScriptPath = path.join(projectDir, 'bin', 'cli.js');
      const originalRequire = require;

      // We'll check by reading the script and verifying logic
      const content = fs.readFileSync(binScriptPath, 'utf8');
      expect(content).toContain('EASY_MCP_SERVER_STDIO_MODE = \'true\'');
      expect(content).toContain('isStdioMode');
    });

    test('should respect explicit EASY_MCP_SERVER_STDIO_MODE=true even when port is set', async () => {
      await runInitCommand(projectName);

      // Set MCP_PORT in environment but also set explicit STDIO mode flag
      const result = await runBinScript(projectDir, {
        EASY_MCP_SERVER_MCP_PORT: '8888', // Port is set
        EASY_MCP_SERVER_STDIO_MODE: 'true' // But explicit STDIO mode should take precedence
      });

      // Should be in STDIO mode despite port being set
      expect(result.output).toContain('MCP Server Mode: STDIO');
      expect(result.output).toContain('stdin/stdout');
      expect(result.output).not.toContain('Port: 8888');
    });
  });

  describe('Automatic Mode Detection - HTTP/Streamable Mode', () => {
    test('should detect HTTP mode when port is configured in .env', async () => {
      await runInitCommand(projectName);

      // Set MCP_PORT in .env
      const envPath = path.join(projectDir, '.env');
      let envContent = fs.readFileSync(envPath, 'utf8');
      // Ensure MCP_PORT is set
      if (!envContent.includes('EASY_MCP_SERVER_MCP_PORT')) {
        envContent += '\nEASY_MCP_SERVER_MCP_PORT=9999\n';
      } else {
        envContent = envContent.replace(
          /EASY_MCP_SERVER_MCP_PORT=.*/,
          'EASY_MCP_SERVER_MCP_PORT=9999'
        );
      }
      fs.writeFileSync(envPath, envContent);

      const result = await runBinScript(projectDir, {
        EASY_MCP_SERVER_MCP_PORT: '9999'
      });

      expect(result.output).toContain('MCP Server Mode: HTTP/Streamable');
      expect(result.output).toContain('Port: 9999');
    });

    test('should log HTTP mode information correctly', async () => {
      await runInitCommand(projectName);

      const result = await runBinScript(projectDir, {
        EASY_MCP_SERVER_MCP_PORT: '8888'
      });

      expect(result.output).toContain('🔌 MCP Server Mode: HTTP/Streamable');
      expect(result.output).toContain('📡 Port: 8888');
      expect(result.output).toContain('🌐 HTTP endpoints will be available at:');
      expect(result.output).toContain('POST http://localhost:8888/mcp');
      expect(result.output).toContain('POST http://localhost:8888/');
      expect(result.output).toContain('GET  http://localhost:8888/sse');
    });

    test('should set host to 0.0.0.0 when in HTTP mode', async () => {
      await runInitCommand(projectName);

      const binScriptPath = path.join(projectDir, 'bin', 'cli.js');
      const content = fs.readFileSync(binScriptPath, 'utf8');
      
      expect(content).toContain('EASY_MCP_SERVER_MCP_HOST');
      expect(content).toContain('0.0.0.0');
    });

    test('should respect existing host configuration', async () => {
      await runInitCommand(projectName);

      const binScriptPath = path.join(projectDir, 'bin', 'cli.js');
      const content = fs.readFileSync(binScriptPath, 'utf8');
      
      // Should check if host is already set before setting default
      expect(content).toContain('if (!process.env.EASY_MCP_SERVER_MCP_HOST)');
    });
  });

  describe('Port Configuration Handling', () => {
    test('should detect port from .env file', async () => {
      await runInitCommand(projectName);

      const envPath = path.join(projectDir, '.env');
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(
        /EASY_MCP_SERVER_MCP_PORT=.*/,
        'EASY_MCP_SERVER_MCP_PORT=7777'
      );
      fs.writeFileSync(envPath, envContent);

      const result = await runBinScript(projectDir, {
        EASY_MCP_SERVER_MCP_PORT: '7777'
      });

      expect(result.output).toContain('Port: 7777');
    });

    test('should handle empty port string as no port', async () => {
      await runInitCommand(projectName);

      const result = await runBinScript(projectDir, {
        EASY_MCP_SERVER_MCP_PORT: ''
      });

      expect(result.output).toContain('MCP Server Mode: STDIO');
      // The help text mentions HTTP/Streamable, but the actual mode should be STDIO
      expect(result.output).toContain('stdin/stdout');
    });

    test('should handle whitespace-only port as no port', async () => {
      await runInitCommand(projectName);

      const result = await runBinScript(projectDir, {
        EASY_MCP_SERVER_MCP_PORT: '   '
      });

      expect(result.output).toContain('STDIO');
    });
  });

  describe('Package.json Scripts', () => {
    test('should include n8n:generate script in package.json', async () => {
      await runInitCommand(projectName);

      const packageJsonPath = path.join(projectDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts['n8n:generate']).toBeDefined();
      expect(packageJson.scripts['n8n:generate']).toContain('easy-mcp-server');
      expect(packageJson.scripts['n8n:generate']).toContain('n8n-server.js');
    });
  });
});

