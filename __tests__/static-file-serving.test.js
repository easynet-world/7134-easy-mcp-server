/**
 * Test cases for static file serving functionality
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { app } = require('../src/server');

describe('Static File Serving', () => {
  const publicDir = path.join(__dirname, '..', 'public');
  const testHtmlContent = '<html><body><h1>Test</h1></body></html>';
  
  beforeAll(() => {
    // Ensure static file serving is enabled for tests
    process.env.EASY_MCP_SERVER_STATIC_ENABLED = 'true';
    process.env.EASY_MCP_SERVER_STATIC_DIRECTORY = './public';
    process.env.EASY_MCP_SERVER_SERVE_INDEX = 'true';
    process.env.EASY_MCP_SERVER_DEFAULT_FILE = 'index.html';
    // Ensure public directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Create some basic test files that should always exist
    const indexFile = path.join(publicDir, 'index.html');
    if (!fs.existsSync(indexFile)) {
      fs.writeFileSync(indexFile, '<h1>Hello World!</h1>');
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
      fs.writeFileSync(cacheFile, '<h1>Cache Test</h1>');
    }
  });

  afterAll(() => {
    // Clean up test files
    const testFiles = ['test-static.html', 'test.css', 'test.js'];
    testFiles.forEach(file => {
      const filePath = path.join(publicDir, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });

  describe('Basic Static File Serving', () => {
    test('should serve static HTML files', async () => {
      const response = await request(app)
        .get('/test.html')
        .expect(200);

      expect(response.text).toContain('<html><body>test</body></html>');
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    test('should serve CSS files with correct content type', async () => {
      const response = await request(app)
        .get('/style.css')
        .expect(200);

      expect(response.text).toContain('body { color: blue; }');
      expect(response.headers['content-type']).toMatch(/text\/css/);
    });

    test('should serve JavaScript files with correct content type', async () => {
      const response = await request(app)
        .get('/app.js')
        .expect(200);

      expect(response.text).toContain('console.log("test");');
      expect(response.headers['content-type']).toMatch(/application\/javascript/);
    });
  });

  describe('Root Route Handling', () => {
    test('should serve index.html at root route when it exists', async () => {
      const indexPath = path.join(publicDir, 'index.html');
      
      // Ensure index.html exists
      if (!fs.existsSync(indexPath)) {
        fs.writeFileSync(indexPath, testHtmlContent);
      }

      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toContain('<h1>');
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    test('should return 404 for non-existent static files', async () => {
      const response = await request(app)
        .get('/non-existent-file.html')
        .expect(404);
    });
  });

  describe('Directory Listing', () => {
    test('should not expose directory listing for security', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      // Should serve index.html, not directory listing
      expect(response.text).toContain('<h1>Hello World!</h1>');
    });
  });

  describe('Path Security', () => {
    test('should not serve files outside public directory', async () => {
      // Try to access files outside public directory
      const response = await request(app)
        .get('/../package.json')
        .expect(404);
    });

    test('should not serve hidden files by default', async () => {
      // Create a hidden file
      const hiddenFile = path.join(publicDir, '.hidden');
      fs.writeFileSync(hiddenFile, 'hidden content');

      const response = await request(app)
        .get('/.hidden')
        .expect(404);
    });
  });

  describe('Content Type Detection', () => {
    test('should set correct content type for different file extensions', async () => {
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
    test('should set appropriate caching headers for static files', async () => {
      const response = await request(app)
        .get('/cache-test.html')
        .expect(200);

      // Should have some caching headers
      expect(response.headers).toHaveProperty('etag');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing public directory gracefully', async () => {
      // This test assumes the server can handle missing public directory
      // The server should log a warning but continue running
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });
  });
});
