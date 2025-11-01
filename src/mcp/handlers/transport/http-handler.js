/**
 * HTTP Handler
 * 
 * Handles HTTP-based MCP protocol requests and transport layers.
 * Supports multiple transport protocols: standard HTTP POST, Server-Sent Events (SSE),
 * and StreamableHttp for MCP Inspector compatibility.
 * 
 * Features:
 * - HTTP POST MCP requests (/mcp endpoint)
 * - Server-Sent Events (SSE) for Inspector (/sse endpoint)
 * - StreamableHttp transport (POST / endpoint)
 * - Static file serving for MCP HTTP server
 * - CORS support for Inspector
 * - MCP info page serving
 * - Delegates actual processing to MCPRequestProcessor
 * 
 * Transport Protocols:
 * - Standard HTTP: POST /mcp with JSON-RPC 2.0 payloads
 * - SSE: GET /sse for real-time notifications
 * - StreamableHttp: POST / for Inspector compatibility
 * 
 * @class HTTPHandler
 */

const path = require('path');
const fs = require('fs');

class HTTPHandler {
  constructor(server, { processMCPRequest }) {
    this.server = server;
    this.processMCPRequest = processMCPRequest;

    // Load package.json version
    this.version = '1.0.0'; // Default fallback
    try {
      const packagePath = path.resolve(__dirname, '../../../package.json');
      if (fs.existsSync(packagePath)) {
        this.version = require(packagePath).version;
      }
    } catch (error) {
      // Use fallback version if package.json cannot be loaded
    }
  }

  /**
   * Handle HTTP requests
   */
  handleHTTPRequest(req, res) {
    // Set CORS headers for Inspector
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.url === '/sse' && req.method === 'GET') {
      this.handleSSEConnection(req, res, {
        httpClients: this.server.httpClients,
        cacheManager: this.server.cacheManager
      });
    } else if (req.url === '/mcp' && req.method === 'POST') {
      this.handleHTTPMCPRequest(req, res);
    } else if (req.url === '/' && req.method === 'POST') {
      // StreamableHttp transport
      this.handleStreamableHttpRequest(req, res);
    } else if (req.method === 'GET' && this.tryServeStatic(req, res, {
      getContentTypeByExt: (ext) => this.getContentTypeByExt(ext)
    })) {
      // served static file for non-root requests
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  /**
   * Handle HTTP MCP requests
   */
  handleHTTPMCPRequest(req, res) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        try {
          console.log('📨 MCP HTTP request:', data.method, data.params || data.arguments || {});
        } catch (_) { /* ignore */ }
        const response = await this.processMCPRequest(data);
        try {
          if (data.method === 'tools/list' && response && response.result && Array.isArray(response.result.tools)) {
            const usersGet = response.result.tools.find(t => t.name === 'api__users_get');
            console.log('🧰 tools/list -> total:', response.result.tools.length, 'users_get.query:', usersGet && usersGet.inputSchema && usersGet.inputSchema.properties && usersGet.inputSchema.properties.query);
          }
        } catch (_) { /* ignore */ }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  }

  /**
   * Handle StreamableHttp requests
   */
  handleStreamableHttpRequest(req, res) {
    console.log('🔌 New MCP StreamableHttp client connected');
    
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        console.log('📨 Received MCP request:', data.method);
        
        // Handle MCP initialization
        if (data.method === 'initialize') {
          const response = {
            jsonrpc: '2.0',
            id: data.id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {},
                prompts: {},
                resources: {}
              },
              serverInfo: {
                name: 'easy-mcp-server',
                version: this.version
              }
            }
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
          return;
        }
        
        // Handle other MCP requests
        const response = await this.processMCPRequest(data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  }

