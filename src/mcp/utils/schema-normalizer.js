/**
 * Schema Normalization Utilities
 * 
 * Handles normalization and flattening of OpenAPI schemas for MCP tool definitions.
 * Ensures consistent schema format and prevents errors from undefined properties.
 * 
 * Features:
 * - Nested schema flattening (objects → flat properties)
 * - Safe parameter schema extraction
 * - Schema type normalization
 * - Required field tracking
 * - Prevents undefined property access errors
 * - Handles complex nested structures
 * 
 * Normalization Process:
 * - Extracts parameter schemas safely
 * - Flattens nested object properties
 * - Normalizes schema types (string, number, boolean, etc.)
 * - Ensures all properties have valid types
 * 
 * @class SchemaNormalizer
 */

class SchemaNormalizer {
  /**
   * Safely extract parameter schema, avoiding undefined property access
   * Ensures all schema properties have valid values to prevent n8n errors
   */
  safeExtractParameterSchema(p) {
    if (!p || typeof p !== 'object') {
      return { type: 'string', description: 'parameter' };
    }
    
    // Safely extract schema properties, ensuring no undefined values
    const safeSchema = {};
    if (p.schema && typeof p.schema === 'object') {
      // Only include properties that are actually defined (not null/undefined)
      if (p.schema.type !== undefined && p.schema.type !== null) {
        safeSchema.type = p.schema.type;
      }
      if (p.schema.format !== undefined && p.schema.format !== null) {
        safeSchema.format = p.schema.format;
      }
      if (p.schema.description !== undefined && p.schema.description !== null) {
        safeSchema.description = p.schema.description;
      }
      if (p.schema.enum !== undefined && p.schema.enum !== null) {
        safeSchema.enum = p.schema.enum;
      }
      if (p.schema.example !== undefined && p.schema.example !== null) {
        safeSchema.example = p.schema.example;
      }
      // Safely copy other valid properties
      for (const key in p.schema) {
        if (key !== 'type' && key !== 'format' && key !== 'description' && key !== 'enum' && key !== 'example') {
          const value = p.schema[key];
          if (value !== undefined && value !== null) {
            safeSchema[key] = value;
          }
        }
      }
    }
    
    // Ensure we always have at least type and description
    const result = {
      type: safeSchema.type || 'string',
      description: p.description || safeSchema.description || `${p.name || 'parameter'} parameter`
    };
    
    // Only add other properties if they exist
    if (safeSchema.format) result.format = safeSchema.format;
    if (safeSchema.enum) result.enum = safeSchema.enum;
    if (safeSchema.example !== undefined) result.example = safeSchema.example;
    
    return result;
  }

