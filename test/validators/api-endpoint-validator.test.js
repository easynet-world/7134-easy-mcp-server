/**
 * Tests for API Endpoint Validator
 */

const APIEndpointValidator = require('../../src/utils/validators/api-endpoint-validator');
const fs = require('fs');
const path = require('path');

describe('APIEndpointValidator', () => {
  const testDir = path.join(__dirname, 'temp-api-validator');

  beforeAll(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      const files = fs.readdirSync(testDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testDir, file));
      });
      fs.rmdirSync(testDir);
    }
  });

  describe('validate', () => {
    test('should validate a correct API file', () => {
      const validFile = path.join(testDir, 'valid-get.ts');
      const content = `
// @description ('Request payload')
class Request {
  limit: number;
}

// @description ('Response payload')
class Response {
  data: string;
}

// @description('Get data')
// @summary('Get data')
// @tags('test')
function handler(req: any, res: any) {
  res.json({ data: 'test' });
}

module.exports = handler;
export {};
`;
      fs.writeFileSync(validFile, content);

      const result = APIEndpointValidator.validate(validFile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing handler function', () => {
      const invalidFile = path.join(testDir, 'no-handler.ts');
      const content = `
class Request {
  limit: number;
}

class Response {
  data: string;
}
`;
      fs.writeFileSync(invalidFile, content);

      const result = APIEndpointValidator.validate(invalidFile);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Handler function not found'))).toBe(true);
    });

    test('should detect missing handler export', () => {
      const invalidFile = path.join(testDir, 'no-export.ts');
      const content = `
function handler(req: any, res: any) {
  res.json({ data: 'test' });
}
`;
      fs.writeFileSync(invalidFile, content);

      const result = APIEndpointValidator.validate(invalidFile);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Handler function is not exported'))).toBe(true);
    });

    test('should warn about missing Request class', () => {
      const file = path.join(testDir, 'no-request.ts');
      const content = `
// @description('Get data')
function handler(req: any, res: any) {
  res.json({ data: 'test' });
}

module.exports = handler;
`;
      fs.writeFileSync(file, content);

      const result = APIEndpointValidator.validate(file);
      expect(result.warnings.some(w => w.includes('Request class not found'))).toBe(true);
    });

    test('should warn about missing Response class', () => {
      const file = path.join(testDir, 'no-response.ts');
      const content = `
class Request {
  limit: number;
}

// @description('Get data')
function handler(req: any, res: any) {
  res.json({ data: 'test' });
}

module.exports = handler;
`;
      fs.writeFileSync(file, content);

      const result = APIEndpointValidator.validate(file);
      expect(result.warnings.some(w => w.includes('Response class not found'))).toBe(true);
    });

    test('should warn about missing @description annotation', () => {
      const file = path.join(testDir, 'no-description.ts');
      const content = `
class Request {
  limit: number;
}

class Response {
  data: string;
}

function handler(req: any, res: any) {
  res.json({ data: 'test' });
}

module.exports = handler;
`;
      fs.writeFileSync(file, content);

      const result = APIEndpointValidator.validate(file);
      expect(result.warnings.some(w => w.includes('@description annotation not found'))).toBe(true);
    });

    test('should accept RequestPayload and ResponsePayload classes', () => {
      const file = path.join(testDir, 'payload-classes.ts');
      const content = `
// @description ('Request payload')
class RequestPayload {
  limit: number;
}

// @description ('Response payload')
class ResponsePayload {
  data: string;
}

// @description('Get data')
function handler(req: any, res: any) {
  res.json({ data: 'test' });
}

module.exports = handler;
`;
      fs.writeFileSync(file, content);

      const result = APIEndpointValidator.validate(file);
      expect(result.warnings.some(w => w.includes('Request class not found'))).toBe(false);
      expect(result.warnings.some(w => w.includes('Response class not found'))).toBe(false);
    });

    test('should handle non-existent file', () => {
      const result = APIEndpointValidator.validate(path.join(testDir, 'nonexistent.ts'));
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('File does not exist'))).toBe(true);
    });
  });

  describe('validateMultiple', () => {
    test('should validate multiple files', () => {
      const file1 = path.join(testDir, 'multi1.ts');
      const file2 = path.join(testDir, 'multi2.ts');
      
      const validContent = `
class Request { limit: number; }
class Response { data: string; }
// @description('Test')
function handler(req: any, res: any) { res.json({}); }
module.exports = handler;
`;

      fs.writeFileSync(file1, validContent);
      fs.writeFileSync(file2, validContent);

      const result = APIEndpointValidator.validateMultiple([file1, file2]);
      expect(result.isValid).toBe(true);
      expect(result.totalFiles).toBe(2);
      expect(result.validFiles).toBe(2);
      expect(result.invalidFiles).toBe(0);
    });
  });
});

