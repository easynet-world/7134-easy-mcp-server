describe('Framework Functionality', () => {
  test('should have proper project structure', () => {
    const fs = require('fs');
    
    // Check if essential files exist
    expect(fs.existsSync('server.js')).toBe(true);
    expect(fs.existsSync('package.json')).toBe(true);
    expect(fs.existsSync('.env.example')).toBe(true);
    
    // Check if API examples exist
    expect(fs.existsSync('api/example/get.js')).toBe(true);
    expect(fs.existsSync('api/example/post.js')).toBe(true);
    expect(fs.existsSync('api/example/put.js')).toBe(true);
    expect(fs.existsSync('api/example/patch.js')).toBe(true);
    expect(fs.existsSync('api/example/delete.js')).toBe(true);
  });
  
  test('should have src directory structure', () => {
    const fs = require('fs');
    
    // Check if src directory structure exists
    expect(fs.existsSync('src/core/api-loader.js')).toBe(true);
    expect(fs.existsSync('src/core/openapi-generator.js')).toBe(true);
    expect(fs.existsSync('src/mcp/mcp-server.js')).toBe(true);
    expect(fs.existsSync('src/utils/hot-reloader.js')).toBe(true);
  });
  
  test('package.json should have required scripts', () => {
    const packageJson = require('../package.json');
    
    expect(packageJson.scripts.start).toBeDefined();
    expect(packageJson.scripts.dev).toBeDefined();
    expect(packageJson.scripts.test).toBeDefined();
    expect(packageJson.scripts.lint).toBeDefined();
    expect(packageJson.scripts['lint:fix']).toBeDefined();
  });
  
  test('package.json should have required dependencies', () => {
    const packageJson = require('../package.json');
    
    expect(packageJson.dependencies.express).toBeDefined();
    expect(packageJson.dependencies.cors).toBeDefined();
    expect(packageJson.dependencies.dotenv).toBeDefined();
    expect(packageJson.dependencies.ws).toBeDefined();
    expect(packageJson.dependencies.chokidar).toBeDefined();
  });
  
  test('package.json should have required devDependencies', () => {
    const packageJson = require('../package.json');
    
    expect(packageJson.devDependencies.jest).toBeDefined();
    expect(packageJson.devDependencies.eslint).toBeDefined();
    expect(packageJson.devDependencies.nodemon).toBeDefined();
    // Note: semantic-release might not be in devDependencies
  });
  
  test('package.json should have correct name and description', () => {
    const packageJson = require('../package.json');
    
    expect(packageJson.name).toBe('easy-mcp');
    expect(packageJson.description).toContain('MCP');
    expect(packageJson.description).toContain('AI models');
  });
  
  test('should have GitHub Actions workflow', () => {
    const fs = require('fs');
    expect(fs.existsSync('.github/workflows/release.yml')).toBe(true);
  });
  
  test('should have semantic release configuration', () => {
    const fs = require('fs');
    expect(fs.existsSync('.releaserc')).toBe(true);
  });
  
  test('should have environment configuration files', () => {
    const fs = require('fs');
    expect(fs.existsSync('.env.example')).toBe(true);
    expect(fs.existsSync('.env')).toBe(true);
  });
});