  /**
   * Normalize nested schema objects to ensure all intermediate properties exist
   * This prevents errors when n8n or other clients traverse nested schemas
   */
  normalizeNestedSchema(schema) {
    if (!schema || typeof schema !== 'object') {
      return { type: 'object', properties: {} };
    }
    
    const normalized = {
      type: schema.type || 'object',
      ...(schema.description && { description: schema.description }),
      ...(schema.required && Array.isArray(schema.required) && { required: schema.required }),
      ...(schema.additionalProperties !== undefined && { additionalProperties: schema.additionalProperties })
    };
    
    // CRITICAL: Handle array types FIRST - ensure items field is preserved
    // This must happen before properties normalization to prevent items from being lost
    if (schema.type === 'array') {
      if (schema.items) {
        if (typeof schema.items === 'object' && !Array.isArray(schema.items)) {
          normalized.items = this.normalizeNestedSchema(schema.items);
          // Ensure items has type field
          if (!normalized.items.type) {
            normalized.items.type = 'string';
          }
        } else {
          normalized.items = schema.items;
        }
      }
      // For arrays, also preserve other fields like description, example, etc.
      if (schema.description) normalized.description = schema.description;
      if (schema.example !== undefined) normalized.example = schema.example;
      // Return early for arrays to avoid object-specific normalization
      return normalized;
    }
    
    // Normalize properties recursively
    // CRITICAL: Always ensure properties exists for object types to prevent n8n errors
    if (schema.properties && typeof schema.properties === 'object') {
      normalized.properties = {};
      // Preserve all properties, even if empty
      const propsEntries = Object.entries(schema.properties);
      for (const [key, value] of propsEntries) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // For object types, always normalize to ensure properties exists
          if (value.type === 'object' || (!value.type && typeof value === 'object')) {
            // Ensure object types always have properties field - preserve existing or add empty
            const objSchema = value.type === 'object' ? value : { ...value, type: 'object' };
            // Always ensure properties exists - preserve existing or create empty object
            const objWithProperties = objSchema.properties !== undefined && objSchema.properties !== null
              ? objSchema
              : { ...objSchema, properties: {} };
            const normalizedObj = this.normalizeNestedSchema(objWithProperties);
            // CRITICAL: Ensure properties field is ALWAYS present for object types (even if empty)
            // This prevents n8n from accessing undefined.inputType
            if (normalizedObj.type === 'object' && (!normalizedObj.properties || typeof normalizedObj.properties !== 'object')) {
              normalizedObj.properties = {};
            }
            // CRITICAL: Ensure all nested properties in this object are also normalized
            // n8n may access nested properties, so they must all have proper structure
            if (normalizedObj.properties && typeof normalizedObj.properties === 'object') {
              for (const nestedKey in normalizedObj.properties) {
                const nestedValue = normalizedObj.properties[nestedKey];
                if (nestedValue && typeof nestedValue === 'object' && !Array.isArray(nestedValue)) {
                  // Recursively ensure nested properties are also properly structured
                  normalizedObj.properties[nestedKey] = this.normalizeNestedSchema(nestedValue);
                }
              }
            }
            normalized.properties[key] = normalizedObj;
          } else {
            // For non-object properties (including arrays), preserve all valid properties but ensure type exists
            const normalizedProp = {
              type: value.type || 'string'
            };
            
            // CRITICAL: If it's an array type, handle items FIRST before other properties
            if (value.type === 'array' && value.items) {
              if (typeof value.items === 'object' && !Array.isArray(value.items)) {
                normalizedProp.items = this.normalizeNestedSchema(value.items);
                if (!normalizedProp.items.type) {
                  normalizedProp.items.type = 'string';
                }
              } else {
                normalizedProp.items = value.items;
              }
            }
            
            // Preserve all valid properties from the original schema
            for (const propKey in value) {
              const propValue = value[propKey];
              // Only include non-null, non-undefined values
              if (propValue !== null && propValue !== undefined) {
                // Recursively normalize nested objects/arrays
                if (propKey === 'properties' && typeof propValue === 'object' && !Array.isArray(propValue)) {
                  normalizedProp.properties = this.normalizeNestedSchema({ type: 'object', properties: propValue }).properties;
                } else if (propKey === 'items') {
                  // Items already handled above for arrays, skip here
                  // But handle for other types if needed
                  if (value.type !== 'array' && typeof propValue === 'object' && !Array.isArray(propValue)) {
                    normalizedProp.items = this.normalizeNestedSchema(propValue);
                    if (!normalizedProp.items.type) {
                      normalizedProp.items.type = 'string';
                    }
                    if (normalizedProp.items.type === 'object' && !normalizedProp.items.properties) {
                      normalizedProp.items.properties = {};
                    }
                  }
                } else if (propKey !== 'type' || normalizedProp.type === undefined) {
                  // Preserve other properties (description, example, etc.)
                  normalizedProp[propKey] = propValue;
                }
              }
            }
            normalized.properties[key] = normalizedProp;
          }
        } else {
          // Fallback for invalid property schemas
          normalized.properties[key] = { type: 'string' };
        }
      }
    } else if (normalized.type === 'object') {
      // For object types without properties in schema, always add empty properties
      // BUT if schema.properties exists (even if empty), preserve it
      if (schema.properties !== undefined && schema.properties !== null) {
        normalized.properties = schema.properties;
      } else {
        normalized.properties = {};
      }
    }
    
    // FINAL SAFETY CHECK: Ensure object types ALWAYS have properties field
    // This is critical for n8n compatibility - it may access properties.something.inputType
    // n8n expects object types to have properties field, even if it's empty {}
    if (normalized.type === 'object') {
      if (normalized.properties === undefined || normalized.properties === null || typeof normalized.properties !== 'object') {
        normalized.properties = {};
      }
      // CRITICAL: Double-check that all nested properties are also properly structured
      // This prevents n8n from accessing undefined properties on nested objects
      if (normalized.properties && typeof normalized.properties === 'object') {
        for (const key in normalized.properties) {
          const prop = normalized.properties[key];
          if (prop && typeof prop === 'object' && !Array.isArray(prop)) {
            // If it's an object type, ensure it has properties
            if (prop.type === 'object' && (!prop.properties || typeof prop.properties !== 'object')) {
              prop.properties = {};
            }
            // If it has items (array), ensure items are also properly structured
            if (prop.items && typeof prop.items === 'object' && !Array.isArray(prop.items)) {
              if (!prop.items.type) {
                prop.items.type = 'string';
              }
              if (prop.items.type === 'object' && (!prop.items.properties || typeof prop.items.properties !== 'object')) {
                prop.items.properties = {};
              }
            }
          }
        }
      }
    }
    
    return normalized;
  }

  /**
   * Flatten nested object properties in request body schema to top level
   * This prevents n8n from having issues with nested object structures
   */
  flattenBodyProperties(bodySchema, inputSchema, normalizeFn) {
    if (bodySchema.type === 'object' && bodySchema.properties) {
      // Flatten nested objects: if body has nested objects, flatten them to top level
      for (const [key, value] of Object.entries(bodySchema.properties)) {
        // Check if it's a nested object BEFORE normalization
        const isNestedObject = value && typeof value === 'object' && !Array.isArray(value) && 
                              (value.type === 'object' || (!value.type && value.properties));
        
        if (isNestedObject && value.properties && typeof value.properties === 'object') {
          // Flatten nested object: convert product.id, product.name, etc. to top level
          for (const [nestedKey, nestedValue] of Object.entries(value.properties)) {
            const flatKey = `${key}.${nestedKey}`;
            // CRITICAL: For arrays, preserve items directly before normalization
            let normalizedNested;
            if (nestedValue.type === 'array') {
              // Handle arrays specially to ensure items is preserved
              normalizedNested = {
                type: 'array',
                ...(nestedValue.description && { description: nestedValue.description }),
                ...(nestedValue.example !== undefined && { example: nestedValue.example })
              };
              // CRITICAL: Preserve items - normalize the items schema if it exists
              if (nestedValue.items) {
                if (typeof nestedValue.items === 'object' && !Array.isArray(nestedValue.items)) {
                  normalizedNested.items = normalizeFn(nestedValue.items);
                  if (!normalizedNested.items.type) {
                    normalizedNested.items.type = 'string';
                  }
                } else {
                  normalizedNested.items = nestedValue.items;
                }
              } else {
                // Add default items if missing
                normalizedNested.items = { type: 'string' };
              }
            } else {
              // For non-array types, normalize normally
              normalizedNested = normalizeFn(nestedValue);
            }
            inputSchema.properties[flatKey] = normalizedNested;
            // Add to required if parent was required
            if (value.required && Array.isArray(value.required) && value.required.includes(nestedKey)) {
              if (!inputSchema.required.includes(flatKey)) {
                inputSchema.required.push(flatKey);
              }
            }
          }
        } else {
          // Non-nested property, normalize and add directly
          inputSchema.properties[key] = normalizeFn(value);
        }
      }
      // Add body required fields to required array (handle flattened keys)
      if (bodySchema.required && Array.isArray(bodySchema.required)) {
        for (const reqField of bodySchema.required) {
          // If the required field is an object that we flattened, add all its nested required fields
          if (bodySchema.properties[reqField]?.type === 'object' && bodySchema.properties[reqField]?.properties) {
            const nestedRequired = bodySchema.properties[reqField].required || [];
            for (const nestedReq of nestedRequired) {
              const flatKey = `${reqField}.${nestedReq}`;
              if (!inputSchema.required.includes(flatKey)) {
                inputSchema.required.push(flatKey);
              }
            }
          } else {
            // Simple required field
            if (!inputSchema.required.includes(reqField)) {
              inputSchema.required.push(reqField);
            }
          }
        }
      }
    } else {
      // For non-object body types, add as a single property
      inputSchema.properties.body = normalizeFn(bodySchema);
    }
  }
}

module.exports = SchemaNormalizer;

