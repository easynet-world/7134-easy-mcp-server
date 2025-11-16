/**
 * Tests for n8n Node Generation in Build Process
 * Verifies that build.sh includes n8n node generation step
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);

describe('Build Process - n8n Node Generation', () => {
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
    projectName = `test-build-n8n-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

  describe('Build Script - n8n Generation Step', () => {
    test('build.sh should include n8n node generation step', async () => {
      await runInitCommand(projectName);

      const buildScriptPath = path.join(projectDir, 'build.sh');
      expect(fs.existsSync(buildScriptPath)).toBe(true);

      const content = fs.readFileSync(buildScriptPath, 'utf8');
      
      expect(content).toContain('Generating n8n nodes');
      expect(content).toContain('n8n:generate');
      expect(content).toContain('./api');
    });

    test('build.sh should check for api directory before generating n8n nodes', async () => {
      await runInitCommand(projectName);

      const buildScriptPath = path.join(projectDir, 'build.sh');
      const content = fs.readFileSync(buildScriptPath, 'utf8');

      expect(content).toContain('[ -d "./api" ]');
      expect(content).toContain('ls -A ./api');
    });

    test('build.sh should handle n8n generation failure gracefully', async () => {
      await runInitCommand(projectName);

      const buildScriptPath = path.join(projectDir, 'build.sh');
      const content = fs.readFileSync(buildScriptPath, 'utf8');

      // Should continue even if n8n generation fails
      expect(content).toContain('Continuing anyway');
      expect(content).toContain('n8n node generation failed');
    });

    test('build.sh should show info message when no api directory exists', async () => {
      await runInitCommand(projectName);

      const buildScriptPath = path.join(projectDir, 'build.sh');
      const content = fs.readFileSync(buildScriptPath, 'utf8');

      expect(content).toContain('No API directory found');
      expect(content).toContain('Skipping n8n node generation');
    });

    test('build.sh should output n8n-nodes-output directory if generation succeeds', async () => {
      await runInitCommand(projectName);

      const buildScriptPath = path.join(projectDir, 'build.sh');
      const content = fs.readFileSync(buildScriptPath, 'utf8');

      expect(content).toContain('n8n-nodes-output');
      expect(content).toContain('Output directory');
    });
  });

  describe('Template Build Script', () => {
    test('template build.sh should have n8n generation step', () => {
      const templateBuildPath = path.join(__dirname, '..', 'templates', 'scripts', 'build.sh');
      expect(fs.existsSync(templateBuildPath)).toBe(true);

      const content = fs.readFileSync(templateBuildPath, 'utf8');
      
      expect(content).toContain('Generating n8n nodes');
      expect(content).toContain('n8n:generate');
    });
  });

  describe('Main Build Script', () => {
    test('main build.sh should have n8n generation step', () => {
      const mainBuildPath = path.join(__dirname, '..', 'build.sh');
      expect(fs.existsSync(mainBuildPath)).toBe(true);

      const content = fs.readFileSync(mainBuildPath, 'utf8');
      
      expect(content).toContain('Generating n8n nodes');
      expect(content).toContain('n8n:generate');
    });

    test('main build.sh should handle no api directory gracefully', () => {
      const mainBuildPath = path.join(__dirname, '..', 'build.sh');
      const content = fs.readFileSync(mainBuildPath, 'utf8');

      expect(content).toContain('No API directory found');
      expect(content).toContain('This is normal for the main package');
    });
  });
});

