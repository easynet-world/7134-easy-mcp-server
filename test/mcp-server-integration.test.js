/**
 * Integration Tests for MCP Server Features
 * Tests the complete flow from project init to MCP server functionality
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);

describe('MCP Server Integration Tests', () => {
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
    projectName = `test-mcp-integration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

  describe('Complete Project Setup', () => {
    test('should create project with all MCP server features', async () => {
      await runInitCommand(projectName);

      // Check bin script
      const binScript = path.join(projectDir, 'bin', 'cli.js');
      expect(fs.existsSync(binScript)).toBe(true);

      // Check package.json has n8n:generate
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
      expect(packageJson.scripts['n8n:generate']).toBeDefined();

      // Check build.sh has n8n generation
      const buildScript = fs.readFileSync(path.join(projectDir, 'build.sh'), 'utf8');
      expect(buildScript).toContain('n8n:generate');

      // Check README has MCP server documentation
      const readme = fs.readFileSync(path.join(projectDir, 'README.md'), 'utf8');
      expect(readme).toContain('MCP Server');
      expect(readme).toContain('STDIO Mode');
      expect(readme).toContain('HTTP/Streamable Mode');
    });

    test('should have correct TypeScript fixes in generated API files', async () => {
      await runInitCommand(projectName);

      const getFile = path.join(projectDir, 'api', 'example', 'get.ts');
      const postFile = path.join(projectDir, 'api', 'example', 'post.ts');

      const getContent = fs.readFileSync(getFile, 'utf8');
      const postContent = fs.readFileSync(postFile, 'utf8');

      expect(getContent).toContain('data!:');
      expect(postContent).toContain('message!:');
    });
  });

  describe('README Documentation', () => {
    test('README should document automatic mode detection', async () => {
      await runInitCommand(projectName);

      const readmePath = path.join(projectDir, 'README.md');
      const readme = fs.readFileSync(readmePath, 'utf8');

      expect(readme).toContain('automatically detects');
      expect(readme).toContain('EASY_MCP_SERVER_MCP_PORT');
      expect(readme).toContain('STDIO Mode');
      expect(readme).toContain('HTTP/Streamable Mode');
    });

    test('README should have transport mode comparison table', async () => {
      await runInitCommand(projectName);

      const readmePath = path.join(projectDir, 'README.md');
      const readme = fs.readFileSync(readmePath, 'utf8');

      expect(readme).toContain('Transport Mode Comparison');
      expect(readme).toContain('STDIO Mode');
      expect(readme).toContain('HTTP/Streamable Mode');
      expect(readme).toContain('Auto-detection');
    });

    test('README should document mcp-bridge.json usage', async () => {
      await runInitCommand(projectName);

      const readmePath = path.join(projectDir, 'README.md');
      const readme = fs.readFileSync(readmePath, 'utf8');

      expect(readme).toContain('mcp-bridge.json');
      expect(readme).toContain('command');
      expect(readme).toContain('args');
    });
  });

  describe('Package.json Configuration', () => {
    test('package.json should include all necessary scripts', async () => {
      await runInitCommand(projectName);

      const packageJsonPath = path.join(projectDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.scripts.start).toBeDefined();
      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts['n8n:generate']).toBeDefined();
    });

    test('package.json should have correct bin configuration', async () => {
      await runInitCommand(projectName);

      const packageJsonPath = path.join(projectDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.bin).toBeDefined();
      expect(packageJson.bin[projectName]).toBe('./bin/cli.js');
    });

    test('package.json files array should include all necessary directories', async () => {
      await runInitCommand(projectName);

      const packageJsonPath = path.join(projectDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.files).toBeDefined();
      expect(packageJson.files).toContain('bin/');
      expect(packageJson.files).toContain('api/');
      expect(packageJson.files).toContain('mcp/');
    });
  });
});

