/**
 * Resource Handler
 * 
 * Handles loading and management of MCP resources from the filesystem.
 * Manages resource discovery, file parsing, MIME type detection,
 * template parameter extraction, and hot reloading.
 * 
 * Features:
 * - File system scanning for resource files
 * - Multiple format support (JSON, YAML, Markdown, images, text)
 * - MIME type detection by file extension
 * - Template parameter extraction ({{param}} syntax)
 * - Hot reloading via file watchers
 * - Integration with MCPCacheManager for caching
 * - Resource discovery from API routes
 * 
 * File Formats Supported:
 * - .json, .yaml, .yml: Structured formats
 * - .md, .txt: Text formats
 * - Images: .png, .jpg, .svg, etc.
 * - Any file type (with appropriate MIME type detection)
 * 
 * @class ResourceHandler
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const chokidar = require('chokidar');
const SimpleParameterParser = require('../../../utils/parsers/parameter-template-parser');

class ResourceHandler {
  constructor(resourcesMap, config, resolvedBasePath, cacheManager = null) {
    this.resources = resourcesMap;
    this.config = config;
    this.resolvedBasePath = resolvedBasePath;
    this.cacheManager = cacheManager;
    this.resourcesWatcher = null;
  }

  /**
   * Add a resource to the server
   */
  addResource(resource) {
    this.resources.set(resource.uri, resource);
    console.log('🔌 MCP Server: Added resource:', resource.uri);
  }

  /**
   * Discover resources from API routes
   */
  discoverResourcesFromRoutes(routes) {
    routes.forEach(route => {
      const processor = route.processorInstance;
      
      // Check if processor has resources
      if (processor && processor.resources) {
        processor.resources.forEach(resource => {
          this.addResource({
            uri: resource.uri || `${route.path}/resource`,
            name: resource.name || `${route.path} resource`,
            description: resource.description || `Resource for ${route.method} ${route.path}`,
            mimeType: resource.mimeType || 'text/plain',
            content: resource.content || ''
          });
        });
      }
    });
  }

  /**
   * Load resources from filesystem
   */
  async loadResourcesFromFilesystem() {
    try {
      // Load resources if enabled and cache manager is not available
      if (this.config.mcp.resources.enabled && !this.cacheManager) {
        const resourcesPath = path.resolve(this.resolvedBasePath, 'resources');
        await this.loadResourcesFromDirectory(resourcesPath);
      }
      
      console.log(`🔌 MCP Server: Loaded ${this.resources.size} resources from filesystem`);
      
      // Setup file watchers if enabled
      if (this.config.mcp.resources.watch && this.config.mcp.resources.enabled) {
        this.setupResourcesWatcher();
      }
    } catch (error) {
      console.warn('⚠️  MCP Server: Failed to load resources from filesystem:', error.message);
    }
  }

  /**
   * Load resources from a directory recursively
   */
  async loadResourcesFromDirectory(dirPath, baseDir = null) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const resourcesBase = baseDir || dirPath;
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively load subdirectories
          await this.loadResourcesFromDirectory(fullPath, resourcesBase);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          // Load any file format if '*' is specified, or check specific formats
          const shouldLoad = this.config.mcp.resources.formats.includes('*') || 
                           this.config.mcp.resources.formats.includes(ext.substring(1));
          
          if (shouldLoad) {
            await this.loadResourceFromFile(fullPath, resourcesBase);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read - this is normal
      console.log('🔌 MCP Server: No resources directory found or accessible');
    }
  }

  /**
   * Get MIME type for a file extension
   */
  getMimeTypeForExtension(ext) {
    switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.yaml':
    case '.yml': return 'application/x-yaml; charset=utf-8';
    case '.md': return 'text/markdown; charset=utf-8';
    case '.txt': return 'text/plain; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    default: return 'text/plain; charset=utf-8';
    }
  }

  /**
   * Load a single resource from a file
   */
  async loadResourceFromFile(filePath, baseDir = null) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      
      // Check if file extension is supported based on MCP server configuration
      const supportedFormats = this.config.mcp.resources.formats;
      if (!supportedFormats.includes('*')) {
        const supportedExtensions = supportedFormats.map(fmt => `.${fmt}`);
        if (!supportedExtensions.includes(ext)) {
          console.log(`🔌 MCP Server: Skipping unsupported file format: ${filePath} (${ext})`);
          return;
        }
      }
      
      const content = await fs.readFile(filePath, 'utf8');
      const resourcesBasePath = baseDir || path.resolve(this.resolvedBasePath, 'resources');
      const relativePath = path.relative(resourcesBasePath, filePath);
      
      // Generate URI from file path - use relative path, but clean up if it goes outside the resources directory
      let cleanRelativePath = relativePath;
      if (relativePath.startsWith('..')) {
        // If the path goes outside the resources directory, just use the filename
        cleanRelativePath = path.basename(filePath);
      } else {
        // Normalize the path to use forward slashes consistently
        cleanRelativePath = relativePath.replace(/\\/g, '/');
      }
      const uri = `resource://${cleanRelativePath}`;
      
      // Extract template parameters using the parameter parser
      const parsed = SimpleParameterParser.parse(content, path.basename(filePath));
      
      // Determine MIME type and process content based on file extension
      let mimeType = this.getMimeTypeForExtension(ext);
      let processedContent = content;
      let resourceName = null;
      let resourceDescription = null;
      
      // Try to parse structured formats for metadata extraction
      if (ext === '.json') {
        try {
          const jsonData = JSON.parse(content);
          processedContent = JSON.stringify(jsonData, null, 2);
          // Extract name and description from JSON if available
          if (jsonData.name) resourceName = jsonData.name;
          if (jsonData.description) resourceDescription = jsonData.description;
          if (jsonData.mimeType) mimeType = jsonData.mimeType;
        } catch (parseError) {
          console.warn(`⚠️  MCP Server: Invalid JSON in ${filePath}, treating as plain text`);
        }
      } else if (ext === '.yaml' || ext === '.yml') {
        try {
          const yamlData = yaml.load(content);
          processedContent = yaml.dump(yamlData, { indent: 2 });
          // Extract name and description from YAML if available
          if (yamlData.name) resourceName = yamlData.name;
          if (yamlData.description) resourceDescription = yamlData.description;
          if (yamlData.mimeType) mimeType = yamlData.mimeType;
        } catch (parseError) {
          console.warn(`⚠️  MCP Server: Invalid YAML in ${filePath}, treating as plain text`);
        }
      }
      
      // Generate name from file path if not provided in content
      // Use just the filename without extension for simple names
      const fileName = path.basename(filePath, path.extname(filePath));
      const name = resourceName || fileName;
      const description = resourceDescription || `Resource from ${path.basename(filePath)}`;
      
      const resource = {
        uri: uri,
        name: name,
        description: description,
        mimeType: mimeType,
        content: processedContent,
        // Add template support
        hasParameters: parsed.hasParameters,
        parameters: parsed.parameters,
        parameterCount: parsed.parameterCount,
        isTemplate: parsed.hasParameters,
        filePath: relativePath,
        format: parsed.format
      };
      
      this.addResource(resource);
    } catch (error) {
      console.warn(`⚠️  MCP Server: Failed to load resource from ${filePath}:`, error.message);
    }
  }

  /**
   * Setup file watcher for resources directory
   */
  setupResourcesWatcher(onChanged = null) {
    if (this.resourcesWatcher) {
      this.resourcesWatcher.close();
    }
    
    const resourcesPath = path.resolve(this.resolvedBasePath, 'resources');
    
    this.resourcesWatcher = chokidar.watch(resourcesPath, {
      ignored: /(^|[/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });
    
    this.resourcesWatcher
      .on('add', (filePath) => {
        console.log(`🔌 MCP Server: New resource file added: ${filePath}`);
        this.loadResourceFromFile(filePath, resourcesPath);
        if (onChanged) onChanged();
      })
      .on('change', (filePath) => {
        console.log(`🔌 MCP Server: Resource file changed: ${filePath}`);
        this.loadResourceFromFile(filePath, resourcesPath);
        if (onChanged) onChanged();
      })
      .on('unlink', (filePath) => {
        console.log(`🔌 MCP Server: Resource file removed: ${filePath}`);
        this.removeResourceByFilePath(filePath);
        if (onChanged) onChanged();
      })
      .on('error', (error) => {
        console.error('❌ MCP Server: Resources watcher error:', error);
      });
    
    console.log(`🔌 MCP Server: Watching resources directory: ${resourcesPath}`);
  }

  /**
   * Remove a resource by file path
   */
  removeResourceByFilePath(filePath) {
    const relativePath = path.relative(path.resolve(this.resolvedBasePath, 'resources'), filePath);
    // Clean up the relative path similar to how it's done in loadResourceFromFile
    let cleanRelativePath = relativePath;
    if (relativePath.startsWith('..')) {
      cleanRelativePath = path.basename(filePath);
    } else {
      cleanRelativePath = relativePath.replace(/\\/g, '/');
    }
    const uri = `resource://${cleanRelativePath}`;
    console.log(`🔌 MCP Server: Removing resource: ${uri} (from ${filePath})`);
    this.resources.delete(uri);
  }

  /**
   * Get all resources
   */
  getAllResources() {
    return Array.from(this.resources.values());
  }

  /**
   * Get a resource by URI
   */
  getResource(uri) {
    return this.resources.get(uri);
  }

  /**
   * Cleanup watcher
   */
  cleanup() {
    if (this.resourcesWatcher) {
      this.resourcesWatcher.close();
      this.resourcesWatcher = null;
    }
  }
}

module.exports = ResourceHandler;