  /**
   * Handle SSE connection
   */
  handleSSEConnection(req, res, { httpClients }) {
    console.log('🔌 New MCP SSE client connected');
    
    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send MCP server initialization message
    const initMessage = {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          prompts: {},
          resources: {}
        },
        serverInfo: {
          name: 'easy-mcp-server',
          version: this.version
        }
      }
    };
    
    res.write(`data: ${JSON.stringify(initMessage)}\n\n`);

    // Store the response object for later use
    const clientId = Date.now().toString();
    httpClients.set(clientId, res);

    req.on('close', () => {
      console.log('🔌 MCP SSE client disconnected');
      httpClients.delete(clientId);
    });

    req.on('error', (error) => {
      // ECONNRESET/aborted is normal when clients disconnect
      if (error && (error.code === 'ECONNRESET' || error.message === 'aborted')) {
        console.log('🔌 MCP SSE client connection closed');
      } else {
        console.warn('⚠️  SSE connection issue:', error?.message || error);
      }
      httpClients.delete(clientId);
    });
  }

  /**
   * Handle MCP server info page
   */
  handleMCPInfoPage(req, res) {
    try {
      // Check for custom HTML file paths in order of priority:
      // 1. Environment variable MCP_INFO_HTML_PATH
      // 2. Custom file in project root (mcp-info.html)
      // 3. Default file in src/mcp directory
      const envHtmlPath = process.env.EASY_MCP_SERVER_MCP_INFO_HTML_PATH;
      const customHtmlPath = path.join(process.cwd(), 'mcp-info.html');
      const defaultHtmlPath = path.join(__dirname, '..', '..', '..', 'mcp-info.html');
      
      let htmlPath;
      
      if (envHtmlPath && fs.existsSync(envHtmlPath)) {
        htmlPath = envHtmlPath;
        console.log('🔧 Using custom MCP info page from environment:', htmlPath);
      } else if (fs.existsSync(customHtmlPath)) {
        htmlPath = customHtmlPath;
        console.log('🔧 Using custom MCP info page from project root:', htmlPath);
      } else {
        htmlPath = defaultHtmlPath;
        console.log('🔧 Using default MCP info page:', htmlPath);
      }
      
      const html = fs.readFileSync(htmlPath, 'utf8');
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } catch (error) {
      console.error('❌ Error reading MCP info page:', error);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('MCP info page not found');
    }
  }

  /**
   * Try to serve static files from public directory for MCP HTTP server
   */
  tryServeStatic(req, res, { getContentTypeByExt }) {
    try {
      const fsSync = require('fs');
      const staticDir = path.resolve(process.env.EASY_MCP_SERVER_STATIC_DIRECTORY || './public');
      const urlPath = decodeURIComponent(req.url.split('?')[0] || '/');
      let requestedPath = urlPath;
      if (requestedPath === '/') {
        requestedPath = (process.env.EASY_MCP_SERVER_DEFAULT_FILE || 'index.html');
      } else if (requestedPath.startsWith('/')) {
        requestedPath = requestedPath.slice(1);
      }
      const filePath = path.resolve(staticDir, requestedPath);
      if (!filePath.startsWith(staticDir)) {
        return false; // prevent path traversal
      }
      try {
        const stat = fsSync.statSync(filePath);
        if (stat.isDirectory()) {
          return false;
        }
        const data = fsSync.readFileSync(filePath);
        const contentType = getContentTypeByExt(path.extname(filePath).toLowerCase());
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
        return true;
      } catch (_err) {
        // Optional fallback: try example-project/public for test environments when enabled
        if (process.env.EASY_MCP_SERVER_STATIC_FALLBACK === '1') {
          try {
            const altDir = path.resolve('./example-project/public');
            const altPath = path.resolve(altDir, requestedPath);
            if (!altPath.startsWith(altDir)) return false;
            const stat2 = fsSync.statSync(altPath);
            if (stat2.isDirectory()) return false;
            const data2 = fsSync.readFileSync(altPath);
            const contentType2 = getContentTypeByExt(path.extname(altPath).toLowerCase());
            res.writeHead(200, { 'Content-Type': contentType2 });
            res.end(data2);
            return true;
          } catch (_) {
            return false;
          }
        }
        return false;
      }
    } catch (_) {
      return false;
    }
  }

  /**
   * Serve file if exists
   */
  serveFileIfExists(filePath, res, { getContentTypeByExt }) {
    const fs = require('fs').promises;
    return fs.stat(filePath)
      .then((stat) => {
        if (stat.isDirectory()) {
          // No directory listing
          return false;
        }
        return fs.readFile(filePath).then((data) => {
          const contentType = getContentTypeByExt(path.extname(filePath).toLowerCase());
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
          return true;
        });
      })
      .catch(() => false);
  }

  /**
   * Get content type by extension
   */
  getContentTypeByExt(ext) {
    switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    case '.ico': return 'image/x-icon';
    case '.txt': return 'text/plain; charset=utf-8';
    default: return 'application/octet-stream';
    }
  }
}

module.exports = HTTPHandler;

