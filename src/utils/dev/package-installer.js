/**
 * Package Installer for Hot Reload
 * Handles automatic npm package installation during hot reload
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class PackageInstaller {
  constructor(options = {}) {
    this.userCwd = options.userCwd || process.cwd();
    this.logger = options.logger || console;
    this.installTimeout = options.installTimeout || 30000; // 30 seconds
    this.isInstalling = false;
    this.installQueue = [];
    this.lastInstallTime = 0;
    this.minInstallInterval = 5000; // Minimum 5 seconds between installs
  }

  /**
   * Check if package.json exists
   */
  hasPackageJson() {
    const packageJsonPath = path.join(this.userCwd, 'package.json');
    return fs.existsSync(packageJsonPath);
  }

  /**
   * Install packages asynchronously
   */
  async installPackages(packages = [], options = {}) {
    if (!this.hasPackageJson()) {
      this.logger.log('📦 No package.json found - skipping package installation');
      return { success: false, reason: 'no-package-json' };
    }

    // Check if we're already installing
    if (this.isInstalling) {
      this.logger.log('📦 Package installation already in progress - queuing request');
      return new Promise((resolve) => {
        this.installQueue.push({ packages, options, resolve });
      });
    }

    // Check minimum interval between installs
    const now = Date.now();
    if (now - this.lastInstallTime < this.minInstallInterval) {
      this.logger.log('📦 Too soon since last install - queuing request');
      return new Promise((resolve) => {
        this.installQueue.push({ packages, options, resolve });
      });
    }

    this.isInstalling = true;
    this.lastInstallTime = now;

    try {
      this.logger.log('📦 Installing packages for hot reload...');
      
      const result = await this.runNpmInstall(packages, options);
      
      // Process queued installs
      if (this.installQueue.length > 0) {
        this.logger.log(`📦 Processing ${this.installQueue.length} queued install requests`);
        const queuedItems = [...this.installQueue];
        this.installQueue = [];
        
        // Process queued items (but don't wait for them)
        queuedItems.forEach(item => {
          this.installPackages(item.packages, item.options)
            .then(item.resolve)
            .catch(item.resolve);
        });
      }
      
      return result;
    } finally {
      this.isInstalling = false;
    }
  }

  /**
   * Run npm install command
   */
  async runNpmInstall(packages = [], options = {}) {
    return new Promise((resolve) => {
      const args = ['install'];
      
      // Add specific packages if provided
      if (packages.length > 0) {
        args.push(...packages);
      }
      
      // Add options
      if (options.save) {
        args.push('--save');
      }
      if (options.saveDev) {
        args.push('--save-dev');
      }
      if (options.production) {
        args.push('--production');
      }
      if (options.silent) {
        args.push('--silent');
      }

      this.logger.log(`📦 Running: npm ${args.join(' ')}`);
      
      const installProcess = spawn('npm', args, {
        cwd: this.userCwd,
        stdio: options.silent ? 'pipe' : 'inherit',
        timeout: this.installTimeout
      });

      let stdout = '';
      let stderr = '';

      if (options.silent) {
        installProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        installProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      installProcess.on('close', (code) => {
        if (code === 0) {
          this.logger.log('✅ Package installation completed successfully');
          resolve({ 
            success: true, 
            code, 
            stdout: options.silent ? stdout : undefined,
            stderr: options.silent ? stderr : undefined
          });
        } else {
          this.logger.warn(`⚠️  Package installation completed with code ${code}`);
          resolve({ 
            success: false, 
            code, 
            stdout: options.silent ? stdout : undefined,
            stderr: options.silent ? stderr : undefined,
            reason: 'install-failed'
          });
        }
      });

      installProcess.on('error', (error) => {
        this.logger.warn(`⚠️  Could not run npm install: ${error.message}`);
        resolve({ 
          success: false, 
          error: error.message,
          reason: 'spawn-failed'
        });
      });

      // Handle timeout
      if (this.installTimeout > 0) {
        setTimeout(() => {
          if (!installProcess.killed) {
            this.logger.warn('⚠️  Package installation timed out - killing process');
            installProcess.kill('SIGTERM');
            resolve({ 
              success: false, 
              reason: 'timeout'
            });
          }
        }, this.installTimeout);
      }
    });
  }

  /**
   * Check if a package is installed
   */
  isPackageInstalled(packageName) {
    try {
      const packagePath = path.join(this.userCwd, 'node_modules', packageName);
      return fs.existsSync(packagePath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get installed package version
   */
  getPackageVersion(packageName) {
    try {
      const packagePath = path.join(this.userCwd, 'node_modules', packageName, 'package.json');
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        return packageJson.version;
      }
    } catch (error) {
      // Ignore errors
    }
    return null;
  }

  /**
   * Install missing packages for a specific API file
   */
  async installMissingPackagesForFile(filePath, requiredPackages = []) {
    if (requiredPackages.length === 0) {
      return { success: true, installed: [] };
    }

    const missingPackages = requiredPackages.filter(pkg => !this.isPackageInstalled(pkg));
    
    if (missingPackages.length === 0) {
      this.logger.log('📦 All required packages are already installed');
      return { success: true, installed: [] };
    }

    this.logger.log(`📦 Installing missing packages: ${missingPackages.join(', ')}`);
    
    const result = await this.installPackages(missingPackages, { 
      save: true,
      silent: false 
    });

    if (result.success) {
      this.logger.log(`✅ Successfully installed: ${missingPackages.join(', ')}`);
      return { success: true, installed: missingPackages };
    } else {
      this.logger.warn(`⚠️  Failed to install packages: ${missingPackages.join(', ')}`);
      return { success: false, failed: missingPackages, reason: result.reason };
    }
  }

  /**
   * Set installation timeout
   */
  setInstallTimeout(timeout) {
    this.installTimeout = Math.max(0, timeout);
  }

  /**
   * Set minimum interval between installs
   */
  setMinInstallInterval(interval) {
    this.minInstallInterval = Math.max(1000, interval);
  }

  /**
   * Get installation status
   */
  getStatus() {
    return {
      isInstalling: this.isInstalling,
      queueLength: this.installQueue.length,
      hasPackageJson: this.hasPackageJson(),
      lastInstallTime: this.lastInstallTime,
      installTimeout: this.installTimeout,
      minInstallInterval: this.minInstallInterval
    };
  }

  /**
   * Clear installation queue
   */
  clearQueue() {
    this.installQueue = [];
  }
}

module.exports = PackageInstaller;
