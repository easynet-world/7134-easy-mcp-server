const { parse } = require('comment-parser');
const fs = require('fs');

/**
 * Utility class for parsing JSDoc annotations from source files
 */
class AnnotationParser {
  /**
   * Parse JSDoc annotations from a class file
   * @param {string} className - The name of the class to find
   * @param {string} filePath - Path to the source file
   * @returns {Object} Parsed annotations
   */
  static parseClassAnnotations(className, filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const sourceCode = fs.readFileSync(filePath, 'utf8');
      const classRegex = new RegExp(`(\\/\\*\\*[\\s\\S]*?\\*\\/)\\s*class\\s+${className}\\b`, 'i');
      const match = sourceCode.match(classRegex);

      if (!match) {
        return null;
      }

      const jsDoc = match[1];
      const parsed = parse(jsDoc);

      if (!parsed || !parsed[0] || !parsed[0].tags) {
        return null;
      }

      const annotations = {};
      
      parsed[0].tags.forEach(tag => {
        const tagName = tag.tag;
        
        switch (tagName) {
        case 'description':
          annotations.description = tag.name || tag.description;
          break;
        case 'summary':
          annotations.summary = tag.name || tag.description;
          break;
        case 'tags':
          annotations.tags = tag.name ? tag.name.split(',').map(t => t.trim()) : [];
          break;
        case 'requestBody':
        case 'responseSchema':
        case 'errorResponses':
          annotations[tagName] = this.parseJsonAnnotation(tag);
          break;
        default:
          // Store any other annotations
          annotations[tagName] = tag.name || tag.description || tag.type;
        }
      });

      return annotations;
    } catch (error) {
      console.warn(`Error parsing annotations for ${className}: ${error.message}`);
      return null;
    }
  }

  /**
   * Parse JSON content from annotation tags
   * @param {Object} tag - The parsed tag object
   * @returns {Object|null} Parsed JSON or null if invalid
   */
  static parseJsonAnnotation(tag) {
    try {
      // For single-line JSON, it's in the type field
      if (tag.type && tag.type.startsWith('{')) {
        return JSON.parse(tag.type);
      }

      // For multi-line JSON, we need to reconstruct from source
      if (tag.source && tag.source.length > 1) {
        const jsonLines = tag.source.map(line => line.source.trim());
        const jsonContent = jsonLines.join('\n');
        
        // Extract JSON content between braces
        const braceStart = jsonContent.indexOf('{');
        const braceEnd = jsonContent.lastIndexOf('}');
        
        if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
          const jsonString = jsonContent.substring(braceStart, braceEnd + 1);
          // Clean up JSDoc markers and extra whitespace
          const cleaned = jsonString
            .replace(/^\s*\*\s*/gm, '') // Remove leading asterisks
            .replace(/\n/g, '') // Remove newlines
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
          
          return JSON.parse(cleaned);
        }
      }

      return null;
    } catch (error) {
      console.warn(`Error parsing JSON annotation ${tag.tag}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get a specific annotation value
   * @param {string} className - The name of the class
   * @param {string} annotationName - The annotation name (without @)
   * @param {string} filePath - Path to the source file
   * @returns {any} The annotation value
   */
  static getAnnotationValue(className, annotationName, filePath) {
    const annotations = this.parseClassAnnotations(className, filePath);
    return annotations ? annotations[annotationName] : null;
  }
}

module.exports = AnnotationParser;
