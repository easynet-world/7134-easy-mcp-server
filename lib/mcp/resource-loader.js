/**
 * MCP Resource Loader - Resource Management Utilities
 * 
 * Provides MCP resource management functionality with:
 * - Resource loading from files
 * - Prompt management
 * - Markdown and JSON resource creation
 * - Directory-based resource loading
 * 
 * @author EasyNet World
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');

class MCPResourceLoader {
  /**
   * Create a new MCPResourceLoader instance
   * @param {string} basePath - Base path for resources (default: './lib/mcp')
   * @param {Object} logger - Logger instance (optional)
   * @param {Object} options - Configuration options
   * @param {string} options.userPath - User's custom MCP path (default: './mcp')
   * @param {boolean} options.loadDefaults - Load framework defaults (default: true)
   * @param {boolean} options.loadUser - Load user customizations (default: true)
   */
  constructor(basePath = './lib/mcp', logger = null, options = {}) {
    this.basePath = path.resolve(basePath);
    this.userPath = path.resolve(options.userPath || './mcp');
    this.loadDefaults = options.loadDefaults !== false;
    this.loadUser = options.loadUser !== false;
    this.logger = logger;
    this.resources = new Map();
    this.prompts = new Map();
  }

  /**
   * Log a message with context
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @private
   */
  log(level, message) {
    if (this.logger && typeof this.logger[level] === 'function') {
      this.logger[level](`[MCPResourceLoader] ${message}`);
    } else {
      console.log(`[${level.toUpperCase()}] [MCPResourceLoader] ${message}`);
    }
  }

  /**
   * Load a resource from file
   * @param {string} filePath - Path to the resource file
   * @param {string} resourceUri - URI for the resource (optional)
   * @param {string} customBasePath - Custom base path (optional)
   * @returns {Promise<Object>} MCP resource object
   */
  async loadResource(filePath, resourceUri = null, customBasePath = null) {
    try {
      const basePath = customBasePath || this.basePath;
      const fullPath = path.resolve(basePath, filePath);
      const content = await fs.readFile(fullPath, 'utf8');
      const ext = path.extname(filePath).toLowerCase();
      
      let resource;
      
      if (ext === '.json') {
        resource = JSON.parse(content);
      } else if (ext === '.md') {
        resource = this.createMarkdownResource(
          resourceUri || `resource://${path.basename(filePath, ext)}`,
          path.basename(filePath, ext),
          `Resource loaded from ${filePath}`,
          content
        );
      } else {
        // Treat as plain text
        resource = this.createTextResource(
          resourceUri || `resource://${path.basename(filePath, ext)}`,
          path.basename(filePath, ext),
          `Resource loaded from ${filePath}`,
          content
        );
      }
      
      this.resources.set(resource.uri, resource);
      this.log('debug', `Loaded resource: ${resource.uri}`);
      
      return resource;
    } catch (error) {
      this.log('error', `Failed to load resource from ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load a prompt from file
   * @param {string} filePath - Path to the prompt file
   * @param {string} customBasePath - Custom base path (optional)
   * @returns {Promise<Object>} MCP prompt object
   */
  async loadPrompt(filePath, customBasePath = null) {
    try {
      const basePath = customBasePath || this.basePath;
      const fullPath = path.resolve(basePath, filePath);
      const content = await fs.readFile(fullPath, 'utf8');
      const prompt = JSON.parse(content);
      
      // Validate prompt structure
      if (!prompt.name || !prompt.description) {
        throw new Error('Prompt must have name and description');
      }
      
      this.prompts.set(prompt.name, prompt);
      this.log('debug', `Loaded prompt: ${prompt.name}`);
      
      return prompt;
    } catch (error) {
      this.log('error', `Failed to load prompt from ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load all resources from a directory
   * @param {string} dirPath - Directory path relative to basePath
   * @param {string} resourceType - Type of resources to load ('resources', 'prompts', or 'all')
   * @param {string} customBasePath - Custom base path (optional)
   * @returns {Promise<Array>} Array of loaded resources
   */
  async loadDirectory(dirPath = '', resourceType = 'all', customBasePath = null) {
    try {
      const basePath = customBasePath || this.basePath;
      const fullDirPath = path.resolve(basePath, dirPath);
      const entries = await fs.readdir(fullDirPath, { withFileTypes: true });
      const loadedResources = [];
      
      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(dirPath, entry.name);
          const ext = path.extname(entry.name).toLowerCase();
          
          if (resourceType === 'all' || 
              (resourceType === 'resources' && (ext === '.md' || ext === '.json')) ||
              (resourceType === 'prompts' && ext === '.json')) {
            
            try {
              if (resourceType === 'prompts' || (resourceType === 'all' && ext === '.json' && dirPath.includes('prompts'))) {
                const prompt = await this.loadPrompt(filePath, null, customBasePath);
                loadedResources.push(prompt);
              } else {
                const resource = await this.loadResource(filePath, null, customBasePath);
                loadedResources.push(resource);
              }
            } catch (error) {
              this.log('warn', `Skipped file ${filePath}: ${error.message}`);
            }
          }
        } else if (entry.isDirectory()) {
          // Recursively load subdirectories
          const subResources = await this.loadDirectory(path.join(dirPath, entry.name), resourceType, customBasePath);
          loadedResources.push(...subResources);
        }
      }
      
      this.log('info', `Loaded ${loadedResources.length} resources from ${dirPath}`);
      return loadedResources;
    } catch (error) {
      this.log('error', `Failed to load directory ${dirPath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a markdown resource
   * @param {string} uri - Resource URI
   * @param {string} name - Resource name
   * @param {string} description - Resource description
   * @param {string} content - Markdown content
   * @returns {Object} MCP resource object
   */
  createMarkdownResource(uri, name, description, content) {
    return {
      uri,
      name,
      description,
      mimeType: 'text/markdown',
      text: content
    };
  }

  /**
   * Create a text resource
   * @param {string} uri - Resource URI
   * @param {string} name - Resource name
   * @param {string} description - Resource description
   * @param {string} content - Text content
   * @returns {Object} MCP resource object
   */
  createTextResource(uri, name, description, content) {
    return {
      uri,
      name,
      description,
      mimeType: 'text/plain',
      text: content
    };
  }

  /**
   * Create a JSON resource
   * @param {string} uri - Resource URI
   * @param {string} name - Resource name
   * @param {string} description - Resource description
   * @param {Object} data - JSON data
   * @returns {Object} MCP resource object
   */
  createJSONResource(uri, name, description, data) {
    return {
      uri,
      name,
      description,
      mimeType: 'application/json',
      text: JSON.stringify(data, null, 2)
    };
  }

  /**
   * Create a prompt resource
   * @param {string} name - Prompt name
   * @param {string} description - Prompt description
   * @param {string} instructions - Prompt instructions
   * @param {Object} arguments - Prompt arguments schema (optional)
   * @returns {Object} MCP prompt object
   */
  createPrompt(name, description, instructions, arguments = null) {
    const prompt = {
      name,
      description,
      arguments: arguments || {
        type: 'object',
        properties: {},
        required: []
      }
    };

    // Add instructions as text content
    if (instructions) {
      prompt.instructions = instructions;
    }

    this.prompts.set(name, prompt);
    this.log('debug', `Created prompt: ${name}`);
    
    return prompt;
  }

  /**
   * Get a resource by URI
   * @param {string} uri - Resource URI
   * @returns {Object|null} Resource object or null if not found
   */
  getResource(uri) {
    return this.resources.get(uri) || null;
  }

  /**
   * Get a prompt by name
   * @param {string} name - Prompt name
   * @returns {Object|null} Prompt object or null if not found
   */
  getPrompt(name) {
    return this.prompts.get(name) || null;
  }

  /**
   * Get all resources
   * @returns {Array} Array of all resources
   */
  getAllResources() {
    return Array.from(this.resources.values());
  }

  /**
   * Get all prompts
   * @returns {Array} Array of all prompts
   */
  getAllPrompts() {
    return Array.from(this.prompts.values());
  }

  /**
   * Save a resource to file
   * @param {string} filePath - Path to save the resource
   * @param {Object} resource - Resource object to save
   * @returns {Promise<void>}
   */
  async saveResource(filePath, resource) {
    try {
      const fullPath = path.resolve(this.basePath, filePath);
      const dir = path.dirname(fullPath);
      
      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });
      
      let content;
      if (resource.mimeType === 'application/json') {
        content = resource.text;
      } else {
        content = resource.text;
      }
      
      await fs.writeFile(fullPath, content, 'utf8');
      this.log('debug', `Saved resource to: ${filePath}`);
    } catch (error) {
      this.log('error', `Failed to save resource to ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save a prompt to file
   * @param {string} filePath - Path to save the prompt
   * @param {Object} prompt - Prompt object to save
   * @returns {Promise<void>}
   */
  async savePrompt(filePath, prompt) {
    try {
      const fullPath = path.resolve(this.basePath, filePath);
      const dir = path.dirname(fullPath);
      
      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });
      
      const content = JSON.stringify(prompt, null, 2);
      await fs.writeFile(fullPath, content, 'utf8');
      this.log('debug', `Saved prompt to: ${filePath}`);
    } catch (error) {
      this.log('error', `Failed to save prompt to ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load default resources and prompts
   * @returns {Promise<Object>} Object containing loaded resources and prompts
   */
  async loadDefaults() {
    const allResources = [];
    const allPrompts = [];
    
    try {
      // Load framework defaults
      if (this.loadDefaults) {
        const frameworkResources = await this.loadDirectory('resources');
        const frameworkPrompts = await this.loadDirectory('prompts');
        allResources.push(...frameworkResources);
        allPrompts.push(...frameworkPrompts);
        this.log('info', `Loaded ${frameworkResources.length} framework resources and ${frameworkPrompts.length} framework prompts`);
      }
      
      // Load user customizations
      if (this.loadUser) {
        try {
          const userResources = await this.loadDirectory('resources', 'all', this.userPath);
          const userPrompts = await this.loadDirectory('prompts', 'all', this.userPath);
          allResources.push(...userResources);
          allPrompts.push(...userPrompts);
          this.log('info', `Loaded ${userResources.length} user resources and ${userPrompts.length} user prompts`);
        } catch (error) {
          this.log('debug', `No user MCP directory found at ${this.userPath}`);
        }
      }
      
      this.log('info', `Total: ${allResources.length} resources and ${allPrompts.length} prompts loaded`);
      
      return {
        resources: allResources,
        prompts: allPrompts
      };
    } catch (error) {
      this.log('warn', `Failed to load resources: ${error.message}`);
      return { resources: allResources, prompts: allPrompts };
    }
  }

  /**
   * Create a health monitoring resource
   * @returns {Object} Health monitoring resource
   */
  createHealthMonitoringResource() {
    const content = `# Health Service Monitoring Guide

## Overview
This guide provides comprehensive information about monitoring health services and endpoints.

## Key Metrics
- Response time
- Availability
- Error rates
- Resource utilization

## Best Practices
1. Set up automated monitoring
2. Configure alerting thresholds
3. Monitor dependencies
4. Track performance trends

## Tools
- Prometheus
- Grafana
- Custom health checks
- Uptime monitoring

## Implementation
Implement health checks for all critical services and endpoints.`;

    return this.createMarkdownResource(
      'resource://health-monitoring-guide',
      'Health Monitoring Guide',
      'Comprehensive guide for health service monitoring',
      content
    );
  }

  /**
   * Create a WordPress content guide resource
   * @returns {Object} WordPress content guide resource
   */
  createWordPressContentGuide() {
    const content = `# WordPress Content Creation Guide

## Overview
This guide covers best practices for creating and managing WordPress content.

## Content Types
- Posts
- Pages
- Custom post types
- Media files

## SEO Best Practices
- Use descriptive titles
- Optimize meta descriptions
- Include relevant keywords
- Use proper heading structure

## Content Management
- Regular backups
- Version control
- Content scheduling
- Editorial workflow

## Performance
- Image optimization
- Caching strategies
- CDN usage
- Database optimization`;

    return this.createMarkdownResource(
      'resource://wordpress-content-guide',
      'WordPress Content Guide',
      'Guide for WordPress content creation and management',
      content
    );
  }

  /**
   * Create a YouTube API guide resource
   * @returns {Object} YouTube API guide resource
   */
  createYouTubeAPIGuide() {
    const content = `# YouTube API Quota Management

## Overview
This guide covers YouTube API quota management and best practices.

## Quota Limits
- Daily quota: 10,000 units
- Search: 100 units per request
- Video details: 1 unit per request
- Comments: 1 unit per request

## Optimization Strategies
- Cache frequently accessed data
- Batch requests when possible
- Use efficient search parameters
- Monitor quota usage

## Error Handling
- Handle quota exceeded errors
- Implement retry logic
- Use exponential backoff
- Monitor API responses

## Best Practices
- Plan API usage carefully
- Implement proper error handling
- Use appropriate request types
- Monitor quota consumption`;

    return this.createMarkdownResource(
      'resource://youtube-api-quota-management',
      'YouTube API Quota Management',
      'Guide for managing YouTube API quota and usage',
      content
    );
  }

  /**
   * Get resource statistics
   * @returns {Object} Resource statistics
   */
  getStats() {
    return {
      totalResources: this.resources.size,
      totalPrompts: this.prompts.size,
      resourceTypes: this.getResourceTypeStats(),
      basePath: this.basePath
    };
  }

  /**
   * Get resource type statistics
   * @returns {Object} Resource type statistics
   * @private
   */
  getResourceTypeStats() {
    const stats = {};
    
    for (const resource of this.resources.values()) {
      const type = resource.mimeType || 'unknown';
      stats[type] = (stats[type] || 0) + 1;
    }
    
    return stats;
  }
}

module.exports = MCPResourceLoader;
