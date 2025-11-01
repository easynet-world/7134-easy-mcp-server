/**
 * Tests for APIResponseUtils
 */

const APIResponseUtils = require('../src/api/utils/api-response-utils');

describe('APIResponseUtils', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('sendSuccessResponse', () => {
    it('should send success response with default values', () => {
      APIResponseUtils.sendSuccessResponse(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        timestamp: expect.any(String)
      });
    });

    it('should send success response with custom data and message', () => {
      const data = { id: 1, name: 'Test' };
      const message = 'Custom success message';
      const statusCode = 201;

      APIResponseUtils.sendSuccessResponse(mockRes, data, message, statusCode);

      expect(mockRes.status).toHaveBeenCalledWith(statusCode);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message,
        timestamp: expect.any(String),
        data
      });
    });
  });

  describe('sendErrorResponse', () => {
    it('should send error response with default values', () => {
      APIResponseUtils.sendErrorResponse(mockRes, 'Test error');

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test error',
        timestamp: expect.any(String)
      });
    });

    it('should send error response with custom status code and details', () => {
      const message = 'Validation failed';
      const statusCode = 400;
      const details = { field: 'email' };
      const errorCode = 'VALIDATION_ERROR';

      APIResponseUtils.sendErrorResponse(mockRes, message, statusCode, details, errorCode);

      expect(mockRes.status).toHaveBeenCalledWith(statusCode);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: message,
        timestamp: expect.any(String),
        errorCode,
        details
      });
    });
  });

  describe('sendValidationErrorResponse', () => {
    it('should send validation error response with array of errors', () => {
      const errors = [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password is too short' }
      ];

      APIResponseUtils.sendValidationErrorResponse(mockRes, errors);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        timestamp: expect.any(String),
        validationErrors: errors
      });
    });

    it('should send validation error response with single error object', () => {
      const error = { field: 'email', message: 'Email is required' };

      APIResponseUtils.sendValidationErrorResponse(mockRes, error);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        timestamp: expect.any(String),
        validationErrors: [error]
      });
    });
  });

  describe('sendNotFoundResponse', () => {
    it('should send not found response with default message', () => {
      APIResponseUtils.sendNotFoundResponse(mockRes, 'User');

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
        timestamp: expect.any(String),
        errorCode: 'NOT_FOUND'
      });
    });

    it('should send not found response with custom message', () => {
      const message = 'Custom not found message';
      APIResponseUtils.sendNotFoundResponse(mockRes, 'User', message);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: message,
        timestamp: expect.any(String),
        errorCode: 'NOT_FOUND'
      });
    });
  });

  describe('validateRequestBody', () => {
    it('should validate request body successfully', () => {
      const body = { email: 'test@example.com', password: 'password123' };
      const schema = {
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string', minLength: 8 }
        }
      };

      const result = APIResponseUtils.validateRequestBody(body, schema);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors for missing required fields', () => {
      const body = { email: 'test@example.com' };
      const schema = {
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' }
        }
      };

      const result = APIResponseUtils.validateRequestBody(body, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('password');
      expect(result.errors[0].code).toBe('REQUIRED_FIELD_MISSING');
    });

    it('should return validation errors for invalid field types', () => {
      const body = { email: 123, password: 'password123' };
      const schema = {
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' }
        }
      };

      const result = APIResponseUtils.validateRequestBody(body, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('email');
      expect(result.errors[0].code).toBe('INVALID_TYPE');
    });

    it('should return validation errors for string length violations', () => {
      const body = { email: 'test@example.com', password: '123' };
      const schema = {
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string', minLength: 8 }
        }
      };

      const result = APIResponseUtils.validateRequestBody(body, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('password');
      expect(result.errors[0].code).toBe('MIN_LENGTH_VIOLATION');
    });

    it('should return validation errors for enum violations', () => {
      const body = { status: 'invalid' };
      const schema = {
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['active', 'inactive'] }
        }
      };

      const result = APIResponseUtils.validateRequestBody(body, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('status');
      expect(result.errors[0].code).toBe('INVALID_ENUM_VALUE');
    });
  });

  describe('sendPaginatedResponse', () => {
    it('should send paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = {
        page: 1,
        limit: 10,
        total: 25,
        hasNext: true,
        hasPrev: false
      };

      APIResponseUtils.sendPaginatedResponse(mockRes, data, pagination);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        timestamp: expect.any(String),
        data,
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNext: true,
          hasPrev: false
        }
      });
    });
  });

  describe('sendListResponse', () => {
    it('should send list response', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];

      APIResponseUtils.sendListResponse(mockRes, data);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success',
        timestamp: expect.any(String),
        data,
        count: 3
      });
    });
  });

  describe('sendCreatedResponse', () => {
    it('should send created response', () => {
      const data = { id: 1, name: 'New Item' };

      APIResponseUtils.sendCreatedResponse(mockRes, data);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Resource created successfully',
        timestamp: expect.any(String),
        data
      });
    });
  });

  describe('sendUpdatedResponse', () => {
    it('should send updated response', () => {
      const data = { id: 1, name: 'Updated Item' };

      APIResponseUtils.sendUpdatedResponse(mockRes, data);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Resource updated successfully',
        timestamp: expect.any(String),
        data
      });
    });
  });

  describe('sendDeletedResponse', () => {
    it('should send deleted response', () => {
      APIResponseUtils.sendDeletedResponse(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Resource deleted successfully',
        timestamp: expect.any(String)
      });
    });
  });
});
