require('dotenv').config();

module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },

  // API Configuration
  api: {
    path: process.env.API_PATH || './api',
    prefix: process.env.API_PREFIX || '/api',
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: process.env.CORS_CREDENTIALS === 'true'
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'colored'
  },

  // File Watching Configuration
  fileWatcher: {
    delay: parseInt(process.env.WATCH_DELAY) || 100,
    ignored: process.env.WATCH_IGNORED_PATTERNS ? 
      process.env.WATCH_IGNORED_PATTERNS.split(',') : 
      ['node_modules', '.git', '.env']
  },

  // Security Configuration
  security: {
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    }
  },

  // Database Configuration (for future use)
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'dynamic_api',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },

  // JWT Configuration (for future use)
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  }
};
