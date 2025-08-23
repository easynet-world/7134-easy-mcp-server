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
  
  test('package.json should have required scripts', () => {
    const packageJson = require('../package.json');
    
    expect(packageJson.scripts.start).toBeDefined();
    expect(packageJson.scripts.test).toBeDefined();
    expect(packageJson.scripts.lint).toBeDefined();
    expect(packageJson.scripts['lint:fix']).toBeDefined();
  });
  
  test('package.json should have required dependencies', () => {
    const packageJson = require('../package.json');
    
    expect(packageJson.dependencies.express).toBeDefined();
    expect(packageJson.dependencies.cors).toBeDefined();
    expect(packageJson.dependencies.dotenv).toBeDefined();
  });
  
  test('package.json should have required devDependencies', () => {
    const packageJson = require('../package.json');
    
    expect(packageJson.devDependencies.jest).toBeDefined();
    expect(packageJson.devDependencies.eslint).toBeDefined();
    expect(packageJson.devDependencies['semantic-release']).toBeDefined();
  });
  
  test('should have GitHub Actions workflow', () => {
    const fs = require('fs');
    expect(fs.existsSync('.github/workflows/release.yml')).toBe(true);
  });
  
  test('should have semantic release configuration', () => {
    const fs = require('fs');
    expect(fs.existsSync('.releaserc')).toBe(true);
  });
});
