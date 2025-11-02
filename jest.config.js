module.exports = {
  // Run tests sequentially to avoid conflicts
  maxWorkers: 1,
  
  // Increase timeout for CI environments
  testTimeout: 30000,
  
  // Increase setup timeout
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Detect open handles to help with cleanup
  detectOpenHandles: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks between tests
  restoreMocks: true,
  
  // Don't reset modules between tests to avoid route loading issues
  resetModules: false,
  
  // Verbose output for debugging
  verbose: true,
  moduleFileExtensions: ['js', 'ts', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  transformIgnorePatterns: [
    '/node_modules/'
  ],
  
  // Ignore test files in init-test-projects directory (these are generated projects, not tests)
  // Also ignore template test files - they are templates, not actual tests to run
  testPathIgnorePatterns: [
    '/node_modules/',
    '/test/init-test-projects/',
    '/templates/'
  ]
};
