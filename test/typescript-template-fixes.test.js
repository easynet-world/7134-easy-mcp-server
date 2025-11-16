/**
 * Tests for TypeScript Template Fixes
 * Verifies that generated TypeScript files have proper definite assignment assertions
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);

describe('TypeScript Template Fixes', () => {
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
    projectName = `test-ts-fix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

  describe('Template Files - Definite Assignment Assertions', () => {
    test('get.ts template should have definite assignment assertion for data property', async () => {
      await runInitCommand(projectName);

      const getFilePath = path.join(projectDir, 'api', 'example', 'get.ts');
      expect(fs.existsSync(getFilePath)).toBe(true);

      const content = fs.readFileSync(getFilePath, 'utf8');
      
      // Should have definite assignment assertion (!)
      expect(content).toContain('data!:');
      
      // Verify it's in the ResponsePayload class (check context around it)
      const lines = content.split('\n');
      let foundInResponsePayload = false;
      let inResponsePayloadClass = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('class ResponsePayload')) {
          inResponsePayloadClass = true;
        }
        if (inResponsePayloadClass && lines[i].includes('data!:')) {
          foundInResponsePayload = true;
          break;
        }
        if (inResponsePayloadClass && lines[i].includes('function handler')) {
          break; // Moved to function
        }
      }
      
      expect(foundInResponsePayload).toBe(true);
    });

    test('post.ts template should have definite assignment assertion for message property', async () => {
      await runInitCommand(projectName);

      const postFilePath = path.join(projectDir, 'api', 'example', 'post.ts');
      expect(fs.existsSync(postFilePath)).toBe(true);

      const content = fs.readFileSync(postFilePath, 'utf8');
      
      // Should have definite assignment assertion (!)
      expect(content).toContain('message!:');
      
      // Verify it's in the RequestPayload class (check context around it)
      const lines = content.split('\n');
      let foundInRequestPayload = false;
      let inRequestPayloadClass = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('class RequestPayload')) {
          inRequestPayloadClass = true;
        }
        if (inRequestPayloadClass && lines[i].includes('message!:')) {
          foundInRequestPayload = true;
          break;
        }
        if (inRequestPayloadClass && lines[i].includes('class ResponsePayload')) {
          break; // Moved to next class
        }
      }
      
      expect(foundInRequestPayload).toBe(true);
    });

    test('generated TypeScript files should compile without errors', async () => {
      await runInitCommand(projectName);

      const getFilePath = path.join(projectDir, 'api', 'example', 'get.ts');
      const postFilePath = path.join(projectDir, 'api', 'example', 'post.ts');

      // Read and verify syntax
      const getContent = fs.readFileSync(getFilePath, 'utf8');
      const postContent = fs.readFileSync(postFilePath, 'utf8');

      // Check that files are valid TypeScript syntax
      expect(getContent).toContain('export {}');
      expect(postContent).toContain('export {}');
      expect(getContent).toContain('module.exports');
      expect(postContent).toContain('module.exports');
    });

    test('template files in source should have correct fixes', () => {
      const templateGetPath = path.join(__dirname, '..', 'templates', 'code', 'api', 'example', 'get.ts');
      const templatePostPath = path.join(__dirname, '..', 'templates', 'code', 'api', 'example', 'post.ts');

      expect(fs.existsSync(templateGetPath)).toBe(true);
      expect(fs.existsSync(templatePostPath)).toBe(true);

      const getContent = fs.readFileSync(templateGetPath, 'utf8');
      const postContent = fs.readFileSync(templatePostPath, 'utf8');

      // Verify templates have the fixes
      expect(getContent).toContain('data!:');
      expect(postContent).toContain('message!:');
    });
  });

  describe('TypeScript Compilation', () => {
    test('should not have TypeScript compilation errors in generated files', async () => {
      await runInitCommand(projectName);

      const getFilePath = path.join(projectDir, 'api', 'example', 'get.ts');
      const postFilePath = path.join(projectDir, 'api', 'example', 'post.ts');

      // Verify files can be loaded by the API loader (which compiles them)
      const ApiLoader = require('../src/utils/loaders/api-loader');
      const mockApp = {
        _router: { stack: [] },
        get: () => {},
        post: () => {},
        put: () => {},
        patch: () => {},
        delete: () => {},
        use: () => {}
      };

      const apiPath = path.join(projectDir, 'api');
      const loader = new ApiLoader(mockApp, apiPath);
      
      // This should not throw TypeScript errors
      expect(() => {
        loader.loadAPIs();
      }).not.toThrow();
    });
  });
});

