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
  verbose: true
};
