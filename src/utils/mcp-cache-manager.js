/**
 * MCP Cache Manager - Intelligent caching with hot swapping
 * 
 * Manages in-memory caching of prompts and resources with automatic
 * hot swapping when files change. Provides efficient access to parsed
 * content while maintaining real-time updates.
 */
/* eslint-disable indent, no-useless-escape */

const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');
const SimpleParameterParser = require('./parameter-template-parser');

class MCPCacheManager {
  constructor(basePath = './mcp', options = {}) {
    this.basePath = path.resolve(basePath);
    this.logger = options.logger || null;
    this.enableHotReload = options.enableHotReload !== false;
    
    // Cache storage
    this.promptsCache = new Map(); // filePath -> parsed prompt
    this.resourcesCache = new Map(); // filePath -> parsed resource
    this.fileTimestamps = new Map(); // filePath -> last modified time
    
    // File watchers
    this.watchers = new Map();
    
    // Statistics
    this.stats = {
      prompts: { total: 0, cached: 0, hits: 0, misses: 0 },
      resources: { total: 0, cached: 0, hits: 0, misses: 0 },
      lastUpdate: null
    };
    
    // Initialize hot reload if enabled
    if (this.enableHotReload) {
      this.initializeHotReload();
    }
  }

  /**
   * Initialize hot reload file watching
   */
  initializeHotReload() {
    this.log('info', 'Initializing MCP cache hot reload...');
    
    // Watch prompts directory
    const promptsWatcher = chokidar.watch(path.join(this.basePath, 'prompts'), {
      ignored: /(^|[\\/])\../,
      persistent: true,
      ignoreInitial: true
    });

    // Watch resources directory
    const resourcesWatcher = chokidar.watch(path.join(this.basePath, 'resources'), {
      ignored: /(^|[\\/])\../,
      persistent: true,
      ignoreInitial: true
    });

    promptsWatcher
      .on('add', (filePath) => this.handleFileChange('prompts', 'add', filePath))
      .on('change', (filePath) => this.handleFileChange('prompts', 'change', filePath))
      .on('unlink', (filePath) => this.handleFileChange('prompts', 'unlink', filePath));

    resourcesWatcher
      .on('add', (filePath) => this.handleFileChange('resources', 'add', filePath))
      .on('change', (filePath) => this.handleFileChange('resources', 'change', filePath))
      .on('unlink', (filePath) => this.handleFileChange('resources', 'unlink', filePath));

    this.watchers.set('prompts', promptsWatcher);
    this.watchers.set('resources', resourcesWatcher);
    
    this.log('info', 'MCP cache hot reload active');
  }

  /**
   * Handle file changes for hot swapping
   * @param {string} type - 'prompts' or 'resources'
   * @param {string} event - File event (add, change, unlink)
   * @param {string} filePath - Path to changed file
   */
  async handleFileChange(type, event, filePath) {
    // Check if file has a supported extension
    const ext = path.extname(filePath).toLowerCase();
    const supportedExtensions = SimpleParameterParser.getSupportedExtensions();
    if (!supportedExtensions.includes(ext)) return;
    
    const relativePath = path.relative(this.basePath, filePath);
    const cache = type === 'prompts' ? this.promptsCache : this.resourcesCache;
    
    switch (event) {
      case 'add':
      case 'change':
        this.log('info', `${type} file ${event}: ${relativePath}`);
        // Remove from cache to force reload
        cache.delete(relativePath);
        this.fileTimestamps.delete(relativePath);
        break;
      case 'unlink':
        this.log('info', `${type} file removed: ${relativePath}`);
        cache.delete(relativePath);
        this.fileTimestamps.delete(relativePath);
        break;
    }
    
    this.stats.lastUpdate = new Date();
  }

  /**
   * Get all prompts with caching
   * @returns {Promise<Array<Object>>} Array of parsed prompts
   */
  async getPrompts() {
    try {
      const promptsDir = path.join(this.basePath, 'prompts');
      const files = await fs.readdir(promptsDir, { withFileTypes: true });
      const supportedExtensions = SimpleParameterParser.getSupportedExtensions();
      
      const promptFiles = files
        .filter(file => {
          if (!file.isFile()) return false;
          const ext = path.extname(file.name).toLowerCase();
          return supportedExtensions.includes(ext);
        })
        .map(file => path.join('prompts', file.name));
      
      const results = [];
      for (const filePath of promptFiles) {
        const prompt = await this.getPrompt(filePath);
        if (prompt && !prompt.error) {
          results.push(prompt);
        }
      }
      
      this.stats.prompts.total = results.length;
      this.stats.prompts.cached = this.promptsCache.size;
      
      return results;
    } catch (error) {
      this.log('error', `Failed to get prompts: ${error.message}`);
      return [];
    }
  }

