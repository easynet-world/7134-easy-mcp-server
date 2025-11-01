/**
 * OpenAPI Helper Utilities
 * Provides concise functions for building OpenAPI specifications
 */

const fs = require('fs');
const path = require('path');

/**
 * Create a query parameter definition
 * @param {string} name - Parameter name
 * @param {string|object} schema - Schema type string or object
 * @param {string} [description] - Parameter description
 * @param {boolean} [required=false] - Whether parameter is required
 * @returns {object} OpenAPI parameter object
 */
function queryParam(name, schema, description, required = false) {
  const schemaObj = typeof schema === 'string' ? { type: schema } : schema;
  return {
    name,
    in: 'query',
    description: description || `${name} parameter`,
    required,
    schema: schemaObj
  };
}

/**
 * Create a path parameter definition
 * @param {string} name - Parameter name
 * @param {string|object} schema - Schema type string or object
 * @param {string} [description] - Parameter description
 * @returns {object} OpenAPI parameter object
 */
function pathParam(name, schema = 'string', description) {
  const schemaObj = typeof schema === 'string' ? { type: schema } : schema;
  return {
    name,
    in: 'path',
    description: description || `${name} parameter`,
    required: true,
    schema: schemaObj
  };
}

/**
 * Create a request body definition
 * @param {object} schema - JSON schema object
 * @param {boolean} [required=true] - Whether body is required
 * @returns {object} OpenAPI requestBody object
 */
function body(schema, required = true) {
  return {
    required,
    content: {
      'application/json': {
        schema
      }
    }
  };
}

/**
 * Create a response definition
 * @param {number|string} status - HTTP status code
 * @param {object} schema - JSON schema object
 * @param {string} [description] - Response description
 * @returns {object} OpenAPI response object
 */
function response(status = 200, schema, description = 'Successful response') {
  return {
    [status]: {
      description,
      content: {
        'application/json': {
          schema
        }
      }
    }
  };
}

/**
 * Build a complete OpenAPI spec from simplified parameters
 * @param {object} options - Specification options
 * @param {array} [options.query] - Query parameters (array of queryParam results)
 * @param {array} [options.path] - Path parameters (array of pathParam results)
 * @param {object} [options.body] - Request body schema (will be wrapped in body())
 * @param {boolean} [options.bodyRequired=true] - Whether body is required
 * @param {object} [options.response] - Response schema (will be wrapped in response())
 * @param {number|string} [options.responseStatus=200] - Response status code
 * @param {string} [options.responseDescription] - Response description
 * @param {object} [options.responses] - Full responses object (overrides response)
 * @param {object} [options.extras] - Additional OpenAPI properties
 * @returns {object} Complete OpenAPI specification object
 */
function apiSpec({
  query = [],
  path = [],
  body: bodySchema,
  bodyRequired = true,
  response: responseSchema,
  responseStatus = 200,
  responseDescription,
  responses,
  ...extras
}) {
  const spec = { ...extras };

  // Combine all parameters
  const allParams = [...path, ...query];
  if (allParams.length > 0) {
    spec.parameters = allParams;
  }

  // Add request body
  if (bodySchema) {
    spec.requestBody = body(bodySchema, bodyRequired);
  }

  // Add responses
  if (responses) {
    spec.responses = responses;
  } else if (responseSchema) {
    spec.responses = response(
      responseStatus,
      responseSchema,
      responseDescription
    );
  }

  return spec;
}

module.exports = {
  queryParam,
  pathParam,
  body,
  response,
  apiSpec
};

/**
 * Simple JSON Schema inference from an example value.
 * - Objects: properties inferred recursively, required = all present keys, additionalProperties: false
 * - Arrays: type array, items inferred from first element if present, else any-type object
 * - Primitives: type mapped by typeof
 * - Dates are treated as strings with date-time format when detected
 * @param {any} example - Example value to infer from
 * @param {object} [opts]
 * @param {string} [opts.description]
 * @returns {object} JSON Schema object with example included
 */
