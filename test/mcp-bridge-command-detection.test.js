/**
 * Test MCP bridge command detection and error handling for globally installed packages
 */

const MCPBridgeReloader = require('../src/utils/loaders/mcp-bridge-reloader');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');

describe('MCP Bridge Command Detection', () => {
  let tempDir;
  let projectDir;
  let mockLogger;

  beforeEach(() => {
    // Clean up any existing environment variables
    delete process.env.EASY_MCP_SERVER_BRIDGE_CONFIG_PATH;
    delete process.env.EASY_MCP_SERVER_TEST_MODE;
    
    // Create temporary directory structure
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-bridge-cmd-test-'));
    projectDir = path.join(tempDir, 'my-project');
    fs.mkdirSync(projectDir, { recursive: true });
    
    // Create package.json in project directory
    const packageJson = {
      name: 'my-project',
      dependencies: {
        'easy-mcp-server': '^1.0.0'
      }
    };
    fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    
    // Create mock logger
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn()
    };
  });

  afterEach(() => {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('commandExists', () => {
    test('should return true for existing commands', () => {
      const reloader = new MCPBridgeReloader({
        root: projectDir,
        logger: mockLogger
      });
      
      // Test with a command that should exist (node is always available)
      const exists = reloader.commandExists('node');
      expect(exists).toBe(true);
    });

    test('should return false for non-existent commands', () => {
      const reloader = new MCPBridgeReloader({
        root: projectDir,
        logger: mockLogger
      });
      
      // Test with a command that should not exist
      const exists = reloader.commandExists('nonexistent-command-xyz123');
      expect(exists).toBe(false);
    });

    test('should reject commands with special characters', () => {
      const reloader = new MCPBridgeReloader({
        root: projectDir,
        logger: mockLogger
      });
      
      // Test with commands containing special characters
      expect(reloader.commandExists('test;rm -rf')).toBe(false);
      expect(reloader.commandExists('test|ls')).toBe(false);
      expect(reloader.commandExists('test&rm')).toBe(false);
      expect(reloader.commandExists('test$(ls)')).toBe(false);
      expect(reloader.commandExists('test`ls`')).toBe(false);
    });

    test('should accept valid command names', () => {
      const reloader = new MCPBridgeReloader({
        root: projectDir,
        logger: mockLogger
      });
      
      // These should pass validation (even if command doesn't exist)
      expect(() => reloader.commandExists('test1')).not.toThrow();
      expect(() => reloader.commandExists('test-1')).not.toThrow();
      expect(() => reloader.commandExists('test_1')).not.toThrow();
      expect(() => reloader.commandExists('test123')).not.toThrow();
    });
  });

  describe('extractPackageName', () => {
    test('should extract package name from versioned spec', () => {
      const reloader = new MCPBridgeReloader({
        root: projectDir,
        logger: mockLogger
      });
      
      expect(reloader.extractPackageName('test1@1.0.0')).toBe('test1');
      expect(reloader.extractPackageName('test1@1.2.3')).toBe('test1');
      expect(reloader.extractPackageName('my-package@2.0.0')).toBe('my-package');
    });

    test('should extract package name without version', () => {
      const reloader = new MCPBridgeReloader({
        root: projectDir,
        logger: mockLogger
      });
      
      expect(reloader.extractPackageName('test1')).toBe('test1');
      expect(reloader.extractPackageName('my-package')).toBe('my-package');
    });

    test('should extract package name from scoped packages', () => {
      const reloader = new MCPBridgeReloader({
        root: projectDir,
        logger: mockLogger
      });
      
      expect(reloader.extractPackageName('@scope/test1@1.0.0')).toBe('test1');
      expect(reloader.extractPackageName('@my-org/my-package@2.0.0')).toBe('my-package');
    });

    test('should handle null and undefined', () => {
      const reloader = new MCPBridgeReloader({
        root: projectDir,
        logger: mockLogger
      });
      
      expect(reloader.extractPackageName(null)).toBeNull();
      expect(reloader.extractPackageName(undefined)).toBeNull();
    });
  });

  describe('Error handling logic for globally installed packages', () => {
    test('should correctly identify npx commands and extract package names', () => {
      const reloader = new MCPBridgeReloader({
        root: projectDir,
        logger: mockLogger
      });
      
      // Test the logic that would be used in error handling
      const command = 'npx';
      const args = ['-y', 'test1@1.0.0'];
      const isNpxCommand = command === 'npx' && args.length > 0 && args[0] === '-y';
      const packageSpec = isNpxCommand && args.length > 1 ? args[1] : null;
      const packageName = packageSpec ? reloader.extractPackageName(packageSpec) : null;
      
      expect(isNpxCommand).toBe(true);
      expect(packageSpec).toBe('test1@1.0.0');
      expect(packageName).toBe('test1');
    });

    test('should handle scoped package names correctly', () => {
      const reloader = new MCPBridgeReloader({
        root: projectDir,
        logger: mockLogger
      });
      
      const command = 'npx';
      const args = ['-y', '@scope/test1@1.0.0'];
      const isNpxCommand = command === 'npx' && args.length > 0 && args[0] === '-y';
      const packageSpec = isNpxCommand && args.length > 1 ? args[1] : null;
      const packageName = packageSpec ? reloader.extractPackageName(packageSpec) : null;
      
      expect(packageName).toBe('test1');
    });
  });
});