  /**
   * Get all resources with caching
   * @returns {Promise<Array<Object>>} Array of parsed resources
   */
  async getResources() {
    try {
      const resourcesDir = path.join(this.basePath, 'resources');
      const files = await fs.readdir(resourcesDir, { withFileTypes: true });
      const supportedExtensions = SimpleParameterParser.getSupportedExtensions();
      
      const resourceFiles = files
        .filter(file => {
          if (!file.isFile()) return false;
          const ext = path.extname(file.name).toLowerCase();
          return supportedExtensions.includes(ext);
        })
        .map(file => path.join('resources', file.name));
      
      const results = [];
      for (const filePath of resourceFiles) {
        const resource = await this.getResource(filePath);
        if (resource && !resource.error) {
          results.push(resource);
        }
      }
      
      this.stats.resources.total = results.length;
      this.stats.resources.cached = this.resourcesCache.size;
      
      return results;
    } catch (error) {
      this.log('error', `Failed to get resources: ${error.message}`);
      return [];
    }
  }

  /**
   * Get a specific prompt with caching
   * @param {string} filePath - Relative file path
   * @returns {Promise<Object>} Parsed prompt or null
   */
  async getPrompt(filePath) {
    try {
      // Check cache first
      if (this.promptsCache.has(filePath)) {
        this.stats.prompts.hits++;
        return this.promptsCache.get(filePath);
      }
      
      this.stats.prompts.misses++;
      
      // Load and parse file
      const fullPath = path.join(this.basePath, filePath);
      const content = await fs.readFile(fullPath, 'utf8');
      const fileName = path.basename(filePath);
      
      const parsed = SimpleParameterParser.parse(content, fileName);
      
      // Cache all prompts, with or without parameters
      const prompt = {
        name: parsed.name,
        description: parsed.hasParameters 
          ? `${parsed.format} prompt with ${parsed.parameterCount} parameters`
          : `${parsed.format} prompt`,
        arguments: parsed.parameters.map(param => ({
          name: param,
          type: 'string',
          description: `The ${param} parameter`
        })),
        source: parsed.format,
        parameterCount: parsed.parameterCount,
        parameters: parsed.parameters, // Add parameters array
        content: parsed.content,
        filePath: filePath,
        format: parsed.format,
        hasParameters: parsed.hasParameters
      };
      
      // Cache the result
      this.promptsCache.set(filePath, prompt);
      this.fileTimestamps.set(filePath, Date.now());
      
      return prompt;
    } catch (error) {
      this.log('warn', `Failed to load prompt ${filePath}: ${error.message}`);
      return { error: error.message, filePath };
    }
  }

  /**
   * Get a specific resource with caching
   * @param {string} filePath - Relative file path
   * @returns {Promise<Object>} Parsed resource or null
   */
  async getResource(filePath) {
    try {
      // Check cache first
      if (this.resourcesCache.has(filePath)) {
        this.stats.resources.hits++;
        return this.resourcesCache.get(filePath);
      }
      
      this.stats.resources.misses++;
      
      // Load and parse file
      const fullPath = path.join(this.basePath, filePath);
      const content = await fs.readFile(fullPath, 'utf8');
      const fileName = path.basename(filePath);
      
      const parsed = SimpleParameterParser.parse(content, fileName);
      
      // Generate URI with file extension to match static loader format
      const uri = `resource://${fileName}`;
      
      const resource = {
        uri: uri,
        name: parsed.name,
        description: `${parsed.format} resource: ${parsed.name}`,
        mimeType: parsed.format === 'markdown' ? 'text/markdown' : `text/${parsed.format}`,
        source: parsed.format,
        parameterCount: parsed.parameterCount,
        parameters: parsed.parameters, // Add parameters array
        hasParameters: parsed.hasParameters,
        content: parsed.content,
        filePath: filePath,
        format: parsed.format
      };
      
      // Cache the result
      this.resourcesCache.set(filePath, resource);
      this.fileTimestamps.set(filePath, Date.now());
      
      return resource;
    } catch (error) {
      this.log('warn', `Failed to load resource ${filePath}: ${error.message}`);
      return { error: error.message, filePath };
    }
  }

  /**
   * Clear cache for specific type or all
   * @param {string} type - 'prompts', 'resources', or 'all'
   */
  clearCache(type = 'all') {
    switch (type) {
      case 'prompts':
        this.promptsCache.clear();
        this.log('info', 'Prompts cache cleared');
        break;
      case 'resources':
        this.resourcesCache.clear();
        this.log('info', 'Resources cache cleared');
        break;
      case 'all':
        this.promptsCache.clear();
        this.resourcesCache.clear();
        this.fileTimestamps.clear();
        this.log('info', 'All cache cleared');
        break;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      prompts: {
        ...this.stats.prompts,
        cacheSize: this.promptsCache.size
      },
      resources: {
        ...this.stats.resources,
        cacheSize: this.resourcesCache.size
      },
      fileTimestamps: this.fileTimestamps.size,
      hotReloadEnabled: this.enableHotReload,
      watchersActive: this.watchers.size,
      lastUpdate: this.stats.lastUpdate
    };
  }

  /**
   * Log a message with context
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @private
   */
  log(level, message) {
    if (this.logger && typeof this.logger[level] === 'function') {
      this.logger[level](`[MCPCacheManager] ${message}`);
    } else {
      console.log(`[${level.toUpperCase()}] [MCPCacheManager] ${message}`);
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.watchers.forEach((watcher, name) => {
      watcher.close();
      this.log('info', `Watcher closed: ${name}`);
    });
    this.watchers.clear();
    this.clearCache('all');
    this.log('info', 'MCPCacheManager destroyed');
  }
}

module.exports = MCPCacheManager;
