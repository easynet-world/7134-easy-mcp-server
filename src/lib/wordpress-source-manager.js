/**
 * WordPressSourceManager - Source Key Management
 * 
 * Provides WordPress source key management functionality with:
 * - Source key management
 * - Redis-based duplicate detection
 * - Standardized response formatting
 * 
 * @author EasyNet World
 * @version 1.0.0
 */

const crypto = require('crypto');

class WordPressSourceManager {
  /**
   * Create a new WordPressSourceManager instance
   * @param {Object} redisClient - Redis client instance
   * @param {Object} logger - Logger instance (optional)
   * @param {Object} options - Configuration options
   * @param {string} options.keyPrefix - Key prefix for Redis (default: 'wp_source')
   * @param {number} options.defaultTTL - Default TTL in seconds (default: 86400)
   * @param {boolean} options.enableDuplicateDetection - Enable duplicate detection (default: true)
   */
  constructor(redisClient, logger = null, options = {}) {
    this.redis = redisClient;
    this.logger = logger;
    this.options = {
      keyPrefix: options.keyPrefix || 'wp_source',
      defaultTTL: options.defaultTTL || 86400, // 24 hours
      enableDuplicateDetection: options.enableDuplicateDetection !== false
    };
  }

  /**
   * Log a message with context
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @private
   */
  log(level, message) {
    if (this.logger && typeof this.logger[level] === 'function') {
      this.logger[level](`[WordPressSourceManager] ${message}`);
    } else {
      console.log(`[${level.toUpperCase()}] [WordPressSourceManager] ${message}`);
    }
  }

  /**
   * Generate a source key from content
   * @param {string} content - Content to generate key from
   * @param {Object} metadata - Additional metadata (optional)
   * @returns {string} Generated source key
   */
  generateSourceKey(content, metadata = {}) {
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');
    const metadataHash = Object.keys(metadata).length > 0 
      ? crypto.createHash('sha256').update(JSON.stringify(metadata)).digest('hex').substring(0, 8)
      : '';
    
    const sourceKey = `source_${contentHash.substring(0, 16)}${metadataHash ? `_${metadataHash}` : ''}`;
    
    this.log('debug', `Generated source key: ${sourceKey}`);
    return sourceKey;
  }

