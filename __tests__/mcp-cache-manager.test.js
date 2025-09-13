/**
 * Tests for MCPCacheManager - Intelligent caching with hot swapping
 */

const fs = require('fs').promises;
const path = require('path');
const MCPCacheManager = require('../src/utils/mcp-cache-manager');

describe('MCPCacheManager', () => {
  let cacheManager;
  let tempDir;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = path.join(__dirname, 'temp-cache-test');
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(path.join(tempDir, 'prompts'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'resources'), { recursive: true });
    
    // Create test files
    await fs.writeFile(path.join(tempDir, 'prompts', 'test.md'), '# Test {{name}}');
    await fs.writeFile(path.join(tempDir, 'resources', 'guide.txt'), 'Guide for {{topic}}');
    
    cacheManager = new MCPCacheManager(tempDir, { enableHotReload: false });
  });

  afterEach(async () => {
    // Clean up
    cacheManager.destroy();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Caching', () => {
    it('should cache prompts on first access', async () => {
      const prompts = await cacheManager.getPrompts();
      
      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe('test');
      expect(prompts[0].parameters).toEqual(['name']);
      expect(cacheManager.promptsCache.size).toBe(1);
    });

    it('should cache resources on first access', async () => {
      const resources = await cacheManager.getResources();
      
      expect(resources).toHaveLength(1);
      expect(resources[0].name).toBe('guide');
      expect(resources[0].parameters).toEqual(['topic']);
      expect(cacheManager.resourcesCache.size).toBe(1);
    });

    it('should return cached data on subsequent access', async () => {
      // First access
      const prompts1 = await cacheManager.getPrompts();
      expect(cacheManager.stats.prompts.hits).toBe(0);
      expect(cacheManager.stats.prompts.misses).toBe(1);
      
      // Second access (should hit cache)
      const prompts2 = await cacheManager.getPrompts();
      expect(cacheManager.stats.prompts.hits).toBe(1);
      expect(cacheManager.stats.prompts.misses).toBe(1);
      
      expect(prompts1).toEqual(prompts2);
    });

    it('should cache all files with or without parameters', async () => {
      // Create file without parameters
      await fs.writeFile(path.join(tempDir, 'prompts', 'no-params.md'), '# No parameters here');
      
      const prompts = await cacheManager.getPrompts();
      
      // Should cache both files (with and without parameters)
      expect(prompts).toHaveLength(2);
      expect(cacheManager.promptsCache.size).toBe(2);
      
      // Check that both files are cached
      const hasParamsFile = prompts.find(p => p.hasParameters);
      const noParamsFile = prompts.find(p => !p.hasParameters);
      
      expect(hasParamsFile).toBeDefined();
      expect(noParamsFile).toBeDefined();
      expect(hasParamsFile.parameterCount).toBe(1);
      expect(noParamsFile.parameterCount).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear specific cache type', async () => {
      await cacheManager.getPrompts();
      await cacheManager.getResources();
      
      expect(cacheManager.promptsCache.size).toBe(1);
      expect(cacheManager.resourcesCache.size).toBe(1);
      
      cacheManager.clearCache('prompts');
      
      expect(cacheManager.promptsCache.size).toBe(0);
      expect(cacheManager.resourcesCache.size).toBe(1);
    });

    it('should clear all cache', async () => {
      await cacheManager.getPrompts();
      await cacheManager.getResources();
      
      expect(cacheManager.promptsCache.size).toBe(1);
      expect(cacheManager.resourcesCache.size).toBe(1);
      
      cacheManager.clearCache('all');
      
      expect(cacheManager.promptsCache.size).toBe(0);
      expect(cacheManager.resourcesCache.size).toBe(0);
    });

    it('should provide cache statistics', () => {
      const stats = cacheManager.getCacheStats();
      
      expect(stats).toHaveProperty('prompts');
      expect(stats).toHaveProperty('resources');
      expect(stats).toHaveProperty('hotReloadEnabled');
      expect(stats).toHaveProperty('watchersActive');
      
      expect(stats.prompts).toHaveProperty('total');
      expect(stats.prompts).toHaveProperty('cached');
      expect(stats.prompts).toHaveProperty('hits');
      expect(stats.prompts).toHaveProperty('misses');
    });
  });

  describe('File Format Support', () => {
    it('should support multiple file formats', async () => {
      // Create files in different formats
      await fs.writeFile(path.join(tempDir, 'prompts', 'test.js'), 'function {{func}}() {}');
      await fs.writeFile(path.join(tempDir, 'prompts', 'config.yaml'), 'name: {{app_name}}');
      await fs.writeFile(path.join(tempDir, 'prompts', 'readme.txt'), 'Readme for {{project}}');
      
      const prompts = await cacheManager.getPrompts();
      
      expect(prompts).toHaveLength(4); // Original + 3 new
      
      const formats = prompts.map(p => p.format);
      expect(formats).toContain('markdown');
      expect(formats).toContain('javascript');
      expect(formats).toContain('yaml');
      expect(formats).toContain('text');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing directories gracefully', async () => {
      const emptyCacheManager = new MCPCacheManager('/nonexistent', { enableHotReload: false });
      
      const prompts = await emptyCacheManager.getPrompts();
      const resources = await emptyCacheManager.getResources();
      
      expect(prompts).toEqual([]);
      expect(resources).toEqual([]);
      
      emptyCacheManager.destroy();
    });

    it('should handle corrupted files gracefully', async () => {
      // Create a file that will cause read error
      await fs.writeFile(path.join(tempDir, 'prompts', 'corrupt.md'), '');
      await fs.unlink(path.join(tempDir, 'prompts', 'corrupt.md'));
      
      const prompts = await cacheManager.getPrompts();
      
      // Should still return valid prompts
      expect(prompts).toHaveLength(1);
      expect(prompts[0].name).toBe('test');
    });
  });
});
