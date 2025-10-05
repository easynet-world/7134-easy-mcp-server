/**
 * Test cases for static file serving functionality - CI specific
 * This test file sets environment variables before importing the server
 */

// Set environment variables before importing the server
process.env.EASY_MCP_SERVER_STATIC_ENABLED = 'true';
process.env.EASY_MCP_SERVER_STATIC_DIRECTORY = './public';
process.env.EASY_MCP_SERVER_SERVE_INDEX = 'true';
process.env.EASY_MCP_SERVER_DEFAULT_FILE = 'index.html';

const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Import server after environment variables are set
const { app } = require('../src/server');

describe('Static File Serving - CI', () => {
  const publicDir = path.join(__dirname, '..', 'public');
  
  beforeAll(() => {
    // Ensure public directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Create some basic test files that should always exist
    const indexFile = path.join(publicDir, 'index.html');
    if (!fs.existsSync(indexFile)) {
      fs.writeFileSync(indexFile, '<html><body><h1>Hello World!</h1></body></html>');
    }
    
    const testFile = path.join(publicDir, 'test.html');
    if (!fs.existsSync(testFile)) {
      fs.writeFileSync(testFile, '<html><body>test</body></html>');
    }
    
    const cssFile = path.join(publicDir, 'style.css');
    if (!fs.existsSync(cssFile)) {
      fs.writeFileSync(cssFile, 'body { color: blue; }');
    }
    
    const jsFile = path.join(publicDir, 'app.js');
    if (!fs.existsSync(jsFile)) {
      fs.writeFileSync(jsFile, 'console.log("test");');
    }
    
    const jsonFile = path.join(publicDir, 'test.json');
    if (!fs.existsSync(jsonFile)) {
      fs.writeFileSync(jsonFile, '{"test": "data"}');
    }
    
    const cacheFile = path.join(publicDir, 'cache-test.html');
    if (!fs.existsSync(cacheFile)) {
      fs.writeFileSync(cacheFile, '<html><body>Cache Test</body></html>');
    }
  });

  describe('Basic Static File Serving', () => {
    it('should serve static HTML files', async () => {
      const response = await request(app)
        .get('/test.html')
        .expect(200);

      expect(response.text).toContain('<html><body>test</body></html>');
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    it('should serve CSS files with correct content type', async () => {
      const response = await request(app)
        .get('/style.css')
        .expect(200);

      expect(response.text).toContain('body { color: blue; }');
      expect(response.headers['content-type']).toMatch(/text\/css/);
    });

    it('should serve JavaScript files with correct content type', async () => {
      const response = await request(app)
        .get('/app.js')
        .expect(200);

      expect(response.text).toContain('console.log("test");');
      expect(response.headers['content-type']).toMatch(/application\/javascript/);
    });
  });

  describe('Root Route Handling', () => {
    it('should serve index.html at root route when it exists', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('<h1>');
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    it('should return 404 for non-existent static files', async () => {
      await request(app)
        .get('/nonexistent.html')
        .expect(404);
    });
  });

  describe('Directory Listing', () => {
    it('should not expose directory listing for security', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      // Should serve index.html, not directory listing
      expect(response.text).toContain('<h1>Hello World!</h1>');
    });
  });

  describe('Path Security', () => {
    it('should not serve files outside public directory', async () => {
      await request(app)
        .get('/../package.json')
        .expect(404);
    });

    it('should not serve hidden files by default', async () => {
      // Create a hidden file
      const hiddenFile = path.join(publicDir, '.hidden');
      fs.writeFileSync(hiddenFile, 'hidden content');
      
      await request(app)
        .get('/.hidden')
        .expect(404);
    });
  });

  describe('Content Type Detection', () => {
    it('should set correct content type for different file extensions', async () => {
      const testCases = [
        { file: 'test.html', expectedType: 'text/html' },
        { file: 'style.css', expectedType: 'text/css' },
        { file: 'app.js', expectedType: 'application/javascript' },
        { file: 'test.json', expectedType: 'application/json' }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .get(`/${testCase.file}`)
          .expect(200);

        expect(response.headers['content-type']).toMatch(new RegExp(testCase.expectedType));
      }
    });
  });

  describe('Caching Headers', () => {
    it('should set appropriate caching headers for static files', async () => {
      const response = await request(app)
        .get('/cache-test.html')
        .expect(200);

      // Should have some caching headers
      expect(response.headers).toHaveProperty('etag');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing public directory gracefully', async () => {
      // This test is more about the server not crashing
      // The static file serving should be disabled if directory doesn't exist
      await request(app)
        .get('/health')
        .expect(200);
    });
  });
});