  /**
   * Store a source key with metadata
   * @param {string} sourceKey - Source key to store
   * @param {Object} metadata - Metadata to store
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} True if stored successfully
   */
  async storeSourceKey(sourceKey, metadata = {}, ttl = null) {
    try {
      const key = `${this.options.keyPrefix}:${sourceKey}`;
      const data = {
        sourceKey,
        metadata,
        createdAt: new Date().toISOString(),
        ttl: ttl || this.options.defaultTTL
      };

      await this.redis.set(key, data, ttl || this.options.defaultTTL);
      
      this.log('debug', `Stored source key: ${sourceKey}`);
      return true;
    } catch (error) {
      this.log('error', `Failed to store source key ${sourceKey}: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if a source key exists
   * @param {string} sourceKey - Source key to check
   * @returns {Promise<boolean>} True if source key exists
   */
  async sourceKeyExists(sourceKey) {
    try {
      const key = `${this.options.keyPrefix}:${sourceKey}`;
      const exists = await this.redis.exists(sourceKey);
      
      this.log('debug', `Checked source key existence: ${sourceKey} = ${exists}`);
      return exists;
    } catch (error) {
      this.log('error', `Failed to check source key existence ${sourceKey}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get source key metadata
   * @param {string} sourceKey - Source key to retrieve
   * @returns {Promise<Object|null>} Source key metadata or null if not found
   */
  async getSourceKeyMetadata(sourceKey) {
    try {
      const key = `${this.options.keyPrefix}:${sourceKey}`;
      const data = await this.redis.get(sourceKey);
      
      if (data) {
        this.log('debug', `Retrieved source key metadata: ${sourceKey}`);
        return data;
      }
      
      return null;
    } catch (error) {
      this.log('error', `Failed to get source key metadata ${sourceKey}: ${error.message}`);
      return null;
    }
  }

  /**
   * Delete a source key
   * @param {string} sourceKey - Source key to delete
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteSourceKey(sourceKey) {
    try {
      const key = `${this.options.keyPrefix}:${sourceKey}`;
      const deleted = await this.redis.del(sourceKey);
      
      this.log('debug', `Deleted source key: ${sourceKey} (deleted: ${deleted})`);
      return deleted > 0;
    } catch (error) {
      this.log('error', `Failed to delete source key ${sourceKey}: ${error.message}`);
      return false;
    }
  }

  /**
   * Check for duplicate content
   * @param {string} content - Content to check for duplicates
   * @param {Object} metadata - Additional metadata (optional)
   * @returns {Promise<Object>} Duplicate check result
   */
  async checkForDuplicate(content, metadata = {}) {
    if (!this.options.enableDuplicateDetection) {
      return {
        isDuplicate: false,
        sourceKey: null,
        existingMetadata: null
      };
    }

    try {
      const sourceKey = this.generateSourceKey(content, metadata);
      const exists = await this.sourceKeyExists(sourceKey);
      
      if (exists) {
        const existingMetadata = await this.getSourceKeyMetadata(sourceKey);
        
        this.log('info', `Duplicate content detected: ${sourceKey}`);
        return {
          isDuplicate: true,
          sourceKey,
          existingMetadata
        };
      }

      return {
        isDuplicate: false,
        sourceKey,
        existingMetadata: null
      };
    } catch (error) {
      this.log('error', `Failed to check for duplicate: ${error.message}`);
      return {
        isDuplicate: false,
        sourceKey: null,
        existingMetadata: null,
        error: error.message
      };
    }
  }

  /**
   * Register content as processed
   * @param {string} content - Content that was processed
   * @param {Object} metadata - Processing metadata
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<Object>} Registration result
   */
  async registerContent(content, metadata = {}, ttl = null) {
    try {
      const sourceKey = this.generateSourceKey(content, metadata);
      const stored = await this.storeSourceKey(sourceKey, metadata, ttl);
      
      if (stored) {
        this.log('info', `Registered content: ${sourceKey}`);
        return {
          success: true,
          sourceKey,
          metadata
        };
      } else {
        return {
          success: false,
          sourceKey,
          error: 'Failed to store source key'
        };
      }
    } catch (error) {
      this.log('error', `Failed to register content: ${error.message}`);
      return {
        success: false,
        sourceKey: null,
        error: error.message
      };
    }
  }

  /**
   * Get all source keys for a service
   * @param {string} serviceName - Service name to filter by (optional)
   * @returns {Promise<Array>} Array of source keys
   */
  async getAllSourceKeys(serviceName = null) {
    try {
      const pattern = serviceName 
        ? `${this.options.keyPrefix}:source_*_${serviceName}*`
        : `${this.options.keyPrefix}:source_*`;
      
      const keys = await this.redis.keys(pattern);
      const sourceKeys = keys.map(key => key.replace(`${this.options.keyPrefix}:`, ''));
      
      this.log('debug', `Retrieved ${sourceKeys.length} source keys`);
      return sourceKeys;
    } catch (error) {
      this.log('error', `Failed to get all source keys: ${error.message}`);
      return [];
    }
  }

  /**
   * Get source key statistics
   * @returns {Promise<Object>} Source key statistics
   */
  async getStatistics() {
    try {
      const allKeys = await this.getAllSourceKeys();
      const totalKeys = allKeys.length;
      
      // Get TTL information for a sample of keys
      const sampleSize = Math.min(10, totalKeys);
      const sampleKeys = allKeys.slice(0, sampleSize);
      const ttlInfo = [];
      
      for (const key of sampleKeys) {
        const ttl = await this.redis.ttl(key);
        ttlInfo.push(ttl);
      }
      
      const avgTTL = ttlInfo.length > 0 
        ? ttlInfo.reduce((sum, ttl) => sum + ttl, 0) / ttlInfo.length 
        : 0;
      
      return {
        totalSourceKeys: totalKeys,
        averageTTL: Math.round(avgTTL),
        keyPrefix: this.options.keyPrefix,
        defaultTTL: this.options.defaultTTL,
        duplicateDetectionEnabled: this.options.enableDuplicateDetection
      };
    } catch (error) {
      this.log('error', `Failed to get statistics: ${error.message}`);
      return {
        totalSourceKeys: 0,
        averageTTL: 0,
        keyPrefix: this.options.keyPrefix,
        defaultTTL: this.options.defaultTTL,
        duplicateDetectionEnabled: this.options.enableDuplicateDetection,
        error: error.message
      };
    }
  }

  /**
   * Clean up expired source keys
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupExpiredKeys() {
    try {
      const allKeys = await this.getAllSourceKeys();
      let cleanedCount = 0;
      
      for (const sourceKey of allKeys) {
        const ttl = await this.redis.ttl(sourceKey);
        if (ttl === -2) { // Key doesn't exist (expired)
          cleanedCount++;
        }
      }
      
      this.log('info', `Cleaned up ${cleanedCount} expired source keys`);
      return {
        success: true,
        cleanedCount,
        totalKeys: allKeys.length
      };
    } catch (error) {
      this.log('error', `Failed to cleanup expired keys: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a standardized response for WordPress operations
   * @param {boolean} success - Operation success status
   * @param {Object} data - Response data
   * @param {string} message - Response message
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Standardized response
   */
  createResponse(success, data = null, message = '', metadata = {}) {
    return {
      success,
      message,
      timestamp: new Date().toISOString(),
      data,
      metadata: {
        service: 'WordPressSourceManager',
        ...metadata
      }
    };
  }

  /**
   * Create a success response
   * @param {Object} data - Response data
   * @param {string} message - Success message
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Success response
   */
  createSuccessResponse(data = null, message = 'Operation completed successfully', metadata = {}) {
    return this.createResponse(true, data, message, metadata);
  }

  /**
   * Create an error response
   * @param {string} message - Error message
   * @param {Object} data - Error data
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Error response
   */
  createErrorResponse(message = 'Operation failed', data = null, metadata = {}) {
    return this.createResponse(false, data, message, metadata);
  }

  /**
   * Validate content for processing
   * @param {string} content - Content to validate
   * @param {Object} metadata - Content metadata
   * @returns {Object} Validation result
   */
  validateContent(content, metadata = {}) {
    const errors = [];
    
    if (!content || typeof content !== 'string') {
      errors.push('Content must be a non-empty string');
    }
    
    if (content && content.length < 10) {
      errors.push('Content must be at least 10 characters long');
    }
    
    if (content && content.length > 100000) {
      errors.push('Content must be less than 100,000 characters');
    }
    
    if (metadata && typeof metadata !== 'object') {
      errors.push('Metadata must be an object');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get configuration information
   * @returns {Object} Configuration information
   */
  getConfig() {
    return {
      keyPrefix: this.options.keyPrefix,
      defaultTTL: this.options.defaultTTL,
      enableDuplicateDetection: this.options.enableDuplicateDetection,
      redisConnected: this.redis ? this.redis.isConnected : false
    };
  }
}

module.exports = WordPressSourceManager;
