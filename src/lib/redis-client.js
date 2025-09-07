/**
 * RedisClient - Redis Connection Management
 * 
 * Provides Redis client functionality with:
 * - Connection management with automatic reconnection
 * - Structured logging for Redis operations
 * - Error handling and fallback mechanisms
 * - Service-specific key namespacing
 * - JSON serialization/deserialization
 * 
 * @author EasyNet World
 * @version 1.0.0
 */

const EventEmitter = require('events');

class RedisClient extends EventEmitter {
  /**
   * Create a new RedisClient instance
   * @param {string} serviceName - Name of the service for namespacing
   * @param {Object} options - Redis connection options
   * @param {string} options.host - Redis host (default: 'localhost')
   * @param {number} options.port - Redis port (default: 6379)
   * @param {string} options.password - Redis password (optional)
   * @param {number} options.db - Redis database number (default: 0)
   * @param {number} options.retryDelayOnFailover - Retry delay in ms (default: 100)
   * @param {number} options.maxRetriesPerRequest - Max retries per request (default: 3)
   * @param {boolean} options.lazyConnect - Lazy connect (default: true)
   * @param {Object} logger - Logger instance (optional)
   */
  constructor(serviceName, options = {}, logger = null) {
    super();
    
    this.serviceName = serviceName;
    this.logger = logger;
    this.isConnected = false;
    this.isConnecting = false;
    this.retryCount = 0;
    this.maxRetries = options.maxRetries || 5;
    
    // Default Redis options
    this.options = {
      host: options.host || process.env.REDIS_HOST || 'localhost',
      port: options.port || parseInt(process.env.REDIS_PORT) || 6379,
      password: options.password || process.env.REDIS_PASSWORD,
      db: options.db || parseInt(process.env.REDIS_DB) || 0,
      retryDelayOnFailover: options.retryDelayOnFailover || 100,
      maxRetriesPerRequest: options.maxRetriesPerRequest || 3,
      lazyConnect: options.lazyConnect !== false,
      ...options
    };

    // Initialize Redis client (will be set when redis package is available)
    this.client = null;
    this.initializeClient();
  }

  /**
   * Initialize Redis client
   * @private
   */
  initializeClient() {
    try {
      // Try to require redis package
      const redis = require('redis');
      
      this.client = redis.createClient({
        socket: {
          host: this.options.host,
          port: this.options.port,
          reconnectStrategy: (retries) => {
            if (retries > this.maxRetries) {
              this.log('error', `Redis connection failed after ${retries} retries`);
              return new Error('Redis connection failed');
            }
            return Math.min(retries * 50, 500);
          }
        },
        password: this.options.password,
        database: this.options.db
      });

      this.setupEventHandlers();
    } catch (error) {
      this.log('warn', 'Redis package not available, running in mock mode');
      this.client = this.createMockClient();
    }
  }

  /**
   * Create a mock Redis client for when redis package is not available
   * @returns {Object} Mock Redis client
   * @private
   */
  createMockClient() {
    const mockData = new Map();
    
    return {
      connect: async () => {
        this.log('info', 'Mock Redis client connected');
        this.isConnected = true;
        this.emit('connect');
      },
      disconnect: async () => {
        this.log('info', 'Mock Redis client disconnected');
        this.isConnected = false;
        this.emit('disconnect');
      },
      get: async (key) => {
        const value = mockData.get(key);
        this.log('debug', `Mock Redis GET: ${key} = ${value ? 'exists' : 'null'}`);
        return value;
      },
      set: async (key, value, options = {}) => {
        mockData.set(key, value);
        this.log('debug', `Mock Redis SET: ${key}`);
        return 'OK';
      },
      del: async (key) => {
        const existed = mockData.has(key);
        mockData.delete(key);
        this.log('debug', `Mock Redis DEL: ${key}`);
        return existed ? 1 : 0;
      },
      exists: async (key) => {
        const exists = mockData.has(key);
        this.log('debug', `Mock Redis EXISTS: ${key} = ${exists}`);
        return exists ? 1 : 0;
      },
      expire: async (key, seconds) => {
        // Mock implementation - just return OK
        this.log('debug', `Mock Redis EXPIRE: ${key} for ${seconds}s`);
        return 1;
      },
      ttl: async (key) => {
        // Mock implementation - return -1 (no expiry)
        this.log('debug', `Mock Redis TTL: ${key} = -1`);
        return -1;
      },
      keys: async (pattern) => {
        const matchingKeys = Array.from(mockData.keys()).filter(key => 
          pattern === '*' || key.includes(pattern.replace('*', ''))
        );
        this.log('debug', `Mock Redis KEYS: ${pattern} = ${matchingKeys.length} matches`);
        return matchingKeys;
      },
      flushdb: async () => {
        mockData.clear();
        this.log('debug', 'Mock Redis FLUSHDB');
        return 'OK';
      }
    };
  }