function schemaFrom(example, opts = {}) {
  function infer(value) {
    if (value === null || value === undefined) {
      return { type: 'null' };
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return { type: 'array', items: {} };
      }
      return { type: 'array', items: infer(value[0]) };
    }
    const t = typeof value;
    if (t === 'string') {
      // detect ISO date-time
      const isIso = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value);
      return isIso ? { type: 'string', format: 'date-time' } : { type: 'string' };
    }
    if (t === 'number') {
      // Treat integers as integer when safe
      return Number.isInteger(value) ? { type: 'integer', format: 'int64' } : { type: 'number' };
    }
    if (t === 'boolean') return { type: 'boolean' };
    if (t === 'object') {
      const props = {};
      const required = [];
      for (const key of Object.keys(value)) {
        props[key] = infer(value[key]);
        required.push(key);
      }
      return {
        type: 'object',
        additionalProperties: false,
        properties: props,
        required: required.length ? required : undefined
      };
    }
    return {}; // fallback
  }

  const schema = infer(example);
  if (opts.description) schema.description = opts.description;
  // Apply field-level descriptions if provided
  if (opts.fields && schema.type === 'object' && schema.properties) {
    Object.entries(opts.fields).forEach(([key, fieldMeta]) => {
      if (schema.properties[key]) {
        if (fieldMeta && typeof fieldMeta === 'object') {
          if (fieldMeta.description) schema.properties[key].description = fieldMeta.description;
          if (fieldMeta.format) schema.properties[key].format = fieldMeta.format;
          if (fieldMeta.enum) schema.properties[key].enum = fieldMeta.enum;
          if (fieldMeta.example !== undefined) schema.properties[key].example = fieldMeta.example;
        } else if (typeof fieldMeta === 'string') {
          schema.properties[key].description = fieldMeta;
        }
      }
    });
  }
  schema.example = example;
  return schema;
}

module.exports.schemaFrom = schemaFrom;

/**
 * Build JSON Schema from a class definition.
 * Conventions supported:
 * - static schemaFields: { fieldName: { type, description, format, enum, example, required? } }
 * - static example(): returns an example object
 * - static description: optional overall schema description
 * If schemaFields not present, falls back to schemaFrom(example).
 * @param {Function} ClassCtor
 * @returns {object} JSON Schema
 */
function schemaFromClass(ClassCtor) {
  try {
    const fields = ClassCtor.schemaFields;
    const description = ClassCtor.description;
    const example = typeof ClassCtor.example === 'function'
      ? ClassCtor.example()
      : undefined;

    if (fields && typeof fields === 'object') {
      const properties = {};
      const required = [];
      for (const [key, meta] of Object.entries(fields)) {
        if (!meta || typeof meta !== 'object') continue;
        const { type, description: desc, format, enum: enm, example: ex, required: isReq } = meta;
        properties[key] = {};
        if (type) properties[key].type = type;
        if (desc) properties[key].description = desc;
        if (format) properties[key].format = format;
        if (enm) properties[key].enum = enm;
        if (ex !== undefined) properties[key].example = ex;
        if (isReq !== false) required.push(key);
      }

      const schema = {
        type: 'object',
        additionalProperties: false,
        properties
      };
      if (required.length) schema.required = required;
      if (description) schema.description = description;
      if (example) schema.example = example;
      return schema;
    }

    // Fallback: infer from example
    if (example) {
      return schemaFrom(example, { description });
    }

    // Last resort: empty object schema
    return { type: 'object', additionalProperties: true, description: description || undefined };
  } catch (_) {
    return { type: 'object', additionalProperties: true };
  }
}

module.exports.schemaFromClass = schemaFromClass;

/**
 * Build JSON Schema from a TypeScript declaration (.d.ts or .ts) by parsing
 * a class with fields and inline comments. Supports line comments (//) and JSDoc block comments.
 * Types supported: string, number, integer, boolean, T[], Array<T> (basic inference)
 * @param {string} filePath - absolute or relative path to the TS file
 * @param {string} className - class name to extract fields from
 * @returns {object} JSON Schema
 */
