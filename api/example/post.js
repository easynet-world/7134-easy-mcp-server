const BaseAPI = require('../../src/core/base-api');

/**
 * @description Create a new user with validation
 * @summary Create user endpoint
 * @tags users
 * @requestBody {
 *   "type": "object",
 *   "required": ["name", "email"],
 *   "properties": {
 *     "name": { "type": "string", "minLength": 2, "maxLength": 50 },
 *     "email": { "type": "string", "format": "email" },
 *     "age": { "type": "integer", "minimum": 0, "maximum": 120 },
 *     "isActive": { "type": "boolean", "default": true }
 *   }
 * }
 * @responseSchema {
 *   "type": "object",
 *   "properties": {
 *     "success": { "type": "boolean" },
 *     "data": {
 *       "type": "object",
 *       "properties": {
 *         "id": { "type": "string", "format": "uuid" },
 *         "name": { "type": "string" },
 *         "email": { "type": "string", "format": "email" },
 *         "age": { "type": "integer" },
 *         "isActive": { "type": "boolean" },
 *         "createdAt": { "type": "string", "format": "date-time" }
 *       }
 *     },
 *     "message": { "type": "string" }
 *   }
 * }
 * @errorResponses {
 *   "400": { "description": "Validation error", "schema": { "type": "object", "properties": { "error": { "type": "string" } } } },
 *   "409": { "description": "User already exists", "schema": { "type": "object", "properties": { "error": { "type": "string" } } } }
 * }
 */
class EnhancedPostExample extends BaseAPI {
  process(req, res) {
    const { name, email, age, isActive = true } = req.body;
    
    // Validation
    if (!name || name.length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name must be at least 2 characters long' 
      });
    }
    
    if (!email || !this.isValidEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid email is required' 
      });
    }
    
    if (age && (age < 0 || age > 120)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Age must be between 0 and 120' 
      });
    }
    
    // Simulate user creation
    const user = {
      id: this.generateUUID(),
      name,
      email,
      age: age || null,
      isActive,
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
  }
  
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

module.exports = EnhancedPostExample;
