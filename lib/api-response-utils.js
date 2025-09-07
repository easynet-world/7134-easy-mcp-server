/**
 * APIResponseUtils - Standardized API Response Handling
 * 
 * Provides consistent response formatting for all API endpoints including:
 * - Standardized error response formatting
 * - Success response standardization
 * - Validation error handling
 * - Authentication and authorization error responses
 * - Request validation utilities
 * 
 * @author EasyNet World
 * @version 1.0.0
 */

class APIResponseUtils {
  /**
   * Send a standardized success response
   * @param {Object} res - Express response object
   * @param {Object} data - Response data
   * @param {string} message - Success message (optional)
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  static sendSuccessResponse(res, data = null, message = 'Success', statusCode = 200) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString(),
      ...(data && { data })
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send a standardized error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {Object} details - Additional error details (optional)
   * @param {string} errorCode - Custom error code (optional)
   */
  static sendErrorResponse(res, message, statusCode = 500, details = null, errorCode = null) {
    const response = {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      ...(errorCode && { errorCode }),
      ...(details && { details })
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send validation error response
   * @param {Object} res - Express response object
   * @param {Array|Object} errors - Validation errors
   * @param {string} message - Custom message (optional)
   */
  static sendValidationErrorResponse(res, errors, message = 'Validation failed') {
    const response = {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      validationErrors: Array.isArray(errors) ? errors : [errors]
    };

    return res.status(400).json(response);
  }

  /**
   * Send not found error response
   * @param {Object} res - Express response object
   * @param {string} resource - Resource name (e.g., 'User', 'Product')
   * @param {string} message - Custom message (optional)
   */
  static sendNotFoundResponse(res, resource, message = null) {
    const errorMessage = message || `${resource} not found`;
    return this.sendErrorResponse(res, errorMessage, 404, null, 'NOT_FOUND');
  }

  /**
   * Send unauthorized error response
   * @param {Object} res - Express response object
   * @param {string} message - Custom message (optional)
   */
  static sendUnauthorizedResponse(res, message = 'Unauthorized access') {
    return this.sendErrorResponse(res, message, 401, null, 'UNAUTHORIZED');
  }

  /**
   * Send forbidden error response
   * @param {Object} res - Express response object
   * @param {string} message - Custom message (optional)
   */
  static sendForbiddenResponse(res, message = 'Access forbidden') {
    return this.sendErrorResponse(res, message, 403, null, 'FORBIDDEN');
  }

  /**
   * Send rate limit error response
   * @param {Object} res - Express response object
   * @param {string} message - Custom message (optional)
   * @param {number} retryAfter - Retry after seconds (optional)
   */
  static sendRateLimitResponse(res, message = 'Rate limit exceeded', retryAfter = null) {
    const response = {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      errorCode: 'RATE_LIMIT_EXCEEDED',
      ...(retryAfter && { retryAfter })
    };

    return res.status(429).json(response);
  }

  /**
   * Send internal server error response
   * @param {Object} res - Express response object
   * @param {string} message - Custom message (optional)
   * @param {Object} details - Error details (optional)
   */
  static sendInternalErrorResponse(res, message = 'Internal server error', details = null) {
    return this.sendErrorResponse(res, message, 500, details, 'INTERNAL_ERROR');
  }

  /**
   * Send bad request error response
   * @param {Object} res - Express response object
   * @param {string} message - Custom message (optional)
   * @param {Object} details - Error details (optional)
   */
  static sendBadRequestResponse(res, message = 'Bad request', details = null) {
    return this.sendErrorResponse(res, message, 400, details, 'BAD_REQUEST');
  }

  /**
   * Send conflict error response
   * @param {Object} res - Express response object
   * @param {string} message - Custom message (optional)
   * @param {Object} details - Conflict details (optional)
   */
  static sendConflictResponse(res, message = 'Resource conflict', details = null) {
    return this.sendErrorResponse(res, message, 409, details, 'CONFLICT');
  }

  /**
   * Send service unavailable error response
   * @param {Object} res - Express response object
   * @param {string} message - Custom message (optional)
   * @param {Object} details - Service details (optional)
   */
  static sendServiceUnavailableResponse(res, message = 'Service temporarily unavailable', details = null) {
    return this.sendErrorResponse(res, message, 503, details, 'SERVICE_UNAVAILABLE');
  }

  /**
   * Validate request body against schema
   * @param {Object} body - Request body
   * @param {Object} schema - Validation schema
   * @returns {Object} Validation result with isValid and errors
   */
  static validateRequestBody(body, schema) {
    const errors = [];
    
    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in body) || body[field] === undefined || body[field] === null) {
          errors.push({
            field,
            message: `${field} is required`,
            code: 'REQUIRED_FIELD_MISSING'
          });
        }
      }
    }

    // Check field types
    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        if (body[field] !== undefined) {
          const fieldError = this.validateField(body[field], fieldSchema, field);
          if (fieldError) {
            errors.push(fieldError);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a single field against its schema
   * @param {any} value - Field value
   * @param {Object} fieldSchema - Field schema
   * @param {string} fieldName - Field name
   * @returns {Object|null} Validation error or null if valid
   * @private
   */
  static validateField(value, fieldSchema, fieldName) {
    // Type validation
    if (fieldSchema.type) {
      const expectedType = fieldSchema.type;
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      
      if (actualType !== expectedType) {
        return {
          field: fieldName,
          message: `${fieldName} must be of type ${expectedType}`,
          code: 'INVALID_TYPE',
          expected: expectedType,
          actual: actualType
        };
      }
    }

    // String length validation
    if (fieldSchema.type === 'string') {
      if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
        return {
          field: fieldName,
          message: `${fieldName} must be at least ${fieldSchema.minLength} characters long`,
          code: 'MIN_LENGTH_VIOLATION',
          minLength: fieldSchema.minLength,
          actualLength: value.length
        };
      }
      
      if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
        return {
          field: fieldName,
          message: `${fieldName} must be no more than ${fieldSchema.maxLength} characters long`,
          code: 'MAX_LENGTH_VIOLATION',
          maxLength: fieldSchema.maxLength,
          actualLength: value.length
        };
      }
    }

    // Number range validation
    if (fieldSchema.type === 'number' || fieldSchema.type === 'integer') {
      if (fieldSchema.minimum !== undefined && value < fieldSchema.minimum) {
        return {
          field: fieldName,
          message: `${fieldName} must be at least ${fieldSchema.minimum}`,
          code: 'MIN_VALUE_VIOLATION',
          minimum: fieldSchema.minimum,
          actual: value
        };
      }
      
      if (fieldSchema.maximum !== undefined && value > fieldSchema.maximum) {
        return {
          field: fieldName,
          message: `${fieldName} must be no more than ${fieldSchema.maximum}`,
          code: 'MAX_VALUE_VIOLATION',
          maximum: fieldSchema.maximum,
          actual: value
        };
      }
    }

    // Enum validation
    if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
      return {
        field: fieldName,
        message: `${fieldName} must be one of: ${fieldSchema.enum.join(', ')}`,
        code: 'INVALID_ENUM_VALUE',
        allowedValues: fieldSchema.enum,
        actual: value
      };
    }

    return null;
  }

  /**
   * Create a standardized pagination response
   * @param {Object} res - Express response object
   * @param {Array} data - Array of data items
   * @param {Object} pagination - Pagination info
   * @param {string} message - Success message (optional)
   */
  static sendPaginatedResponse(res, data, pagination, message = 'Success') {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString(),
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || data.length,
        totalPages: Math.ceil((pagination.total || data.length) / (pagination.limit || 10)),
        hasNext: pagination.hasNext || false,
        hasPrev: pagination.hasPrev || false
      }
    };

    return res.status(200).json(response);
  }

  /**
   * Create a standardized list response
   * @param {Object} res - Express response object
   * @param {Array} data - Array of data items
   * @param {string} message - Success message (optional)
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  static sendListResponse(res, data, message = 'Success', statusCode = 200) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString(),
      data,
      count: data.length
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Create a standardized created response
   * @param {Object} res - Express response object
   * @param {Object} data - Created resource data
   * @param {string} message - Success message (optional)
   */
  static sendCreatedResponse(res, data, message = 'Resource created successfully') {
    return this.sendSuccessResponse(res, data, message, 201);
  }

  /**
   * Create a standardized updated response
   * @param {Object} res - Express response object
   * @param {Object} data - Updated resource data
   * @param {string} message - Success message (optional)
   */
  static sendUpdatedResponse(res, data, message = 'Resource updated successfully') {
    return this.sendSuccessResponse(res, data, message, 200);
  }

  /**
   * Create a standardized deleted response
   * @param {Object} res - Express response object
   * @param {string} message - Success message (optional)
   */
  static sendDeletedResponse(res, message = 'Resource deleted successfully') {
    return this.sendSuccessResponse(res, null, message, 200);
  }
}

module.exports = APIResponseUtils;