function schemaFromTsDeclaration(filePath, className, seen = new Set()) {
  try {
    const key = `${filePath}::${className}`;
    if (seen.has(key)) {
      return { type: 'object', additionalProperties: true };
    }
    seen.add(key);
    if (!fs.existsSync(filePath)) {
      return { type: 'object', additionalProperties: true };
    }
    const src = fs.readFileSync(filePath, 'utf8');

    // Extract class block
    const classRegex = new RegExp('(?:/\\*\\*[\\s\\S]*?\\*/|//.*?\\n|\\s)*class\\s+' + className + '\\s*{([\\s\\S]*?)}');
    const match = src.match(classRegex);
    if (!match) {
      return { type: 'object', additionalProperties: true };
    }
    const body = match[1];

    // Helper function to extract @description annotation from a comment line
    const extractDescriptionAnnotation = (commentText) => {
      // Match @description('text') or @description('text') format
      const descMatch = commentText.match(/@description\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (descMatch) {
        return descMatch[1];
      }
      return null;
    };

    // Optionally extract class-level description (JSDoc, @description annotation, or // immediately above class)
    let description;
    const classHeaderRegex = new RegExp('([\\s\\S]*?)class\\s+' + className + '\\s*{');
    const headerMatch = src.match(classHeaderRegex);
    if (headerMatch) {
      const header = headerMatch[1];
      const jsDocMatch = header.match(/\/\*\*([\s\S]*?)\*\//);
      if (jsDocMatch) {
        description = jsDocMatch[1].replace(/^[\s*]+/gm, '').trim();
        // Check for @description annotation in JSDoc
        const descAnnotation = extractDescriptionAnnotation(description);
        if (descAnnotation) {
          description = descAnnotation;
        }
      } else {
        const lines = header.trimEnd().split(/\n/).reverse();
        const descLines = [];
        for (const line of lines) {
          const m = line.match(/\s*\/\/\s?(.*)$/);
          if (m) {
            const commentText = m[1];
            // Check for @description annotation first
            const descAnnotation = extractDescriptionAnnotation(commentText);
            if (descAnnotation) {
              description = descAnnotation;
              break;
            }
            descLines.push(commentText);
          } else {
            break;
          }
        }
        if (!description && descLines.length) {
          description = descLines.reverse().join('\n');
        }
      }
    }

    // Parse fields: accumulate preceding comment lines as description
    const properties = {};
    const required = [];
    let pendingDesc = undefined;

    const lines = body.split(/\n/);
    for (let raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      // Collect JSDoc block start
      if (line.startsWith('/**')) {
        const block = [line];
        // handled outside; simple accumulation until '*/'
        // Note: minimalistic; merge into pendingDesc when block closes
        let content = line;
        if (!line.includes('*/')) {
          // multi-line block
          // no stream parsing here; rely on next lines accumulation below
        }
      }
      // JSDoc single-line or mid-lines
      const jsDocInline = line.match(/^\*\s?(.*)$/);
      if (jsDocInline) {
        const commentText = jsDocInline[1].trim();
        // Check for @description annotation first
        const descAnnotation = extractDescriptionAnnotation(commentText);
        if (descAnnotation) {
          pendingDesc = descAnnotation; // Replace any accumulated description with the annotation
        } else {
          // Fall back to plain comment text
          pendingDesc = (pendingDesc ? pendingDesc + '\n' : '') + commentText;
        }
        continue;
      }
      if (line.startsWith('*/')) {
        // end of JSDoc, keep pendingDesc as-is
        continue;
      }
      // Line comment - check for @description annotation
      const lc = line.match(/^\/\/\s?(.*)$/);
      if (lc) {
        const commentText = lc[1].trim();
        // Check for @description annotation first
        const descAnnotation = extractDescriptionAnnotation(commentText);
        if (descAnnotation) {
          pendingDesc = descAnnotation; // Replace any accumulated description with the annotation
        } else {
          // Fall back to plain comment text
          pendingDesc = (pendingDesc ? pendingDesc + '\n' : '') + commentText;
        }
        continue;
      }

      // Property line: name[!]? : type [= default]; use greedy match up to last semicolon on the line
      const propMatch = raw.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(!)?\s*:?\s*([\s\S]*?);\s*$/);
      if (propMatch) {
        const name = propMatch[1];
        const bang = !!propMatch[2];
        const tsTypeFull = propMatch[3].trim();
        // Split type and default by '=' if present
        let typePart = tsTypeFull;
        let defaultPart;
        const eqIdx = tsTypeFull.indexOf('=');
        if (eqIdx !== -1) {
          typePart = tsTypeFull.substring(0, eqIdx).trim();
          defaultPart = tsTypeFull.substring(eqIdx + 1).trim();
        }
        const tsType = typePart.replace(/\s+as\s+[^\s]+$/, '').trim();
        const schema = tsTypeToJsonSchema(tsType, filePath, seen);
        if (pendingDesc) schema.description = pendingDesc.trim();
        if (defaultPart !== undefined) {
          const ex = parseTsDefaultLiteral(defaultPart);
          if (ex !== undefined) schema.example = ex;
        }
        properties[name] = schema;
        // Required rule: explicit '!' OR default value present and not an undefined-like initializer
        const defaultIsUndefined = typeof defaultPart === 'string' && /(^|\W)undefined(\W|$)/.test(defaultPart);
        if (bang || (defaultPart !== undefined && !defaultIsUndefined)) {
          required.push(name);
        }
        pendingDesc = undefined;
      }
    }

    const schema = { type: 'object', additionalProperties: false, properties };
    if (required.length) schema.required = required;
    if (description) schema.description = description;
    return schema;
  } catch (_) {
    return { type: 'object', additionalProperties: true };
  }
}

function tryResolveFromNearbyFiles(filePath, className, seen) {
  try {
    const dir = path.dirname(filePath);
    const candidates = [];
    // Ascend directories up to project api root and collect models/types.ts
    let cur = dir;
    while (cur && cur.length > 1) {
      candidates.push(path.join(cur, 'models.ts'));
      candidates.push(path.join(cur, 'types.ts'));
      const parent = path.dirname(cur);
      if (parent === cur) break;
      cur = parent;
      // stop if we reached api root
      if (path.basename(cur) === 'api') break;
    }
    // Try api root models/types as well
    const parts = dir.split(path.sep);
    const apiIdx = parts.lastIndexOf('api');
    if (apiIdx !== -1) {
      const apiRoot = parts.slice(0, apiIdx + 1).join(path.sep);
      candidates.push(path.join(apiRoot, 'models.ts'));
      candidates.push(path.join(apiRoot, 'types.ts'));
    }
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        const schema = schemaFromTsDeclaration(cand, className, seen);
        if (schema && schema.properties) return schema;
      }
    }
  } catch (_) { /* ignore */ }
  return null;
}

