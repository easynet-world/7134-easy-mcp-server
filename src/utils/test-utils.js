/**
 * Test utilities for common test operations
 * @jest-environment node
 */

// Common mock objects
const createMockApp = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  head: jest.fn(),
  options: jest.fn()
});

const createMockApiLoader = () => ({
  reloadAPIs: jest.fn().mockReturnValue([]),
  clearCache: jest.fn(),
  validateRoutes: jest.fn().mockReturnValue([]),
  getErrors: jest.fn().mockReturnValue([]),
  getRoutes: jest.fn().mockReturnValue([])
});

const createMockMcpServer = () => ({
  setRoutes: jest.fn(),
  notifyRouteChanges: jest.fn()
});

const createMockWatcher = () => ({
  on: jest.fn(),
  close: jest.fn()
});

const createMockProcessorClass = () => class TestAPI {
  constructor() {
    this.description = 'Test API endpoint';
    this.openApi = { summary: 'Test API' };
  }
  
  process(req, res) {
    res.json({ message: 'test' });
  }
};

// Common test setup
const setupTestEnvironment = () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });
};

// Async test helpers
const waitForAsync = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

const waitForCondition = async (condition, timeout = 5000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return true;
    }
    await waitForAsync(10);
  }
  throw new Error('Condition not met within timeout');
};

// File system mocks
const createMockFs = () => {
  const mockFs = {
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    readdirSync: jest.fn(),
    statSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn()
  };
  
  return mockFs;
};

// Route validation helpers
const createMockRoute = (method = 'GET', path = '/test', processor = null) => ({
  method,
  path,
  processorInstance: processor || createMockProcessorClass()
});

// Error simulation helpers
const simulateError = (errorType, message) => {
  const error = new Error(message);
  error.type = errorType;
  return error;
};

module.exports = {
  createMockApp,
  createMockApiLoader,
  createMockMcpServer,
  createMockWatcher,
  createMockProcessorClass,
  createMockRoute,
  setupTestEnvironment,
  waitForAsync,
  waitForCondition,
  createMockFs,
  simulateError
};
