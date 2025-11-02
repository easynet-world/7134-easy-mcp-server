/**
 * Tests for easy-mcp-server init command
 * Verifies that project generation works correctly
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

describe('easy-mcp-server init command', () => {
  const testProjectsDir = path.join(__dirname, 'init-test-projects');
  let projectName;
  let projectDir;

  beforeAll(() => {
    // Create test projects directory if it doesn't exist
    if (!fs.existsSync(testProjectsDir)) {
      fs.mkdirSync(testProjectsDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test projects directory
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
    // Generate unique project name for each test
    projectName = `test-project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    projectDir = path.join(testProjectsDir, projectName);
  });

  afterEach(() => {
    // Clean up project directory after each test
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  const runInitCommand = (projectName) => {
    return new Promise((resolve, reject) => {
      const cliPath = path.join(__dirname, '..', 'src', 'easy-mcp-server.js');
      const initProcess = spawn('node', [cliPath, 'init', projectName], {
        cwd: testProjectsDir,
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      initProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      initProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      initProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Init command failed with code ${code}. stderr: ${stderr}`));
        }
      });

      initProcess.on('error', (error) => {
        reject(error);
      });
    });
  };

  test('should create project directory', async () => {
    await runInitCommand(projectName);
    
    expect(fs.existsSync(projectDir)).toBe(true);
    const stats = await stat(projectDir);
    expect(stats.isDirectory()).toBe(true);
  });

  test('should create package.json with correct structure', async () => {
    await runInitCommand(projectName);

    const packageJsonPath = path.join(projectDir, 'package.json');
    expect(fs.existsSync(packageJsonPath)).toBe(true);

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(packageJson.name).toBe(projectName);
    expect(packageJson.version).toBe('1.0.0');
    expect(packageJson.main).toBe('index.js');
    expect(packageJson.scripts).toBeDefined();
    expect(packageJson.scripts.start).toBe('./start.sh');
    expect(packageJson.scripts.dev).toBe('easy-mcp-server');
    expect(packageJson.scripts.test).toBe('jest');
    expect(packageJson.scripts.build).toBe('./build.sh');
    expect(packageJson.scripts.stop).toBe('./stop.sh');
    expect(packageJson.scripts['start:direct']).toBe('easy-mcp-server');
    expect(packageJson.scripts['start:npx']).toBe('npx easy-mcp-server');
    expect(packageJson.dependencies).toBeDefined();
    expect(packageJson.dependencies['easy-mcp-server']).toBeDefined();

    // Check TypeScript dependencies
    expect(packageJson.devDependencies).toBeDefined();
    expect(packageJson.devDependencies['typescript']).toBeDefined();
    expect(packageJson.devDependencies['@types/express']).toBeDefined();
    expect(packageJson.devDependencies['@types/node']).toBeDefined();
    expect(packageJson.devDependencies['ts-jest']).toBeDefined();
    expect(packageJson.devDependencies['ts-node']).toBeDefined();
  });

  test('should create index.js file', async () => {
    await runInitCommand(projectName);
    
    const indexPath = path.join(projectDir, 'index.js');
    expect(fs.existsSync(indexPath)).toBe(true);
    
    const content = fs.readFileSync(indexPath, 'utf8');
    expect(content).toContain('BaseAPI');
    expect(content).toContain('easy-mcp-server');
  });

  test('should create .env file with default configuration', async () => {
    await runInitCommand(projectName);
    
    const envPath = path.join(projectDir, '.env');
    expect(fs.existsSync(envPath)).toBe(true);
    
    const content = fs.readFileSync(envPath, 'utf8');
    expect(content).toContain('EASY_MCP_SERVER_PORT=8887');
    expect(content).toContain('EASY_MCP_SERVER_MCP_PORT=8888');
  });

  test('should create .gitignore file', async () => {
    await runInitCommand(projectName);
    
    const gitignorePath = path.join(projectDir, '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(true);
    
    const content = fs.readFileSync(gitignorePath, 'utf8');
    expect(content).toContain('node_modules');
    expect(content).toContain('.env');
    expect(content).toContain('*.tgz');
  });

  test('should create README.md file', async () => {
    await runInitCommand(projectName);

    const readmePath = path.join(projectDir, 'README.md');
    expect(fs.existsSync(readmePath)).toBe(true);

    const content = fs.readFileSync(readmePath, 'utf8');
    expect(content).toContain(projectName);
    expect(content).toContain('Easy MCP Server');
  });

  test('should create tsconfig.json with correct configuration', async () => {
    await runInitCommand(projectName);

    const tsconfigPath = path.join(projectDir, 'tsconfig.json');
    expect(fs.existsSync(tsconfigPath)).toBe(true);

    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    expect(tsconfig.compilerOptions).toBeDefined();
    expect(tsconfig.compilerOptions.target).toBe('ES2020');
    expect(tsconfig.compilerOptions.module).toBe('commonjs');
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.esModuleInterop).toBe(true);
    expect(tsconfig.include).toContain('api/**/*');
    expect(tsconfig.include).toContain('test/**/*');
    expect(tsconfig.exclude).toContain('node_modules');
  });

  test('should create jest.config.js for TypeScript', async () => {
    await runInitCommand(projectName);

    const jestConfigPath = path.join(projectDir, 'jest.config.js');
    expect(fs.existsSync(jestConfigPath)).toBe(true);

    const content = fs.readFileSync(jestConfigPath, 'utf8');
    expect(content).toContain('ts-jest');
    expect(content).toContain('testEnvironment');
    expect(content).toContain('**/*.test.ts');
  });

  test('should create build.sh script', async () => {
    await runInitCommand(projectName);
    
    const buildScriptPath = path.join(projectDir, 'build.sh');
    expect(fs.existsSync(buildScriptPath)).toBe(true);
    
    // Check file is executable (on Unix systems)
    const stats = await stat(buildScriptPath);
    const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
    expect(isExecutable || process.platform === 'win32').toBe(true);
    
    // Check file content
    const content = fs.readFileSync(buildScriptPath, 'utf8');
    expect(content).toContain('#!/bin/bash');
    expect(content).toContain('Building npm package');
    expect(content).toContain('npm pack');
    expect(content).toContain('PACK_FILENAME');
  });

  test('should create start.sh script', async () => {
    await runInitCommand(projectName);
    
    const startScriptPath = path.join(projectDir, 'start.sh');
    expect(fs.existsSync(startScriptPath)).toBe(true);
    
    const stats = await stat(startScriptPath);
    const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
    expect(isExecutable || process.platform === 'win32').toBe(true);
    
    const content = fs.readFileSync(startScriptPath, 'utf8');
    expect(content).toContain('#!/bin/bash');
    expect(content).toContain('easy-mcp-server');
  });

  test('should create stop.sh script', async () => {
    await runInitCommand(projectName);
    
    const stopScriptPath = path.join(projectDir, 'stop.sh');
    expect(fs.existsSync(stopScriptPath)).toBe(true);
    
    const stats = await stat(stopScriptPath);
    const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
    expect(isExecutable || process.platform === 'win32').toBe(true);
    
    const content = fs.readFileSync(stopScriptPath, 'utf8');
    expect(content).toContain('#!/bin/bash');
    expect(content).toContain('Stopping Easy MCP Server');
  });

  test('should create mcp-bridge.json file', async () => {
    await runInitCommand(projectName);
    
    const bridgePath = path.join(projectDir, 'mcp-bridge.json');
    expect(fs.existsSync(bridgePath)).toBe(true);
    
    const bridgeConfig = JSON.parse(fs.readFileSync(bridgePath, 'utf8'));
    expect(bridgeConfig.mcpServers).toBeDefined();
    expect(bridgeConfig.mcpServers['chrome-devtools']).toBeDefined();
  });

  test('should create api directory with example files', async () => {
    await runInitCommand(projectName);

    const apiDir = path.join(projectDir, 'api');
    expect(fs.existsSync(apiDir)).toBe(true);

    const exampleDir = path.join(apiDir, 'example');
    expect(fs.existsSync(exampleDir)).toBe(true);

    const getFile = path.join(exampleDir, 'get.ts');
    const postFile = path.join(exampleDir, 'post.ts');

    expect(fs.existsSync(getFile)).toBe(true);
    expect(fs.existsSync(postFile)).toBe(true);

    const getContent = fs.readFileSync(getFile, 'utf8');
    const postContent = fs.readFileSync(postFile, 'utf8');

    expect(getContent).toContain('Request');
    expect(getContent).toContain('Response');
    expect(getContent).toContain('handler');
    expect(postContent).toContain('Request');
    expect(postContent).toContain('Response');
    expect(postContent).toContain('handler');
  });

  test('should create mcp directory structure', async () => {
    await runInitCommand(projectName);
    
    const mcpDir = path.join(projectDir, 'mcp');
    expect(fs.existsSync(mcpDir)).toBe(true);
    
    const promptsDir = path.join(mcpDir, 'prompts');
    const resourcesDir = path.join(mcpDir, 'resources');
    
    expect(fs.existsSync(promptsDir)).toBe(true);
    expect(fs.existsSync(resourcesDir)).toBe(true);
    
    // Check for example files
    const examplePrompt = path.join(promptsDir, 'example-analysis.md');
    const exampleResource = path.join(resourcesDir, 'api-documentation.md');
    
    expect(fs.existsSync(examplePrompt)).toBe(true);
    expect(fs.existsSync(exampleResource)).toBe(true);
  });

  test('should create public directory with index.html', async () => {
    await runInitCommand(projectName);
    
    const publicDir = path.join(projectDir, 'public');
    expect(fs.existsSync(publicDir)).toBe(true);
    
    const indexHtml = path.join(publicDir, 'index.html');
    expect(fs.existsSync(indexHtml)).toBe(true);
    
    const content = fs.readFileSync(indexHtml, 'utf8');
    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain(projectName);
  });

  test('should create test directory with test file', async () => {
    await runInitCommand(projectName);

    const testDir = path.join(projectDir, 'test');
    expect(fs.existsSync(testDir)).toBe(true);

    const testFile = path.join(testDir, 'server.test.ts');
    expect(fs.existsSync(testFile)).toBe(true);

    const content = fs.readFileSync(testFile, 'utf8');
    expect(content).toContain('describe');
    expect(content).toContain('test');
    expect(content).toContain('import');
  });

  test('should fail if project directory already exists', async () => {
    // Create directory first
    fs.mkdirSync(projectDir, { recursive: true });
    
    await expect(runInitCommand(projectName)).rejects.toThrow();
  });

  test('should create all required files for npm package build', async () => {
    await runInitCommand(projectName);
    
    const requiredFiles = [
      'package.json',
      'index.js',
      '.env',
      '.gitignore',
      'README.md',
      'build.sh',
      'start.sh',
      'stop.sh',
      'mcp-bridge.json'
    ];
    
    requiredFiles.forEach(file => {
      const filePath = path.join(projectDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  test('build.sh should have correct structure for npm packaging', async () => {
    await runInitCommand(projectName);
    
    const buildScriptPath = path.join(projectDir, 'build.sh');
    const content = fs.readFileSync(buildScriptPath, 'utf8');
    
    // Check for key sections
    expect(content).toContain('npm pack');
    expect(content).toContain('PACK_FILENAME');
    expect(content).toContain('npm install');
    expect(content).toContain('Running tests');
    expect(content).toContain('Publish to npm registry');
    expect(content).toContain('Publish to GitHub Packages');
    
    // Check for proper error handling
    expect(content).toContain('if [ $? -ne 0 ]');
    expect(content).toContain('exit 1');
  });

  test('should generate project with default name when no name provided', async () => {
    const defaultName = 'easy-mcp-project';
    const defaultProjectDir = path.join(testProjectsDir, defaultName);
    
    // Clean up if exists
    if (fs.existsSync(defaultProjectDir)) {
      fs.rmSync(defaultProjectDir, { recursive: true, force: true });
    }
    
    try {
      // Call init without project name (just 'init' command)
      const cliPath = path.join(__dirname, '..', 'src', 'easy-mcp-server.js');
      await new Promise((resolve, reject) => {
        const initProcess = spawn('node', [cliPath, 'init'], {
          cwd: testProjectsDir,
          stdio: 'pipe'
        });

        let stdout = '';
        let stderr = '';

        initProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        initProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        initProcess.on('close', (code) => {
          if (code === 0) {
            resolve({ stdout, stderr, code });
          } else {
            reject(new Error(`Init command failed with code ${code}. stderr: ${stderr}`));
          }
        });

        initProcess.on('error', (error) => {
          reject(error);
        });
      });
      
      expect(fs.existsSync(defaultProjectDir)).toBe(true);
      
      const packageJsonPath = path.join(defaultProjectDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      expect(packageJson.name).toBe(defaultName);
    } finally {
      // Clean up
      if (fs.existsSync(defaultProjectDir)) {
        fs.rmSync(defaultProjectDir, { recursive: true, force: true });
      }
    }
  });
});

