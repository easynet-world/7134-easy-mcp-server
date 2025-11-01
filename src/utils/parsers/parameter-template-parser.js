/**
 * Simple Parameter Parser - Format-agnostic parameter extraction
 * 
 * Parses any file content to extract {{parameter}} placeholders
 * and returns clean JSON for LLM consumption.
 * Supports any file format: .md, .txt, .json, .yaml, .js, .py, etc.
 * 
 * @author EasyNet World
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');

class SimpleParameterParser {
  /**
   * Extract parameters from any text content
   * @param {string} content - File content (any format)
   * @returns {Array<string>} Array of unique parameter names
   */
  static extractParameters(content) {
    const paramRegex = /\{\{(\w+)\}\}/g;
    const matches = [...content.matchAll(paramRegex)];
    const parameters = new Set(matches.map(match => match[1]));
    return Array.from(parameters);
  }

  /**
   * Parse any file content and extract parameters
   * @param {string} content - File content (any format)
   * @param {string} fileName - File name (optional)
   * @returns {Object} Simple JSON object with content and parameters
   */
  static parse(content, fileName = null) {
    // Clean content by removing HTML comments if present
    const cleanContent = content.replace(/<!--[\s\S]*?-->/g, '').trim();
    
    // Extract parameters
    const parameters = SimpleParameterParser.extractParameters(cleanContent);
    
    // Get file name without extension
    const name = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'unnamed-file';
    
    // Get file extension
    const extension = fileName ? path.extname(fileName).toLowerCase() : '';
    
    return {
      name: name,
      extension: extension,
      content: cleanContent,
      parameters: parameters,
      parameterCount: parameters.length,
      hasParameters: parameters.length > 0,
      format: SimpleParameterParser.getFormatType(extension)
    };
  }

  /**
   * Get format type from file extension
   * @param {string} extension - File extension
   * @returns {string} Format type
   */
  static getFormatType(extension) {
    const formatMap = {
      '.md': 'markdown',
      '.markdown': 'markdown',
      '.txt': 'text',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.js': 'javascript',
      '.ts': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.html': 'html',
      '.xml': 'xml',
      '.css': 'css',
      '.sql': 'sql',
      '.sh': 'shell',
      '.bat': 'batch',
      '.ps1': 'powershell'
    };
    
    return formatMap[extension] || 'text';
  }

  /**
   * Parse multiple files
   * @param {Array<string>} filePaths - Array of file paths
   * @returns {Promise<Array<Object>>} Array of parsed objects
   */
  static async parseMultiple(filePaths) {
    const results = [];
    
    for (const filePath of filePaths) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const fileName = path.basename(filePath);
        results.push(SimpleParameterParser.parse(content, fileName));
      } catch (error) {
        results.push({
          name: path.basename(filePath).replace(/\.[^/.]+$/, ''),
          extension: path.extname(filePath),
          error: error.message,
          content: null,
          parameters: [],
          parameterCount: 0,
          hasParameters: false,
          format: 'unknown'
        });
      }
    }
    
    return results;
  }

  /**
   * Check if file should be parsed (has parameters)
   * @param {string} content - File content
   * @returns {boolean} True if file has parameters
   */
  static hasParameters(content) {
    return /\{\{\w+\}\}/.test(content);
  }

  /**
   * Get supported file extensions
   * @returns {Array<string>} Array of supported extensions
   */
  static getSupportedExtensions() {
    return [
      '.md', '.markdown', '.txt', '.json', '.yaml', '.yml',
      '.js', '.ts', '.py', '.java', '.cpp', '.c',
      '.html', '.xml', '.css', '.sql', '.sh', '.bat', '.ps1'
    ];
  }
}

module.exports = SimpleParameterParser;
