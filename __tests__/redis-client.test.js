/**
 * Tests for RedisClient
 */

const RedisClient = require('../src/lib/redis-client');

describe('RedisClient', () => {
  let redisClient;
  let mockRedis;

  beforeEach(() => {
    // Mock Redis client
    mockRedis = {
      connect: jest.fn().mockResolvedValue(),
      disconnect: jest.fn().mockResolvedValue(),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      setEx: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      ttl: jest.fn().mockResolvedValue(3600),
      keys: jest.fn().mockResolvedValue([]),
      flushdb: jest.fn().mockResolvedValue('OK'),
      mGet: jest.fn().mockResolvedValue([]),
      mSet: jest.fn().mockResolvedValue('OK'),
      on: jest.fn()
    };

    // Mock require('redis')
    jest.doMock('redis', () => ({
      createClient: jest.fn().mockReturnValue(mockRedis)
    }));

    redisClient = new RedisClient('test-service', {
      host: 'localhost',
      port: 6379
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create RedisClient with default options', () => {
      const client = new RedisClient('test-service');
      
      expect(client.serviceName).toBe('test-service');
      expect(client.options.host).toBe('localhost');
      expect(client.options.port).toBe(6379);
    });

    it('should create RedisClient with custom options', () => {
      const options = {
        host: 'redis.example.com',
        port: 6380,
        password: 'secret'
      };
      
      const client = new RedisClient('test-service', options);
      
      expect(client.options.host).toBe('redis.example.com');
      expect(client.options.port).toBe(6380);
      expect(client.options.password).toBe('secret');
    });
  });

  describe('init', () => {
    it('should initialize Redis connection', async () => {
      await redisClient.init();
      
      expect(mockRedis.connect).toHaveBeenCalled();
      expect(redisClient.isConnected).toBe(true);
    });

    it('should not initialize if already connecting', async () => {
      redisClient.isConnecting = true;
      
      await redisClient.init();
      
      expect(mockRedis.connect).not.toHaveBeenCalled();
    });

    it('should not initialize if already connected', async () => {
      redisClient.isConnected = true;
      
      await redisClient.init();
      
      expect(mockRedis.connect).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Redis', async () => {
      redisClient.isConnected = true;
      
      await redisClient.disconnect();
      
      expect(mockRedis.disconnect).toHaveBeenCalled();
      expect(redisClient.isConnected).toBe(false);
    });

    it('should not disconnect if not connected', async () => {
      await redisClient.disconnect();
      
      expect(mockRedis.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      await redisClient.init();
    });

    it('should set a key-value pair', async () => {
      const result = await redisClient.set('test-key', { data: 'test-value' });
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        'test-service:test-key',
        JSON.stringify({ data: 'test-value' })
      );
      expect(result).toBe('OK');
    });

    it('should set a key-value pair with TTL', async () => {
      const result = await redisClient.set('test-key', { data: 'test-value' }, 3600);
      
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'test-service:test-key',
        3600,
        JSON.stringify({ data: 'test-value' })
      );
      expect(result).toBe('OK');
    });

    it('should handle serialization errors', async () => {
      const circularRef = {};
      circularRef.self = circularRef;
      
      await expect(redisClient.set('test-key', circularRef)).rejects.toThrow('Serialization failed');
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      await redisClient.init();
    });

    it('should get a value by key', async () => {
      const testData = { data: 'test-value' };
      mockRedis.get.mockResolvedValue(JSON.stringify(testData));
      
      const result = await redisClient.get('test-key');
      
      expect(mockRedis.get).toHaveBeenCalledWith('test-service:test-key');
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent key', async () => {
      mockRedis.get.mockResolvedValue(null);
      
      const result = await redisClient.get('non-existent-key');
      
      expect(result).toBeNull();
    });

    it('should handle deserialization of plain strings', async () => {
      mockRedis.get.mockResolvedValue('plain-string');
      
      const result = await redisClient.get('test-key');
      
      expect(result).toBe('plain-string');
    });
  });

  describe('del', () => {
    beforeEach(async () => {
      await redisClient.init();
    });

    it('should delete a key', async () => {
      const result = await redisClient.del('test-key');
      
      expect(mockRedis.del).toHaveBeenCalledWith('test-service:test-key');
      expect(result).toBe(1);
    });
  });

  describe('exists', () => {
    beforeEach(async () => {
      await redisClient.init();
    });

    it('should check if key exists', async () => {
      const result = await redisClient.exists('test-key');
      
      expect(mockRedis.exists).toHaveBeenCalledWith('test-service:test-key');
      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      mockRedis.exists.mockResolvedValue(0);
      
      const result = await redisClient.exists('non-existent-key');
      
      expect(result).toBe(false);
    });
  });

  describe('expire', () => {
    beforeEach(async () => {
      await redisClient.init();
    });

    it('should set expiration for a key', async () => {
      const result = await redisClient.expire('test-key', 3600);
      
      expect(mockRedis.expire).toHaveBeenCalledWith('test-service:test-key', 3600);
      expect(result).toBe(true);
    });

    it('should return false if key does not exist', async () => {
      mockRedis.expire.mockResolvedValue(0);
      
      const result = await redisClient.expire('non-existent-key', 3600);
      
      expect(result).toBe(false);
    });
  });

  describe('ttl', () => {
    beforeEach(async () => {
      await redisClient.init();
    });

    it('should get TTL for a key', async () => {
      const result = await redisClient.ttl('test-key');
      
      expect(mockRedis.ttl).toHaveBeenCalledWith('test-service:test-key');
      expect(result).toBe(3600);
    });
  });

  describe('keys', () => {
    beforeEach(async () => {
      await redisClient.init();
    });

    it('should get all keys matching pattern', async () => {
      const mockKeys = ['test-service:key1', 'test-service:key2'];
      mockRedis.keys.mockResolvedValue(mockKeys);
      
      const result = await redisClient.keys('*');
      
      expect(mockRedis.keys).toHaveBeenCalledWith('test-service:*');
      expect(result).toEqual(['key1', 'key2']);
    });
  });

  describe('mget', () => {
    beforeEach(async () => {
      await redisClient.init();
    });

    it('should get multiple values by keys', async () => {
      const mockValues = [JSON.stringify({ data: 'value1' }), JSON.stringify({ data: 'value2' })];
      mockRedis.mGet.mockResolvedValue(mockValues);
      
      const result = await redisClient.mget(['key1', 'key2']);
      
      expect(mockRedis.mGet).toHaveBeenCalledWith(['test-service:key1', 'test-service:key2']);
      expect(result).toEqual([{ data: 'value1' }, { data: 'value2' }]);
    });
  });

  describe('mset', () => {
    beforeEach(async () => {
      await redisClient.init();
    });

    it('should set multiple key-value pairs', async () => {
      const keyValuePairs = {
        key1: { data: 'value1' },
        key2: { data: 'value2' }
      };
      
      const result = await redisClient.mset(keyValuePairs);
      
      expect(mockRedis.mSet).toHaveBeenCalledWith({
        'test-service:key1': JSON.stringify({ data: 'value1' }),
        'test-service:key2': JSON.stringify({ data: 'value2' })
      });
      expect(result).toBe('OK');
    });

    it('should set multiple key-value pairs with TTL', async () => {
      const keyValuePairs = {
        key1: { data: 'value1' },
        key2: { data: 'value2' }
      };
      
      await redisClient.mset(keyValuePairs, 3600);
      
      expect(mockRedis.expire).toHaveBeenCalledTimes(2);
    });
  });

  describe('flushdb', () => {
    beforeEach(async () => {
      await redisClient.init();
    });

    it('should flush all keys', async () => {
      const result = await redisClient.flushdb();
      
      expect(mockRedis.flushdb).toHaveBeenCalled();
      expect(result).toBe('OK');
    });
  });

  describe('getStatus', () => {
    it('should return connection status', () => {
      const status = redisClient.getStatus();
      
      expect(status).toEqual({
        serviceName: 'test-service',
        isConnected: false,
        isConnecting: false,
        retryCount: 0,
        options: {
          host: 'localhost',
          port: 6379,
          db: 0
        }
      });
    });
  });

  describe('mock client fallback', () => {
    it('should use mock client when redis package is not available', () => {
      // Clear the module cache to test mock fallback
      jest.resetModules();
      
      // Mock require to throw error
      const originalRequire = require;
      jest.doMock('redis', () => {
        throw new Error('Module not found');
      });
      
      const RedisClient = require('../src/lib/redis-client');
      const client = new RedisClient('test-service');
      
      expect(client.client).toBeDefined();
      expect(typeof client.client.connect).toBe('function');
      expect(typeof client.client.get).toBe('function');
      expect(typeof client.client.set).toBe('function');
    });
  });
});
