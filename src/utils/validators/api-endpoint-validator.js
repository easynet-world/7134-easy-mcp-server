/**
 * API Endpoint Validator
 * 
 * Validates API endpoint files to ensure they have proper structure:
 * - Handler function (required)
 * - Request class (optional but recommended)
 * - Response class (optional but recommended)
 * - Annotations (optional but recommended)
 * 
 * @class APIEndpointValidator
 */

const fs = require('fs');
const path = require('path');

class APIEndpointValidator {
  /**
   * Validate an API endpoint file
   * @param {string} filePath - Path to the API endpoint file
   * @returns {Object} Validation result with isValid, errors, and warnings
   */
  static validate(filePath) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      filePath: filePath
    };

    if (!fs.existsSync(filePath)) {
      result.isValid = false;
      result.errors.push(`File does not exist: ${filePath}`);
      return result;
    }

    try {
      const sourceCode = fs.readFileSync(filePath, 'utf8');
      
      // Validate handler function
      const handlerValidation = this.validateHandler(sourceCode, filePath);
      if (!handlerValidation.isValid) {
        result.isValid = false;
        result.errors.push(...handlerValidation.errors);
      }
      if (handlerValidation.warnings && handlerValidation.warnings.length > 0) {
        result.warnings.push(...handlerValidation.warnings);
      }

      // Validate Request class (optional but recommended)
      const requestValidation = this.validateRequestClass(sourceCode, filePath);
      if (!requestValidation.isValid) {
        result.warnings.push(...requestValidation.errors);
      }

      // Validate Response class (optional but recommended)
      const responseValidation = this.validateResponseClass(sourceCode, filePath);
      if (!responseValidation.isValid) {
        result.warnings.push(...responseValidation.errors);
      }

      // Validate annotations (optional but recommended)
      const annotationValidation = this.validateAnnotations(sourceCode, filePath);
      if (!annotationValidation.isValid) {
        result.warnings.push(...annotationValidation.errors);
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Failed to read or parse file: ${error.message}`);
    }

    return result;
  }

  /**
   * Validate handler function
   * @param {string} sourceCode - Source code of the file
   * @param {string} filePath - Path to the file
   * @returns {Object} Validation result
   */
  static validateHandler(sourceCode, filePath) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check for handler function definition
    const handlerFunctionRegex = /(?:function\s+handler|const\s+handler\s*=\s*(?:async\s*)?\(|handler\s*[:=]\s*(?:async\s*)?\(|export\s+(?:default\s+)?(?:async\s+)?function\s+handler)/;
    const hasHandlerFunction = handlerFunctionRegex.test(sourceCode);
    
    // Check for class-based handler (class with process method)
    const hasClassWithProcess = /class\s+\w+.*?\{[\s\S]*?process\s*\(/s.test(sourceCode);
    
    // Check for object export with process method
    const hasObjectWithProcess = /(?:module\.exports|export\s+default)\s*=\s*\{[\s\S]*?process\s*[:=]\s*(?:async\s*)?\(/s.test(sourceCode);

    if (!hasHandlerFunction && !hasClassWithProcess && !hasObjectWithProcess) {
      result.isValid = false;
      result.errors.push('Handler function not found. Expected: function handler(req, res) or const handler = (req, res) => {}, or a class/object with a process(req, res) method');
      return result;
    }

    // Check for module.exports or export default
    const hasModuleExport = /module\.exports\s*=\s*handler/.test(sourceCode);
    const hasDefaultExport = /export\s+default\s+handler/.test(sourceCode);
    const hasNamedExport = /export\s+(?:const|function|async\s+function)\s+handler/.test(sourceCode);
    
    // For class-based handlers, check for class export
    const hasClassExport = hasClassWithProcess && /(?:module\.exports\s*=\s*\w+|export\s+default\s+class)/.test(sourceCode);
    // For object-based handlers, check for object export
    const hasObjectExport = hasObjectWithProcess;

    if (!hasModuleExport && !hasDefaultExport && !hasNamedExport && !hasClassExport && !hasObjectExport) {
      // Only require export if it's a function handler, not class/object
      if (hasHandlerFunction) {
        result.isValid = false;
        result.errors.push('Handler function is not exported. Expected: module.exports = handler or export default handler');
        return result;
      }
    }

    // Check handler function signature
    const handlerSignatureRegex = /(?:function\s+handler|const\s+handler\s*=\s*(?:async\s*)?|handler\s*[:=]\s*(?:async\s*)?)\s*\([^)]*\)/;
    const signatureMatch = sourceCode.match(handlerSignatureRegex);
    
    if (signatureMatch) {
      const signature = signatureMatch[0];
      // Check if handler accepts req and res parameters
      if (!/req/.test(signature) || !/res/.test(signature)) {
        result.warnings.push('Handler function should accept req and res parameters: handler(req, res)');
      }
    }

    return result;
  }

  /**
   * Validate Request class
   * @param {string} sourceCode - Source code of the file
   * @param {string} filePath - Path to the file
   * @returns {Object} Validation result
   */
  static validateRequestClass(sourceCode, filePath) {
    const result = {
      isValid: true,
      errors: []
    };

    // Check for Request class (case-insensitive, but prefer exact match)
    const requestClassRegex = /class\s+(Request|RequestPayload)\b/;
    const hasRequestClass = requestClassRegex.test(sourceCode);

    if (!hasRequestClass) {
      result.isValid = false;
      result.errors.push('Request class not found. Consider adding a Request or RequestPayload class for type safety and OpenAPI documentation.');
      return result;
    }

    // Check if Request class has properties (optional but recommended)
    const requestClassMatch = sourceCode.match(/class\s+(Request|RequestPayload)\s*\{([^}]*)\}/);
    if (requestClassMatch) {
      const classBody = requestClassMatch[2];
      // Check if class has any properties (excluding comments)
      const hasProperties = /[a-zA-Z_$][a-zA-Z0-9_$]*\s*[:?]/.test(classBody.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''));
      
      if (!hasProperties) {
        result.errors.push('Request class is empty. Consider adding properties for request validation.');
      }
    }

    return result;
  }

  /**
   * Validate Response class
   * @param {string} sourceCode - Source code of the file
   * @param {string} filePath - Path to the file
   * @returns {Object} Validation result
   */
  static validateResponseClass(sourceCode, filePath) {
    const result = {
      isValid: true,
      errors: []
    };

    // Check for Response class (case-insensitive, but prefer exact match)
    const responseClassRegex = /class\s+(Response|ResponsePayload)\b/;
    const hasResponseClass = responseClassRegex.test(sourceCode);

    if (!hasResponseClass) {
      result.isValid = false;
      result.errors.push('Response class not found. Consider adding a Response or ResponsePayload class for type safety and OpenAPI documentation.');
      return result;
    }

    // Check if Response class has properties (optional but recommended)
    const responseClassMatch = sourceCode.match(/class\s+(Response|ResponsePayload)\s*\{([^}]*)\}/);
    if (responseClassMatch) {
      const classBody = responseClassMatch[2];
      // Check if class has any properties (excluding comments)
      const hasProperties = /[a-zA-Z_$][a-zA-Z0-9_$]*\s*[:?]/.test(classBody.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''));
      
      if (!hasProperties) {
        result.errors.push('Response class is empty. Consider adding properties for response documentation.');
      }
    }

    return result;
  }

  /**
   * Validate annotations
   * @param {string} sourceCode - Source code of the file
   * @param {string} filePath - Path to the file
   * @returns {Object} Validation result
   */
  static validateAnnotations(sourceCode, filePath) {
    const result = {
      isValid: true,
      errors: []
    };

    // Check for @description annotation on handler
    const descriptionRegex = /@description\s*\(\s*['"`]([^'"`]*)['"`]\s*\)/;
    const hasDescription = descriptionRegex.test(sourceCode);

    if (!hasDescription) {
      result.isValid = false;
      result.errors.push('@description annotation not found on handler. Consider adding: // @description(\'Your description\')');
    }

    // Check for @summary annotation on handler (optional but recommended)
    const summaryRegex = /@summary\s*\(\s*['"`]([^'"`]*)['"`]\s*\)/;
    const hasSummary = summaryRegex.test(sourceCode);

    if (!hasSummary) {
      result.errors.push('@summary annotation not found on handler. Consider adding: // @summary(\'Brief summary\')');
    }

    // Check for @tags annotation on handler (optional but recommended)
    const tagsRegex = /@tags\s*\(\s*['"`]([^'"`]*)['"`]\s*\)/;
    const hasTags = tagsRegex.test(sourceCode);

    if (!hasTags) {
      result.errors.push('@tags annotation not found on handler. Consider adding: // @tags(\'tag1,tag2\')');
    }

    // Validate annotation format if present
    if (hasDescription) {
      const descMatch = sourceCode.match(descriptionRegex);
      if (descMatch && descMatch[1].trim().length === 0) {
        result.errors.push('@description annotation is empty. Please provide a description.');
      }
    }

    if (hasSummary) {
      const sumMatch = sourceCode.match(summaryRegex);
      if (sumMatch && sumMatch[1].trim().length === 0) {
        result.errors.push('@summary annotation is empty. Please provide a summary.');
      }
    }

    if (hasTags) {
      const tagsMatch = sourceCode.match(tagsRegex);
      if (tagsMatch && tagsMatch[1].trim().length === 0) {
        result.errors.push('@tags annotation is empty. Please provide at least one tag.');
      }
    }

    return result;
  }

  /**
   * Validate multiple API endpoint files
   * @param {string[]} filePaths - Array of file paths to validate
   * @returns {Object} Aggregated validation results
   */
  static validateMultiple(filePaths) {
    const results = {
      isValid: true,
      totalFiles: filePaths.length,
      validFiles: 0,
      invalidFiles: 0,
      filesWithWarnings: 0,
      errors: [],
      warnings: [],
      fileResults: []
    };

    filePaths.forEach(filePath => {
      const validation = this.validate(filePath);
      results.fileResults.push(validation);

      if (validation.isValid) {
        results.validFiles++;
      } else {
        results.invalidFiles++;
        results.isValid = false;
      }

      if (validation.warnings && validation.warnings.length > 0) {
        results.filesWithWarnings++;
      }

      // Aggregate errors and warnings
      validation.errors.forEach(error => {
        results.errors.push(`${path.basename(filePath)}: ${error}`);
      });

      validation.warnings.forEach(warning => {
        results.warnings.push(`${path.basename(filePath)}: ${warning}`);
      });
    });

    return results;
  }

  /**
   * Format validation results for display
   * @param {Object} result - Validation result
   * @returns {string} Formatted string
   */
  static formatResult(result) {
    const lines = [];
    lines.push(`File: ${path.basename(result.filePath)}`);
    lines.push(`Status: ${result.isValid ? '✅ Valid' : '❌ Invalid'}`);

    if (result.errors.length > 0) {
      lines.push('\nErrors:');
      result.errors.forEach(error => {
        lines.push(`  ❌ ${error}`);
      });
    }

    if (result.warnings.length > 0) {
      lines.push('\nWarnings:');
      result.warnings.forEach(warning => {
        lines.push(`  ⚠️  ${warning}`);
      });
    }

    return lines.join('\n');
  }
}

module.exports = APIEndpointValidator;