  /**
   * Setup Redis event handlers
   * @private
   */
  setupEventHandlers() {
    if (!this.client || !this.client.on) return;

    this.client.on('connect', () => {
      this.log('info', 'Redis client connected');
      this.isConnected = true;
      this.retryCount = 0;
      this.emit('connect');
    });

    this.client.on('ready', () => {
      this.log('info', 'Redis client ready');
      this.emit('ready');
    });

    this.client.on('error', (error) => {
      this.log('error', `Redis client error: ${error.message}`);
      this.isConnected = false;
      this.emit('error', error);
    });

    this.client.on('end', () => {
      this.log('info', 'Redis client connection ended');
      this.isConnected = false;
      this.emit('disconnect');
    });

    this.client.on('reconnecting', () => {
      this.log('info', 'Redis client reconnecting...');
      this.emit('reconnecting');
    });
  }

  /**
   * Initialize Redis connection
   * @returns {Promise<void>}
   */
  async init() {
    if (this.isConnecting) {
      return new Promise((resolve) => {
        this.once('connect', resolve);
      });
    }

    if (this.isConnected) {
      return;
    }

    this.isConnecting = true;
    
    try {
      await this.client.connect();
      this.log('info', `Redis client initialized for service: ${this.serviceName}`);
    } catch (error) {
      this.log('error', `Failed to initialize Redis client: ${error.message}`);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Disconnect from Redis
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.disconnect();
      this.log('info', 'Redis client disconnected');
    } catch (error) {
      this.log('error', `Error disconnecting Redis client: ${error.message}`);
    }
  }

  /**
   * Get a namespaced key
   * @param {string} key - The key to namespace
   * @returns {string} Namespaced key
   * @private
   */
  getNamespacedKey(key) {
    return `${this.serviceName}:${key}`;
  }

  /**
   * Serialize value to JSON string
   * @param {any} value - Value to serialize
   * @returns {string} JSON string
   * @private
   */
  serialize(value) {
    try {
      return JSON.stringify(value);
    } catch (error) {
      this.log('error', `Failed to serialize value: ${error.message}`);
      throw new Error('Serialization failed');
    }
  }

