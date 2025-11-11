/**
 * Test tool executor timeout and tool not found scenarios
 */

describe('Tool Executor Timeout and Tool Not Found', () => {
  let ToolExecutor;
  let mockBridge;
  let mockBridgeReloader;

  beforeEach(() => {
    jest.resetModules();
    
    // Create a mock bridge that can simulate timeouts and tool not found
    mockBridge = {
      start: jest.fn(),
      on: jest.fn(),
      rpcRequest: jest.fn()
    };

    // Create a mock bridge reloader
    mockBridgeReloader = {
      ensureBridges: jest.fn(() => {
        return new Map([['test-server', mockBridge]]);
      })
    };

    ToolExecutor = require('../src/mcp/executors/tool-executor');
  });

  describe('Timeout handling', () => {
    test('should handle tools/list timeout gracefully and try name variations', async () => {
      const executor = new ToolExecutor();
      
      // Mock bridge to timeout on tools/list but succeed on tools/call with chrome_click
      let callCount = 0;
      mockBridge.rpcRequest.mockImplementation(async (method, params) => {
        callCount++;
        if (method === 'tools/list') {
          // Simulate timeout
          await new Promise(resolve => setTimeout(resolve, 10));
          throw new Error('RPC request timeout after 10000ms for method: tools/list');
        }
        if (method === 'tools/call') {
          // Try test-server_click name variation (which should be in the list)
          if (params.name === 'test-server_click') {
            return {
              content: [{ type: 'text', text: 'Success' }]
            };
          }
          throw new Error('Tool not found');
        }
        throw new Error('Unexpected method');
      });

      const result = await executor.executeTool('click', {}, {
        getLoadedRoutes: () => [],
        bridgeReloader: mockBridgeReloader,
        executeAPIEndpoint: jest.fn()
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBe('Success');
      // Should have tried tools/list (timeout) and then tools/call with test-server_click
      expect(callCount).toBeGreaterThanOrEqual(2);
    });

    test('should use 10000ms timeout for tools/list', async () => {
      const executor = new ToolExecutor();
      
      mockBridge.rpcRequest.mockImplementation(async (method, params, timeout) => {
        if (method === 'tools/list') {
          expect(timeout).toBe(10000);
          return { tools: [] };
        }
        throw new Error('Unexpected method');
      });

      await executor.executeTool('nonexistent', {}, {
        getLoadedRoutes: () => [],
        bridgeReloader: mockBridgeReloader,
        executeAPIEndpoint: jest.fn()
      }).catch(() => {}); // Expected to fail

      expect(mockBridge.rpcRequest).toHaveBeenCalledWith('tools/list', {}, 10000);
    });

    test('should use 10000ms timeout for tools/call', async () => {
      const executor = new ToolExecutor();
      
      mockBridge.rpcRequest
        .mockImplementationOnce(async (method) => {
          if (method === 'tools/list') {
            return { tools: [{ name: 'test-server_click', description: 'Click tool' }] };
          }
          throw new Error('Unexpected method');
        })
        .mockImplementationOnce(async (method, params, timeout) => {
          if (method === 'tools/call') {
            expect(timeout).toBe(10000);
            return { content: [{ type: 'text', text: 'Success' }] };
          }
          throw new Error('Unexpected method');
        });

      const result = await executor.executeTool('click', {}, {
        getLoadedRoutes: () => [],
        bridgeReloader: mockBridgeReloader,
        executeAPIEndpoint: jest.fn()
      });

      expect(result.content).toBeDefined();
      expect(mockBridge.rpcRequest).toHaveBeenCalledWith('tools/call', expect.any(Object), 10000);
    });
  });

  describe('Tool not found handling', () => {
    test('should try multiple name variations when tool not found', async () => {
      const executor = new ToolExecutor();
      
      let callCount = 0;
      mockBridge.rpcRequest
        .mockImplementationOnce(async (method) => {
          if (method === 'tools/list') {
            return { tools: [] };
          }
          throw new Error('Unexpected method');
        })
        .mockImplementation(async (method, params) => {
          callCount++;
          if (method === 'tools/call') {
            // Try different name variations
            const namesToTry = ['click', 'test-server_click', 'mcp_click', 'click_test-server'];
            if (callCount <= namesToTry.length) {
              throw new Error('Tool not found');
            }
            return { content: [{ type: 'text', text: 'Success' }] };
          }
          throw new Error('Unexpected method');
        });

      try {
        await executor.executeTool('click', {}, {
          getLoadedRoutes: () => [],
          bridgeReloader: mockBridgeReloader,
          executeAPIEndpoint: jest.fn()
        });
      } catch (e) {
        // Expected to fail after trying all variations
        expect(e.message).toContain('Tool not found');
        // Should have tried multiple name variations
        expect(callCount).toBeGreaterThan(1);
      }
    });

    test('should find tool using original name from tools/list', async () => {
      const executor = new ToolExecutor();
      
      mockBridge.rpcRequest
        .mockImplementationOnce(async (method) => {
          if (method === 'tools/list') {
            return {
              tools: [
                { name: 'test-server_click', description: 'Click tool' }
              ]
            };
          }
          throw new Error('Unexpected method');
        })
        .mockImplementationOnce(async (method, params) => {
          if (method === 'tools/call' && params.name === 'test-server_click') {
            return { content: [{ type: 'text', text: 'Success' }] };
          }
          throw new Error('Tool not found');
        });

      const result = await executor.executeTool('click', {}, {
        getLoadedRoutes: () => [],
        bridgeReloader: mockBridgeReloader,
        executeAPIEndpoint: jest.fn()
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBe('Success');
      // Should have used the original name from tools/list
      expect(mockBridge.rpcRequest).toHaveBeenCalledWith(
        'tools/call',
        expect.objectContaining({ name: 'test-server_click' }),
        expect.any(Number)
      );
    });

    test('should throw error when tool not found in any bridge', async () => {
      const executor = new ToolExecutor();
      
      mockBridge.rpcRequest
        .mockImplementationOnce(async (method) => {
          if (method === 'tools/list') {
            return { tools: [] };
          }
          throw new Error('Unexpected method');
        })
        .mockImplementation(async (method, params) => {
          if (method === 'tools/call') {
            throw new Error('Tool not found');
          }
          throw new Error('Unexpected method');
        });

      await expect(
        executor.executeTool('nonexistent_tool', {}, {
          getLoadedRoutes: () => [],
          bridgeReloader: mockBridgeReloader,
          executeAPIEndpoint: jest.fn()
        })
      ).rejects.toThrow('Tool not found: nonexistent_tool');
    });
  });

  describe('Original tool name from metadata', () => {
    test('should use _bridgeToolName from tools list metadata', async () => {
      const executor = new ToolExecutor();
      
      // Mock getToolsList to return a tool with _bridgeToolName metadata
      const getToolsList = async () => {
        return [
          {
            name: 'click',
            description: 'Click tool',
            _bridgeToolName: 'original_click_tool',
            _bridgeServerName: 'test-server'
          }
        ];
      };
      
      mockBridge.rpcRequest.mockImplementation(async (method, params) => {
        if (method === 'tools/call') {
          // Should be called with the original name from metadata
          if (params.name === 'original_click_tool') {
            return { content: [{ type: 'text', text: 'Success with original name' }] };
          }
          throw new Error('Tool not found');
        }
        throw new Error('Unexpected method');
      });

      const result = await executor.executeTool('click', {}, {
        getLoadedRoutes: () => [],
        bridgeReloader: mockBridgeReloader,
        executeAPIEndpoint: jest.fn(),
        getToolsList: getToolsList
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBe('Success with original name');
      // Should have been called with the original tool name
      expect(mockBridge.rpcRequest).toHaveBeenCalledWith(
        'tools/call',
        expect.objectContaining({ name: 'original_click_tool' }),
        expect.any(Number)
      );
    });
  });

  describe('Name variation patterns', () => {
    test('should try server-specific prefix for any server', async () => {
      const executor = new ToolExecutor();
      
      let triedNames = [];
      mockBridge.rpcRequest
        .mockImplementationOnce(async (method) => {
          if (method === 'tools/list') {
            return { tools: [] };
          }
          throw new Error('Unexpected method');
        })
        .mockImplementation(async (method, params) => {
          if (method === 'tools/call') {
            triedNames.push(params.name);
            throw new Error('Tool not found');
          }
          throw new Error('Unexpected method');
        });

      try {
        await executor.executeTool('click', {}, {
          getLoadedRoutes: () => [],
          bridgeReloader: mockBridgeReloader,
          executeAPIEndpoint: jest.fn()
        });
      } catch (e) {
        // Should have tried server-specific prefix
        expect(triedNames).toContain('test-server_click');
        expect(triedNames).toContain('click');
        expect(triedNames).toContain('mcp_click');
      }
    });
  });
});

