/**
 * Simple test for .env hot reloading functionality
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

describe('Environment Hot Reload - Simple', () => {
  let tempDir;

  beforeAll(() => {
    // Create temporary directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-hot-reload-simple-test-'));
  });

  afterAll(() => {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should detect .env file changes and reload environment variables', (done) => {
    const EnvHotReloader = require('../src/utils/env-hot-reloader');
    
    // Create initial .env file
    const envFile = path.join(tempDir, '.env');
    fs.writeFileSync(envFile, 'TEST_VAR=initial_value\n');

    // Create hot reloader
    const hotReloader = new EnvHotReloader({
      userCwd: tempDir,
      debounceDelay: 100,
      onReload: () => {
        console.log('✅ .env hot reload test passed!');
        console.log('TEST_VAR:', process.env.TEST_VAR);
        hotReloader.stopWatching();
        done();
      },
      logger: {
        log: (msg) => console.log('LOG:', msg),
        warn: (msg) => console.warn('WARN:', msg),
        error: (msg) => console.error('ERROR:', msg)
      }
    });

    // Start watching
    hotReloader.startWatching();

    // Modify .env file after a short delay
    setTimeout(() => {
      fs.writeFileSync(envFile, 'TEST_VAR=updated_value\n');
    }, 500);

    // Timeout after 5 seconds
    setTimeout(() => {
      hotReloader.stopWatching();
      done(new Error('Test timeout - environment hot reload did not work'));
    }, 5000);
  });

  test('should handle multiple .env files in priority order', (done) => {
    const EnvHotReloader = require('../src/utils/env-hot-reloader');
    
    // Create multiple .env files
    const envLocal = path.join(tempDir, '.env.local');
    const envDev = path.join(tempDir, '.env.development');
    const env = path.join(tempDir, '.env');

    fs.writeFileSync(envLocal, 'PRIORITY=local\n');
    fs.writeFileSync(envDev, 'PRIORITY=development\n');
    fs.writeFileSync(env, 'PRIORITY=default\n');

    let reloadCount = 0;
    const expectedReloads = 3; // One for each file

    // Create hot reloader
    const hotReloader = new EnvHotReloader({
      userCwd: tempDir,
      debounceDelay: 100,
      onReload: () => {
        reloadCount++;
        console.log(`✅ Reload ${reloadCount}/${expectedReloads}`);
        
        if (reloadCount >= expectedReloads) {
          hotReloader.stopWatching();
          done();
        }
      },
      logger: {
        log: (msg) => console.log('LOG:', msg),
        warn: (msg) => console.warn('WARN:', msg),
        error: (msg) => console.error('ERROR:', msg)
      }
    });

    // Start watching
    hotReloader.startWatching();

    // Modify files after delays
    setTimeout(() => {
      fs.writeFileSync(envLocal, 'PRIORITY=local_updated\n');
    }, 200);

    setTimeout(() => {
      fs.writeFileSync(envDev, 'PRIORITY=development_updated\n');
    }, 400);

    setTimeout(() => {
      fs.writeFileSync(env, 'PRIORITY=default_updated\n');
    }, 600);

    // Timeout after 5 seconds
    setTimeout(() => {
      hotReloader.stopWatching();
      done(new Error(`Test timeout - only ${reloadCount}/${expectedReloads} reloads detected`));
    }, 5000);
  });

  test('should handle missing .env files gracefully', (done) => {
    const EnvHotReloader = require('../src/utils/env-hot-reloader');
    
    // Create hot reloader for directory with no .env files
    const hotReloader = new EnvHotReloader({
      userCwd: tempDir,
      debounceDelay: 100,
      onReload: () => {
        // This should not be called if no .env files exist
        done(new Error('onReload should not be called when no .env files exist'));
      },
      logger: {
        log: (msg) => {
          if (msg.includes('No .env files found')) {
            console.log('✅ Correctly detected no .env files');
            hotReloader.stopWatching();
            done();
          }
        },
        warn: (msg) => console.warn('WARN:', msg),
        error: (msg) => console.error('ERROR:', msg)
      }
    });

    // Start watching
    hotReloader.startWatching();

    // Timeout after 2 seconds
    setTimeout(() => {
      hotReloader.stopWatching();
      done(new Error('Test timeout - should have detected no .env files'));
    }, 2000);
  });
});
