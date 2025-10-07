/**
 * Package Detector for API Files
 * Analyzes API files to detect required npm packages
 */

const fs = require('fs');

class PackageDetector {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.knownPackages = new Set([
      // Common packages that might be used in APIs
      'express', 'cors', 'helmet', 'morgan', 'compression',
      'lodash', 'moment', 'axios', 'request', 'node-fetch',
      'mysql', 'pg', 'mongodb', 'mongoose', 'sequelize',
      'redis', 'ioredis', 'memcached',
      'jsonwebtoken', 'bcrypt', 'passport',
      'multer', 'sharp', 'jimp',
      'ws', 'socket.io', 'ws',
      'cheerio', 'puppeteer', 'playwright',
      'nodemailer', 'twilio', 'stripe',
      'aws-sdk', 'google-cloud', 'azure',
      'anthropic', 'cohere',
      'uuid', 'crypto', 'crypto-js',
      'validator', 'joi', 'yup',
      'winston', 'pino', 'bunyan',
      'dotenv', 'config',
      'cron', 'node-cron',
      'csv-parser', 'xlsx', 'pdf-lib',
      'qrcode', 'barcode',
      'date-fns', 'dayjs',
      'ramda', 'underscore',
      'bluebird', 'async',
      'chalk', 'colors', 'cli-color',
      'inquirer', 'commander', 'yargs',
      'nodemon', 'pm2',
      'jest', 'mocha', 'chai', 'supertest',
      'eslint', 'prettier'
    ]);
  }

  /**
   * Detect required packages from a file
   */
  detectPackagesFromFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }

      const content = fs.readFileSync(filePath, 'utf8');
      return this.detectPackagesFromContent(content);
    } catch (error) {
      this.logger.warn(`⚠️  Could not read file ${filePath}: ${error.message}`);
      return [];
    }
  }

  /**
   * Detect required packages from file content
   */
  detectPackagesFromContent(content) {
    const packages = new Set();
    
    // Match require() statements
    const requireMatches = content.match(/require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g);
    if (requireMatches) {
      requireMatches.forEach(match => {
        const packageMatch = match.match(/require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
        if (packageMatch) {
          const packageName = this.extractPackageName(packageMatch[1]);
          if (packageName && this.isNpmPackage(packageName)) {
            packages.add(packageName);
          }
        }
      });
    }

    // Match import statements
    const importMatches = content.match(/import\s+.*\s+from\s+['"`]([^'"`]+)['"`]/g);
    if (importMatches) {
      importMatches.forEach(match => {
        const packageMatch = match.match(/from\s+['"`]([^'"`]+)['"`]/);
        if (packageMatch) {
          const packageName = this.extractPackageName(packageMatch[1]);
          if (packageName && this.isNpmPackage(packageName)) {
            packages.add(packageName);
          }
        }
      });
    }

    // Match dynamic require statements
    const dynamicRequireMatches = content.match(/require\s*\(\s*[^'"`)]+\s*\)/g);
    if (dynamicRequireMatches) {
      // This is harder to parse, but we can look for common patterns
      dynamicRequireMatches.forEach(match => {
        // Look for string concatenation patterns
        const stringMatches = match.match(/['"`]([^'"`]+)['"`]/g);
        if (stringMatches) {
          stringMatches.forEach(str => {
            const packageName = this.extractPackageName(str.replace(/['"`]/g, ''));
            if (packageName && this.isNpmPackage(packageName)) {
              packages.add(packageName);
            }
          });
        }
      });
    }

    return Array.from(packages);
  }

  /**
   * Extract package name from require/import path
   */
  extractPackageName(path) {
    // Remove any leading/trailing quotes
    const packageName = path.replace(/^['"`]|['"`]$/g, '');
    
    // Handle scoped packages (@scope/package)
    if (packageName.startsWith('@')) {
      const parts = packageName.split('/');
      if (parts.length >= 2) {
        return parts.slice(0, 2).join('/');
      }
    }
    
    // Handle regular packages
    const parts = packageName.split('/');
    return parts[0];
  }

  /**
   * Check if a string looks like an npm package name
   */
  isNpmPackage(packageName) {
    // Skip relative paths
    if (packageName.startsWith('.') || packageName.startsWith('/')) {
      return false;
    }

    // Skip built-in Node.js modules
    const builtInModules = [
      'fs', 'path', 'url', 'http', 'https', 'crypto', 'util', 'stream',
      'events', 'os', 'child_process', 'cluster', 'net', 'tls', 'dgram',
      'dns', 'readline', 'repl', 'vm', 'zlib', 'querystring', 'string_decoder',
      'timers', 'tty', 'v8', 'worker_threads', 'perf_hooks', 'async_hooks',
      'buffer', 'console', 'process', 'assert', 'constants', 'domain',
      'punycode', 'tls', 'tty', 'url', 'util', 'v8', 'vm', 'worker_threads'
    ];

    if (builtInModules.includes(packageName)) {
      return false;
    }

    // Check if it's a known package or follows npm naming conventions
    if (this.knownPackages.has(packageName)) {
      return true;
    }

    // Check npm naming conventions
    // Package names can contain lowercase letters, numbers, hyphens, and underscores
    // Scoped packages start with @
    const npmNamePattern = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
    return npmNamePattern.test(packageName);
  }

  /**
   * Detect packages from multiple files
   */
  detectPackagesFromFiles(filePaths) {
    const allPackages = new Set();
    
    filePaths.forEach(filePath => {
      const packages = this.detectPackagesFromFile(filePath);
      packages.forEach(pkg => allPackages.add(pkg));
    });

    return Array.from(allPackages);
  }

  /**
   * Add known package
   */
  addKnownPackage(packageName) {
    this.knownPackages.add(packageName);
  }

  /**
   * Add multiple known packages
   */
  addKnownPackages(packages) {
    packages.forEach(pkg => this.knownPackages.add(pkg));
  }

  /**
   * Get all known packages
   */
  getKnownPackages() {
    return Array.from(this.knownPackages);
  }

  /**
   * Check if package is known
   */
  isKnownPackage(packageName) {
    return this.knownPackages.has(packageName);
  }
}

module.exports = PackageDetector;
