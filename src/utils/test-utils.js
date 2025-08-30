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

// Enhanced test setup with better cleanup
const setupTestEnvironment = () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.resetModules();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Wait a bit for any remaining async operations
    await waitForAsync(50);
  });

  afterAll(() => {
    jest.restoreAllMocks();
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

// Hot reloader cleanup helper
const cleanupHotReloader = async (hotReloader) => {
  if (hotReloader) {
    if (hotReloader.isActive()) {
      hotReloader.stopWatching();
    }
    // Clear any pending timeouts
    if (hotReloader.debounceTimer) {
      clearTimeout(hotReloader.debounceTimer);
      hotReloader.debounceTimer = null;
    }
    // Clear the reload queue
    if (hotReloader.reloadQueue) {
      hotReloader.reloadQueue = [];
    }
    // Wait for cleanup
    await waitForAsync(150);
  }
};

// Error simulation helpers
const simulateError = (errorType, message) => {
  const error = new Error(message);
  error.type = errorType;
  return error;
};

// Test data generators
const createTestRoutes = (count = 3) => {
  const routes = [];
  for (let i = 0; i < count; i++) {
    routes.push(createMockRoute('GET', `/test${i}`));
  }
  return routes;
};

const createTestAnnotations = (overrides = {}) => ({
  summary: 'Test API',
  description: 'Test API description',
  tags: ['test'],
  ...overrides
});

// Mock cleanup helpers
const cleanupMocks = () => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.resetModules();
};

// Validation helpers
const expectValidRoute = (route) => {
  expect(route).toHaveProperty('method');
  expect(route).toHaveProperty('path');
  expect(typeof route.method).toBe('string');
  expect(typeof route.path).toBe('string');
};

const expectValidOpenAPISpec = (spec) => {
  expect(spec).toHaveProperty('openapi');
  expect(spec).toHaveProperty('info');
  expect(spec).toHaveProperty('servers');
  expect(spec).toHaveProperty('paths');
  expect(spec.openapi).toBe('3.0.0');
};

module.exports = {
  // Core mocks
  createMockApp,
  createMockApiLoader,
  createMockMcpServer,
  createMockWatcher,
  createMockProcessorClass,
  createMockRoute,
  
  // Test setup
  setupTestEnvironment,
  cleanupMocks,
  
  // Async helpers
  waitForAsync,
  waitForCondition,
  
  // File system
  createMockFs,
  
  // Error handling
  simulateError,
  
  // Test data
  createTestRoutes,
  createTestAnnotations,
  
  // Validation helpers
  expectValidRoute,
  expectValidOpenAPISpec,
  
  // Cleanup helpers
  cleanupHotReloader
};