  /**
   * Deserialize JSON string to value
   * @param {string} value - JSON string to deserialize
   * @returns {any} Deserialized value
   * @private
   */
  deserialize(value) {
    if (value === null || value === undefined) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      // If parsing fails, return the original value (might be a plain string)
      return value;
    }
  }

  /**
   * Set a key-value pair with optional expiration
   * @param {string} key - The key
   * @param {any} value - The value (will be JSON serialized)
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<string>} Redis response
   */
  async set(key, value, ttl = null) {
    await this.ensureConnected();
    
    const namespacedKey = this.getNamespacedKey(key);
    const serializedValue = this.serialize(value);
    
    try {
      let result;
      if (ttl) {
        result = await this.client.setEx(namespacedKey, ttl, serializedValue);
      } else {
        result = await this.client.set(namespacedKey, serializedValue);
      }
      
      this.log('debug', `Redis SET: ${namespacedKey} (TTL: ${ttl || 'none'})`);
      return result;
    } catch (error) {
      this.log('error', `Redis SET failed for ${namespacedKey}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a value by key
   * @param {string} key - The key
   * @returns {Promise<any>} The value (deserialized)
   */
  async get(key) {
    await this.ensureConnected();
    
    const namespacedKey = this.getNamespacedKey(key);
    
    try {
      const value = await this.client.get(namespacedKey);
      const deserializedValue = this.deserialize(value);
      
      this.log('debug', `Redis GET: ${namespacedKey} = ${value ? 'exists' : 'null'}`);
      return deserializedValue;
    } catch (error) {
      this.log('error', `Redis GET failed for ${namespacedKey}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a key
   * @param {string} key - The key to delete
   * @returns {Promise<number>} Number of keys deleted
   */
  async del(key) {
    await this.ensureConnected();
    
    const namespacedKey = this.getNamespacedKey(key);
    
    try {
      const result = await this.client.del(namespacedKey);
      this.log('debug', `Redis DEL: ${namespacedKey} (deleted: ${result})`);
      return result;
    } catch (error) {
      this.log('error', `Redis DEL failed for ${namespacedKey}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a key exists
   * @param {string} key - The key to check
   * @returns {Promise<boolean>} True if key exists
   */
  async exists(key) {
    await this.ensureConnected();
    
    const namespacedKey = this.getNamespacedKey(key);
    
    try {
      const result = await this.client.exists(namespacedKey);
      const exists = result === 1;
      this.log('debug', `Redis EXISTS: ${namespacedKey} = ${exists}`);
      return exists;
    } catch (error) {
      this.log('error', `Redis EXISTS failed for ${namespacedKey}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set expiration time for a key
   * @param {string} key - The key
   * @param {number} seconds - Expiration time in seconds
   * @returns {Promise<boolean>} True if expiration was set
   */
  async expire(key, seconds) {
    await this.ensureConnected();
    
    const namespacedKey = this.getNamespacedKey(key);
    
    try {
      const result = await this.client.expire(namespacedKey, seconds);
      const success = result === 1;
      this.log('debug', `Redis EXPIRE: ${namespacedKey} for ${seconds}s (success: ${success})`);
      return success;
    } catch (error) {
      this.log('error', `Redis EXPIRE failed for ${namespacedKey}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get time to live for a key
   * @param {string} key - The key
   * @returns {Promise<number>} TTL in seconds (-1 if no expiry, -2 if key doesn't exist)
   */
  async ttl(key) {
    await this.ensureConnected();
    
    const namespacedKey = this.getNamespacedKey(key);
    
    try {
      const result = await this.client.ttl(namespacedKey);
      this.log('debug', `Redis TTL: ${namespacedKey} = ${result}s`);
      return result;
    } catch (error) {
      this.log('error', `Redis TTL failed for ${namespacedKey}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all keys matching a pattern
   * @param {string} pattern - The pattern to match (use * for wildcard)
   * @returns {Promise<Array<string>>} Array of matching keys (without namespace)
   */
  async keys(pattern = '*') {
    await this.ensureConnected();
    
    const namespacedPattern = this.getNamespacedKey(pattern);
    
    try {
      const keys = await this.client.keys(namespacedPattern);
      // Remove namespace prefix from returned keys
      const unnamespacedKeys = keys.map(key => 
        key.replace(`${this.serviceName}:`, '')
      );
      
      this.log('debug', `Redis KEYS: ${namespacedPattern} = ${unnamespacedKeys.length} matches`);
      return unnamespacedKeys;
    } catch (error) {
      this.log('error', `Redis KEYS failed for ${namespacedPattern}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Flush all keys for this service
   * @returns {Promise<string>} Redis response
   */
  async flushdb() {
    await this.ensureConnected();
    
    try {
      const result = await this.client.flushdb();
      this.log('info', `Redis FLUSHDB completed for service: ${this.serviceName}`);
      return result;
    } catch (error) {
      this.log('error', `Redis FLUSHDB failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get multiple values by keys
   * @param {Array<string>} keys - Array of keys
   * @returns {Promise<Array<any>>} Array of values (deserialized)
   */
  async mget(keys) {
    await this.ensureConnected();
    
    const namespacedKeys = keys.map(key => this.getNamespacedKey(key));
    
    try {
      const values = await this.client.mGet(namespacedKeys);
      const deserializedValues = values.map(value => this.deserialize(value));
      
      this.log('debug', `Redis MGET: ${keys.length} keys`);
      return deserializedValues;
    } catch (error) {
      this.log('error', `Redis MGET failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set multiple key-value pairs
   * @param {Object} keyValuePairs - Object with key-value pairs
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<string>} Redis response
   */
  async mset(keyValuePairs, ttl = null) {
    await this.ensureConnected();
    
    const namespacedPairs = {};
    for (const [key, value] of Object.entries(keyValuePairs)) {
      namespacedPairs[this.getNamespacedKey(key)] = this.serialize(value);
    }
    
    try {
      const result = await this.client.mSet(namespacedPairs);
      
      // Set TTL for all keys if specified
      if (ttl) {
        for (const key of Object.keys(keyValuePairs)) {
          await this.expire(key, ttl);
        }
      }
      
      this.log('debug', `Redis MSET: ${Object.keys(keyValuePairs).length} pairs`);
      return result;
    } catch (error) {
      this.log('error', `Redis MSET failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ensure Redis client is connected
   * @returns {Promise<void>}
   * @private
   */
  async ensureConnected() {
    if (!this.isConnected && !this.isConnecting) {
      await this.init();
    }
    
    if (!this.isConnected) {
      throw new Error('Redis client is not connected');
    }
  }

  /**
   * Log a message with service context
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @private
   */
  log(level, message) {
    if (this.logger && typeof this.logger[level] === 'function') {
      this.logger[level](`[RedisClient:${this.serviceName}] ${message}`);
    } else {
      console.log(`[${level.toUpperCase()}] [RedisClient:${this.serviceName}] ${message}`);
    }
  }

  /**
   * Get connection status
   * @returns {Object} Connection status information
   */
  getStatus() {
    return {
      serviceName: this.serviceName,
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      retryCount: this.retryCount,
      options: {
        host: this.options.host,
        port: this.options.port,
        db: this.options.db
      }
    };
  }
}

module.exports = RedisClient;
