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
  
  // Reset modules between tests
  resetModules: true,
  
  // Verbose output for debugging
  verbose: true
};
