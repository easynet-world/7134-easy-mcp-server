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
        case 'body':
        case 'requestBody': {
          // Accept either @body or @requestBody
          const parsedRequestBody = this.parseJsonAnnotation(tag) || this.parseSimpleJsonAnnotation(tag);
          annotations.requestBody = parsedRequestBody; // Will be null if parsing failed
          break;
        }
        case 'response':
        case 'responseSchema': {
          // Accept either @response or @responseSchema
          const parsedResponseSchema = this.parseJsonAnnotation(tag) || this.parseSimpleJsonAnnotation(tag);
          annotations.responseSchema = parsedResponseSchema; // Will be null if parsing failed
          break;
        }
        case 'errorResponses': {
          const parsedErrorResponses = this.parseJsonAnnotation(tag);
          annotations.errorResponses = parsedErrorResponses; // Will be null if parsing failed
          break;
        }
        case 'query':
        case 'queryParameters': {
          // For query parameters we normalize to JSON Schema with type/object/properties
          const parsedQueryParameters = this.parseSimpleJsonAnnotation(tag);
          annotations.queryParameters = parsedQueryParameters; // Will be null if parsing failed
          break;
        }
        case 'param':
        case 'pathParameters': {
          const parsedPathParameters = this.parseJsonAnnotation(tag) || this.parseSimpleJsonAnnotation(tag);
          annotations.pathParameters = parsedPathParameters; // Will be null if parsing failed
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
   * Parse a simple JSON annotation with type-description format
   * @param {Object} tag - The JSDoc tag
   * @returns {Object|null} Parsed JSON schema or null if invalid
   */
  static parseSimpleJsonAnnotation(tag) {
    try {
      let jsonText = '';
      
      // Check type field first (where comment-parser puts JSON content)
      if (tag.type && tag.type.trim()) {
        jsonText = tag.type.trim();
      } else if (tag.description) {
        jsonText = tag.description;
      } else if (tag.name) {
        jsonText = tag.name;
      }
      
      if (jsonText) {
        // Clean up the JSON text and extract content between braces
        let jsonString = jsonText.trim();
        
        // If the JSON doesn't start with {, wrap it
        if (!jsonString.startsWith('{')) {
          jsonString = '{' + jsonString + '}';
        }
        
        // Unescape quotes in the JSON string
        jsonString = jsonString.replace(/\\\"/g, '"');
        const simpleJson = JSON.parse(jsonString);
        
        // Convert simple format to JSON Schema format
        const schema = {
          type: 'object',
          properties: {}
        };
        
        Object.entries(simpleJson).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            // Direct object format: { "type": "string", "description": "...", "required": true, ... }
            const property = {
              type: value.type,
              description: value.description || ''
            };
              
            // Add additional properties if they exist
            if (value.required === false) {
              property.required = false;
            }
              
            schema.properties[key] = property;
          } else if (typeof value === 'string') {
            // Parse "type - description" format
            const parts = value.split(' - ');
            const type = parts[0].trim();
            const description = parts[1] ? parts[1].trim() : '';
              
            schema.properties[key] = {
              type: type,
              description: description
            };
          }
        });
        
        return schema;
      }
      
      return null;
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
        let jsonText = tag.type.trim();
        // If the JSON doesn't start with {, wrap it
        if (!jsonText.startsWith('{')) {
          jsonText = '{' + jsonText + '}';
        }
        return JSON.parse(jsonText);
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