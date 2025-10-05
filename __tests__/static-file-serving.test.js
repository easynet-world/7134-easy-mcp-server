/**
 * Test cases for static file serving functionality
 * Static file serving is always enabled by default
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Create public directory and test files before importing the server
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Create test files before server initialization
const testFiles = [
  { name: 'test.html', content: '<html><body>test</body></html>' },
  { name: 'style.css', content: 'body { color: blue; }' },
  { name: 'app.js', content: 'console.log("test");' },
  { name: 'test.json', content: '{"test": "data"}' },
  { name: 'cache-test.html', content: '<html><body>Cache Test</body></html>' }
];

testFiles.forEach(file => {
  const filePath = path.join(publicDir, file.name);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, file.content);
  }
});

// Ensure the professional index.html exists
const indexPath = path.join(publicDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  fs.writeFileSync(indexPath, '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Test Index</h1></body></html>');
}

// Import server after files are set
const { app } = require('../src/server');

// Debug: Check if static file serving middleware is applied
console.log('🔍 Debug: Checking static file serving middleware...');
const middleware = app._router.stack;
console.log('🔍 Total middleware layers:', middleware.length);
console.log('🔍 Middleware layers:', middleware.map(layer => ({
  name: layer.name,
  regexp: layer.regexp ? layer.regexp.toString() : 'no regexp'
})));

const staticMiddleware = middleware.find(layer => 
  layer.name === 'serveStatic' || 
  (layer.regexp && layer.regexp.toString().includes('static'))
);
console.log('🔍 Static middleware found:', !!staticMiddleware);
if (staticMiddleware) {
  console.log('🔍 Static middleware details:', staticMiddleware.name, staticMiddleware.regexp);
} else {
  console.log('🔍 No static middleware found! This is the problem.');
}

describe('Static File Serving - CI', () => {
  const publicDir = path.join(__dirname, '..', 'public');

  afterAll(() => {
    // Clean up test files (but keep the professional index.html)
    const testFiles = ['test.html', 'style.css', 'app.js', 'test.json', 'cache-test.html'];
    testFiles.forEach(file => {
      const filePath = path.join(publicDir, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
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

      expect(response.text).toContain('🚀 Easy MCP Server');
      expect(response.headers['content-type']).toMatch(/text\/html/);
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
});
