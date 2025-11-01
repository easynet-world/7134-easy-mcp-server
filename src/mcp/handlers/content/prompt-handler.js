/**
 * Prompt Handler
 * 
 * Handles loading and management of MCP prompts from the filesystem.
 * Manages prompt discovery, file parsing, template parameter extraction,
 * and hot reloading for prompt files.
 * 
 * Features:
 * - File system scanning for prompt files
 * - Multiple format support (JSON, YAML, Markdown, text)
 * - Template parameter extraction ({{param}} syntax)
 * - Hot reloading via file watchers
 * - Integration with MCPCacheManager for caching
 * - Prompt discovery from API routes
 * 
 * File Formats Supported:
 * - .json: JSON format with name, description, template, arguments
 * - .yaml/.yml: YAML format
 * - .md/.txt: Markdown or plain text (auto-parsed)
 * 
 * @class PromptHandler
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const chokidar = require('chokidar');
const SimpleParameterParser = require('../../../utils/parsers/parameter-template-parser');

class PromptHandler {
  constructor(promptsMap, config, resolvedBasePath, cacheManager = null) {
    this.prompts = promptsMap;
    this.config = config;
    this.resolvedBasePath = resolvedBasePath;
    this.cacheManager = cacheManager;
    this.promptsWatcher = null;
  }

  /**
   * Add a prompt to the server
   */
  addPrompt(prompt) {
    this.prompts.set(prompt.name, prompt);
    console.log('🔌 MCP Server: Added prompt:', prompt.name);
  }

  /**
   * Discover prompts from API routes
   */
  discoverPromptsFromRoutes(routes) {
    routes.forEach(route => {
      const processor = route.processorInstance;
      
      // Check if processor has prompts
      if (processor && processor.prompts) {
        processor.prompts.forEach(prompt => {
          this.addPrompt({
            name: prompt.name || `${route.path.replace(/\//g, '_').replace(/^_/, '')}_${route.method.toLowerCase()}_prompt`,
            description: prompt.description || `Prompt for ${route.method} ${route.path}`,
            template: prompt.template,
            arguments: prompt.arguments || []
          });
        });
      }
    });
  }

  /**
   * Load prompts from filesystem
   */
  async loadPromptsFromFilesystem() {
    try {
      // Load prompts if enabled and cache manager is not available
      if (this.config.mcp.prompts.enabled && !this.cacheManager) {
        const promptsPath = path.resolve(this.resolvedBasePath, 'prompts');
        await this.loadPromptsFromDirectory(promptsPath);
      }
      
      console.log(`🔌 MCP Server: Loaded ${this.prompts.size} prompts from filesystem`);
      
      // Setup file watchers if enabled
      if (this.config.mcp.prompts.watch && this.config.mcp.prompts.enabled) {
        this.setupPromptsWatcher();
      }
    } catch (error) {
      console.warn('⚠️  MCP Server: Failed to load prompts from filesystem:', error.message);
    }
  }

  /**
   * Load prompts from a directory recursively
   */
  async loadPromptsFromDirectory(dirPath, baseDir = null) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const promptsBase = baseDir || dirPath;
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively load subdirectories
          await this.loadPromptsFromDirectory(fullPath, promptsBase);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          // Load any file format if '*' is specified, or check specific formats
          const shouldLoad = this.config.mcp.prompts.formats.includes('*') || 
                           this.config.mcp.prompts.formats.includes(ext.substring(1));
          
          if (shouldLoad) {
            await this.loadPromptFromFile(fullPath, promptsBase);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read - this is normal
      console.log('🔌 MCP Server: No prompts directory found or accessible');
    }
  }

  /**
   * Load a single prompt from a file (supports any format)
   */
  async loadPromptFromFile(filePath, baseDir = null) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      
      // Check if file extension is supported based on MCP server configuration
      const supportedFormats = this.config.mcp.prompts.formats;
      if (!supportedFormats.includes('*')) {
        const supportedExtensions = supportedFormats.map(fmt => `.${fmt}`);
        if (!supportedExtensions.includes(ext)) {
          console.log(`🔌 MCP Server: Skipping unsupported file format: ${filePath} (${ext})`);
          return;
        }
      }
      
      const content = await fs.readFile(filePath, 'utf8');
      const promptsBasePath = baseDir || path.resolve(this.resolvedBasePath, 'prompts');
      const relativePath = path.relative(promptsBasePath, filePath);
      
      // Extract template parameters using the parameter parser
      const parsed = SimpleParameterParser.parse(content, path.basename(filePath));
      
      let promptData = {};
      let template = content;
      let description = `Prompt from ${path.basename(filePath)}`;
      let arguments_ = [];
      
      // Try to parse structured formats for metadata extraction
      if (ext === '.json') {
        try {
          promptData = JSON.parse(content);
          template = promptData.instructions || promptData.template || content;
          description = promptData.description || description;
          arguments_ = promptData.arguments?.properties ? 
            Object.keys(promptData.arguments.properties).map(key => ({
              name: key,
              description: promptData.arguments.properties[key].description || '',
              required: promptData.arguments.required?.includes(key) || false
            })) : [];
        } catch (parseError) {
          console.warn(`⚠️  MCP Server: Invalid JSON in ${filePath}, treating as plain text`);
        }
      } else if (ext === '.yaml' || ext === '.yml') {
        try {
          promptData = yaml.load(content);
          template = promptData.instructions || promptData.template || content;
          description = promptData.description || description;
          arguments_ = promptData.arguments?.properties ? 
            Object.keys(promptData.arguments.properties).map(key => ({
              name: key,
              description: promptData.arguments.properties[key].description || '',
              required: promptData.arguments.required?.includes(key) || false
            })) : [];
        } catch (parseError) {
          console.warn(`⚠️  MCP Server: Invalid YAML in ${filePath}, treating as plain text`);
        }
      } else {
        // For any other format, treat as plain text template
        template = content;
        description = `Prompt from ${path.basename(filePath)}`;
      }
      
      // Generate a name from the file path if not provided
      // Use relative path with underscores for nested directories, or just filename for root level
      let name = promptData.name;
      if (!name) {
        if (relativePath.startsWith('..')) {
          // If the path goes outside the prompts directory, just use the filename
          name = path.basename(filePath, path.extname(filePath));
        } else {
          // Use relative path with underscores for nested directories
          name = relativePath.replace(/\//g, '_').replace(/\.[^/.]+$/, '');
        }
      }
      
      // If no arguments were defined in structured format, use extracted parameters
      if (arguments_.length === 0 && parsed.hasParameters) {
        arguments_ = parsed.parameters.map(param => ({
          name: param,
          description: `Parameter: ${param}`,
          required: false
        }));
      }
      
      const prompt = {
        name: name,
        description: description,
        template: template,
        arguments: arguments_,
        // Add template support
        hasParameters: parsed.hasParameters,
        parameters: parsed.parameters,
        parameterCount: parsed.parameterCount,
        isTemplate: parsed.hasParameters,
        filePath: relativePath,
        format: parsed.format
      };
      
      this.addPrompt(prompt);
    } catch (error) {
      console.warn(`⚠️  MCP Server: Failed to load prompt from ${filePath}:`, error.message);
    }
  }

  /**
   * Setup file watcher for prompts directory
   */
  setupPromptsWatcher(onChanged = null) {
    if (this.promptsWatcher) {
      this.promptsWatcher.close();
    }
    
    const promptsPath = path.resolve(this.resolvedBasePath, 'prompts');
    
    this.promptsWatcher = chokidar.watch(promptsPath, {
      ignored: /(^|[/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });
    
    this.promptsWatcher
      .on('add', (filePath) => {
        console.log(`🔌 MCP Server: New prompt file added: ${filePath}`);
        this.loadPromptFromFile(filePath, promptsPath);
        if (onChanged) onChanged();
      })
      .on('change', (filePath) => {
        console.log(`🔌 MCP Server: Prompt file changed: ${filePath}`);
        this.loadPromptFromFile(filePath, promptsPath);
        if (onChanged) onChanged();
      })
      .on('unlink', (filePath) => {
        console.log(`🔌 MCP Server: Prompt file removed: ${filePath}`);
        this.removePromptByFilePath(filePath);
        if (onChanged) onChanged();
      })
      .on('error', (error) => {
        console.error('❌ MCP Server: Prompts watcher error:', error);
      });
    
    console.log(`🔌 MCP Server: Watching prompts directory: ${promptsPath}`);
  }

  /**
   * Remove a prompt by file path
   */
  removePromptByFilePath(filePath) {
    const relativePath = path.relative(path.resolve(this.resolvedBasePath, 'prompts'), filePath);
    // Remove any file extension and replace slashes with underscores
    const name = relativePath.replace(/\.[^/.]+$/, '').replace(/\//g, '_');
    console.log(`🔌 MCP Server: Removing prompt: ${name} (from ${filePath})`);
    this.prompts.delete(name);
  }

  /**
   * Get all prompts
   */
  getAllPrompts() {
    return Array.from(this.prompts.values());
  }

  /**
   * Get a prompt by name
   */
  getPrompt(name) {
    return this.prompts.get(name);
  }

  /**
   * Cleanup watcher
   */
  cleanup() {
    if (this.promptsWatcher) {
      this.promptsWatcher.close();
      this.promptsWatcher = null;
    }
  }
}

module.exports = PromptHandler;

