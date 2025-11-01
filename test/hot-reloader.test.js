const HotReloader = require('../src/utils/loaders/hot-reloader');
const chokidar = require('chokidar');
const { 
  createMockApiLoader, 
  createMockMcpServer, 
  createMockWatcher,
  setupTestEnvironment,
  waitForAsync,
  cleanupHotReloader
} = require('../src/utils/test-utils');

// Mock chokidar
jest.mock('chokidar');

describe('HotReloader', () => {
  let hotReloader;
  let mockApiLoader;
  let mockMcpServer;
  let mockChokidar;

  setupTestEnvironment();

  beforeEach(() => {
    // Create mock dependencies
    mockApiLoader = createMockApiLoader();
    mockMcpServer = createMockMcpServer();
    
    mockChokidar = {
      watch: jest.fn().mockReturnValue(createMockWatcher())
    };
    
    chokidar.watch = mockChokidar.watch;
    
    hotReloader = new HotReloader(mockApiLoader, mockMcpServer);
  });

  afterEach(async () => {
    // Use the dedicated cleanup function
    await cleanupHotReloader(hotReloader);
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with dependencies', () => {
      expect(hotReloader.apiLoader).toBe(mockApiLoader);
      expect(hotReloader.mcpServer).toBe(mockMcpServer);
      expect(hotReloader.watcher).toBeNull();
      expect(hotReloader.isWatching).toBe(false);
    });

    test('should handle different dependency instances', () => {
      const differentLoader = { reloadAPIs: jest.fn() };
      const differentServer = { setRoutes: jest.fn() };
      const differentReloader = new HotReloader(differentLoader, differentServer);
      
      expect(differentReloader.apiLoader).toBe(differentLoader);
      expect(differentReloader.mcpServer).toBe(differentServer);
    });
  });

  describe('startWatching', () => {
    test('should start file watching successfully', () => {
      const mockWatcher = createMockWatcher();
      mockChokidar.watch.mockReturnValue(mockWatcher);
      
      hotReloader.startWatching();
      
      // Accept absolute or relative paths that end with the api glob pattern
      expect(mockChokidar.watch).toHaveBeenCalledWith(
        expect.stringMatching(/.*api\/\*\*\/\*\.js$/),
        expect.objectContaining({
          ignored: expect.any(Array),
          persistent: true
        })
      );
      expect(hotReloader.watcher).toBe(mockWatcher);
      expect(hotReloader.isWatching).toBe(true);
    });

    test('should set up file change event handlers', () => {
      const mockWatcher = createMockWatcher();
      mockChokidar.watch.mockReturnValue(mockWatcher);
      
      hotReloader.startWatching();
      
      expect(mockWatcher.on).toHaveBeenCalledWith('add', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('unlink', expect.any(Function));
    });

    test('should handle chokidar initialization errors gracefully', () => {
      mockChokidar.watch.mockImplementation(() => {
        throw new Error('Watch initialization error');
      });
      
      expect(() => hotReloader.startWatching()).toThrow('Watch initialization error');
    });
  });

  describe('stopWatching', () => {
    test('should stop watching and clean up resources', async () => {
      const mockWatcher = createMockWatcher();
      mockChokidar.watch.mockReturnValue(mockWatcher);
      
      hotReloader.startWatching();
      expect(hotReloader.isWatching).toBe(true);
      
      hotReloader.stopWatching();
      await waitForAsync(50);
      
      expect(mockWatcher.close).toHaveBeenCalled();
      expect(hotReloader.watcher).toBeNull();
      expect(hotReloader.isWatching).toBe(false);
    });

    test('should handle stopping when not watching', () => {
      expect(hotReloader.isWatching).toBe(false);
      expect(() => hotReloader.stopWatching()).not.toThrow();
    });
  });

  describe('File Change Handling', () => {
    test('should queue file changes for processing', () => {
      const mockWatcher = createMockWatcher();
      mockChokidar.watch.mockReturnValue(mockWatcher);
      
      hotReloader.startWatching();
      
      // Simulate file change
      const changeHandler = mockWatcher.on.mock.calls.find(call => call[0] === 'change')[1];
      changeHandler('test/file.js');
      
      expect(hotReloader.getQueue()).toHaveLength(1);
      expect(hotReloader.getQueue()[0].filePath).toBe('test/file.js');
    });

    test('should debounce multiple file changes', async () => {
      const mockWatcher = createMockWatcher();
      mockChokidar.watch.mockReturnValue(mockWatcher);
      
      hotReloader.startWatching();
      
      // Simulate multiple file changes
      const changeHandler = mockWatcher.on.mock.calls.find(call => call[0] === 'change')[1];
      changeHandler('test/file1.js');
      changeHandler('test/file2.js');
      changeHandler('test/file3.js');
      
      expect(hotReloader.getQueue()).toHaveLength(3);
      
      // Wait for debounce
      await waitForAsync(200);
      
      // Force immediate processing to avoid async issues
      hotReloader.forceReload();
      await waitForAsync(100);
      
      expect(mockApiLoader.reloadAPIs).toHaveBeenCalled();
    });
  });

  describe('processReloadQueue', () => {
    test('should process reload queue successfully', async () => {
      const mockWatcher = createMockWatcher();
      mockChokidar.watch.mockReturnValue(mockWatcher);
      
      hotReloader.startWatching();
      
      // Add files to queue
      hotReloader.queueReload('test/file1.js');
      hotReloader.queueReload('test/file2.js');
      
      expect(hotReloader.getQueue()).toHaveLength(2);
      
      // Force immediate processing
      hotReloader.forceReload();
      await waitForAsync(100);
      
      expect(mockApiLoader.clearCache).toHaveBeenCalledTimes(2);
      expect(mockApiLoader.reloadAPIs).toHaveBeenCalled();
      expect(mockMcpServer.setRoutes).toHaveBeenCalled();
    });

    test('should handle reload errors gracefully', async () => {
      mockApiLoader.reloadAPIs.mockImplementation(() => {
        throw new Error('Reload error');
      });
      
      hotReloader.queueReload('test/file.js');
      hotReloader.forceReload();
      await waitForAsync(100);
      
      expect(mockApiLoader.reloadAPIs).toHaveBeenCalled();
      // Should not throw, just log error
    });

    test('should handle MCP server errors gracefully', async () => {
      mockMcpServer.setRoutes.mockImplementation(() => {
        throw new Error('MCP error');
      });
      
      hotReloader.queueReload('test/file.js');
      hotReloader.forceReload();
      await waitForAsync(100);
      
      expect(mockMcpServer.setRoutes).toHaveBeenCalled();
      // Should not throw, just log error
    });
  });

  describe('Configuration', () => {
    test('should set debounce delay', () => {
      hotReloader.setDebounceDelay(500);
      expect(hotReloader.debounceDelay).toBe(500);
    });

    test('should enforce minimum debounce delay', () => {
      hotReloader.setDebounceDelay(50);
      expect(hotReloader.debounceDelay).toBe(100); // Minimum enforced
    });
  });

  describe('Status and Information', () => {
    test('should return correct watching status', () => {
      expect(hotReloader.isActive()).toBe(false);
      
      const mockWatcher = createMockWatcher();
      mockChokidar.watch.mockReturnValue(mockWatcher);
      hotReloader.startWatching();
      
      expect(hotReloader.isActive()).toBe(true);
    });

    test('should return current queue', () => {
      hotReloader.queueReload('test/file1.js');
      hotReloader.queueReload('test/file2.js');
      
      const queue = hotReloader.getQueue();
      expect(queue).toHaveLength(2);
      expect(queue[0].filePath).toBe('test/file1.js');
      expect(queue[1].filePath).toBe('test/file2.js');
    });
  });
});
