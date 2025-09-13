// Jest setup file for better test cleanup and CI compatibility

// Increase timeout for all tests
jest.setTimeout(30000);

// Global test cleanup
afterAll(async () => {
  // Wait a bit for any pending operations to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
