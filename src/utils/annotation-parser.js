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
        case 'description': {
          // Combine name and description for full text
          const fullDescription = tag.name && tag.description ? 
            `${tag.name} ${tag.description}` : 
            (tag.name || tag.description);
          annotations.description = fullDescription;
          break;
        }
        case 'summary': {
          // Combine name and description for full text
          const fullSummary = tag.name && tag.description ? 
            `${tag.name} ${tag.description}` : 
            (tag.name || tag.description);
          annotations.summary = fullSummary;
          break;
        }
        case 'tags': {
          // Split tags into array
          const tagsValue = tag.name && tag.description ? 
            `${tag.name} ${tag.description}` : 
            (tag.name || tag.description);
          annotations.tags = tagsValue ? tagsValue.split(',').map(t => t.trim()) : [];
          break;
        }
        case 'requestBody': {
          const parsedRequestBody = this.parseJsonAnnotation(tag);
          if (parsedRequestBody) {
            annotations.requestBody = parsedRequestBody;
          }
          break;
        }
        case 'responseSchema': {
          const parsedResponseSchema = this.parseJsonAnnotation(tag);
          if (parsedResponseSchema) {
            annotations.responseSchema = parsedResponseSchema;
          }
          break;
        }
        case 'errorResponses': {
          const parsedErrorResponses = this.parseJsonAnnotation(tag);
          if (parsedErrorResponses) {
            annotations.errorResponses = parsedErrorResponses;
          }
          break;
        }
        default: {
          // For any other tag, store the name/description
          const value = tag.name && tag.description ? 
            `${tag.name} ${tag.description}` : 
            (tag.name || tag.description);
          annotations[tagName] = value;
          break;
        }
        }
      });

      // Add basic description and summary from the comment if not already set
      if (!annotations.description && parsed[0].description) {
        annotations.description = parsed[0].description;
      }
      
      if (!annotations.summary && parsed[0].description) {
        annotations.summary = parsed[0].description;
      }

      // Store all tags for reference
      annotations.tags = annotations.tags || [];

      return annotations;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse a JSON annotation from a JSDoc tag
   * @param {Object} tag - The JSDoc tag
   * @returns {Object|null} Parsed JSON or null if invalid
   */
  static parseJsonAnnotation(tag) {
    try {
      // First try to parse from the type field (single-line JSON)
      if (tag.type && tag.type.trim()) {
        return JSON.parse(tag.type);
      }
      
      // Then try to parse from the description or name field (multi-line JSON)
      let jsonText = '';
      
      if (tag.description) {
        jsonText = tag.description;
      } else if (tag.name) {
        jsonText = tag.name;
      }
      
      if (jsonText) {
        // Clean up the JSON text and extract content between braces
        const match = jsonText.match(/\{[\s\S]*\}/);
        if (match) {
          return JSON.parse(match[0]);
        }
      }
      
      // Finally try to parse from the source (multi-line JSON)
      if (tag.source && Array.isArray(tag.source)) {
        // Join all source lines and extract JSON content
        let sourceText = tag.source.map(line => {
          if (typeof line === 'string') {
            return line;
          } else if (line.source) {
            return line.source;
          } else if (line.tokens?.description) {
            return line.tokens.description;
          }
          return '';
        }).join('\n');
        
        // Clean up the source text to extract just the JSON
        sourceText = sourceText.replace(/\s*\*\s*/g, ' ').trim();
        
        // Extract content between braces
        const match = sourceText.match(/\{[\s\S]*\}/);
        if (match) {
          return JSON.parse(match[0]);
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get annotation value for a specific annotation type
   * @param {string} className - The name of the class
   * @param {string} annotationType - The annotation type to retrieve
   * @param {string} filePath - Path to the source file
   * @returns {*} The annotation value or null
   */
  static getAnnotationValue(className, annotationType, filePath) {
    try {
      const annotations = this.parseClassAnnotations(className, filePath);
      return annotations ? annotations[annotationType] : null;
    } catch (error) {
      return null;
    }
  }
}

module.exports = AnnotationParser;