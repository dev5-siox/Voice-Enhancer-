import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for VoicePro audio quality tests
 * 
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './',
  
  // Maximum time one test can run (2 minutes per test)
  timeout: 120 * 1000,
  
  // Fail fast - stop after first failure for quick feedback during development
  // Set to undefined or remove to run all tests even after failures
  // fullyParallel: false,
  
  // Retry failed tests once (helps with flaky tests)
  retries: process.env.CI ? 2 : 1,
  
  // Only run tests on one worker to avoid audio device conflicts
  workers: 1,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'results/test-results.json' }],
    ['list']
  ],
  
  use: {
    // Base URL for the app
    baseURL: 'http://localhost:5000',
    
    // Collect trace on failure for debugging
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video recording
    video: 'retain-on-failure',
    
    // Browser context options
    permissions: ['microphone', 'camera'],
    
    // Viewport size
    viewport: { width: 1280, height: 720 },
    
    // Ignore HTTPS errors (for local development)
    ignoreHTTPSErrors: true,
  },

  // Configure projects for different browsers (audio testing works best in Chrome)
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--use-fake-device-for-media-stream',
            '--use-fake-ui-for-media-stream',
            '--autoplay-policy=no-user-gesture-required',
          ]
        }
      },
    },
    
    // Uncomment to test in other browsers (may have limited audio support)
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run local dev server before starting the tests
  // Comment out if server is already running manually
  // webServer: {
  //   command: 'cd .. && $env:NODE_ENV="development"; npx tsx server/index.ts',
  //   url: 'http://localhost:5000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  //   stdout: 'pipe',
  //   stderr: 'pipe',
  // },
});
