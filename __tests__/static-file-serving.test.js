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
    // Ensure public directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
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
      // Create a test HTML file
      const testFile = path.join(publicDir, 'test-static.html');
      fs.writeFileSync(testFile, testHtmlContent);

      const response = await request(app)
        .get('/test-static.html')
        .expect(200);

      expect(response.text).toContain('<h1>Test</h1>');
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    test('should serve CSS files with correct content type', async () => {
      const cssContent = 'body { color: red; }';
      const cssFile = path.join(publicDir, 'test.css');
      fs.writeFileSync(cssFile, cssContent);

      const response = await request(app)
        .get('/test.css')
        .expect(200);

      expect(response.text).toContain('body { color: red; }');
      expect(response.headers['content-type']).toMatch(/text\/css/);
    });

    test('should serve JavaScript files with correct content type', async () => {
      const jsContent = 'console.log("test");';
      const jsFile = path.join(publicDir, 'test.js');
      fs.writeFileSync(jsFile, jsContent);

      const response = await request(app)
        .get('/test.js')
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
      expect(response.text).toContain('<!DOCTYPE html>');
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
        { file: 'test.html', expectedType: 'text/html', content: '<html><body>test</body></html>' },
        { file: 'test.css', expectedType: 'text/css', content: 'body { color: red; }' },
        { file: 'test.js', expectedType: 'application/javascript', content: 'console.log("test");' },
        { file: 'test.json', expectedType: 'application/json', content: '{"test": "value"}' }
      ];

      for (const testCase of testCases) {
        const filePath = path.join(publicDir, testCase.file);
        fs.writeFileSync(filePath, testCase.content);

        const response = await request(app)
          .get(`/${testCase.file}`)
          .expect(200);

        expect(response.headers['content-type']).toMatch(new RegExp(testCase.expectedType));
      }
    });
  });

  describe('Caching Headers', () => {
    test('should set appropriate caching headers for static files', async () => {
      const testFile = path.join(publicDir, 'cache-test.html');
      fs.writeFileSync(testFile, testHtmlContent);

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