function tsTypeToJsonSchema(tsType, filePath, seen) {
  // Basic mappings
  const arrayMatch = tsType.match(/^Array<(.+)>$/) || tsType.match(/^(.+)\[\]$/);
  if (arrayMatch) {
    return { type: 'array', items: tsTypeToJsonSchema(arrayMatch[1].trim(), filePath, seen) };
  }
  const base = tsType.replace(/\s*\|\s*undefined/g, '').trim();
  if (base === 'string') return { type: 'string' };
  if (base === 'number') return { type: 'number' };
  if (base === 'integer' || base === 'int' || base === 'int64') return { type: 'integer', format: 'int64' };
  if (base === 'boolean') return { type: 'boolean' };
  if (base === 'object' || base === 'Record<string, any>') return { type: 'object' };
  // Inline object literal type: { key: type; key2: type; }
  if (base.startsWith('{') && base.endsWith('}')) {
    const inner = base.slice(1, -1).trim();
    const properties = {};
    const parts = inner.split(';').map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
      const m = part.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/);
      if (m) {
        const key = m[1];
        const t = m[2].trim();
        properties[key] = tsTypeToJsonSchema(t, filePath, seen);
      }
    }
    return { type: 'object', additionalProperties: false, properties };
  }
  // Attempt to resolve class types declared in the same file
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(base)) {
    try {
      const nested = schemaFromTsDeclaration(filePath, base, seen);
      if (nested && nested.properties) return nested;
      const nearby = tryResolveFromNearbyFiles(filePath, base, seen);
      if (nearby) return nearby;
      return {};
    } catch (_) {
      // ignore
    }
  }
  // Fallback
  return {};
}

// Parse basic TS default literals into JS values for examples
function parseTsDefaultLiteral(lit) {
  const s = (lit || '').trim();
  if (!s) return undefined;
  const str = s.match(/^(["'])([\s\S]*)\1$/);
  if (str) return str[2].replace(/\\"/g, '"').replace(/\\'/g, "'");
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^[-+]?[0-9]+(\.[0-9]+)?$/.test(s)) return Number(s);
  if (s.startsWith('[') && s.endsWith(']')) {
    try { return JSON.parse(s.replace(/'/g, '"')); } catch (_) {}
  }
  return undefined;
}

module.exports.schemaFromTsDeclaration = schemaFromTsDeclaration;
module.exports.tsSchema = schemaFromTsDeclaration;

/**
 * Convenience helper to build apiSpec from TS Request/Response classes
 * Defaults to classes named 'Request' and 'Response' in the same file
 */
function apiSpecTs(filePath, options = {}) {
  const {
    bodyClass = 'Request',
    responseClass = 'Response',
    ...extras
  } = options;

  const specOptions = { ...extras };
  try {
    const src = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
    const hasReq = bodyClass && new RegExp('class\\s+' + bodyClass + '\\b').test(src);
    const hasRes = responseClass && new RegExp('class\\s+' + responseClass + '\\b').test(src);
    if (hasReq) {
      specOptions.body = schemaFromTsDeclaration(filePath, bodyClass);
    }
    if (hasRes) {
      specOptions.response = schemaFromTsDeclaration(filePath, responseClass);
    }
  } catch (_) {
    // Fallback: only set response
    specOptions.response = schemaFromTsDeclaration(filePath, responseClass);
  }
  return apiSpec(specOptions);
}

module.exports.apiSpecTs = apiSpecTs;

