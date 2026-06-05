// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright Configuration for Universal POS System
 * 
 * Tests run against the Vite dev server on port 5173.
 * Backend API expected on port 3000.
 * 
 * Usage:
 *   npm test              - Run all tests headless
 *   npm run test:headed   - Run with browser visible
 *   npm run test:ui       - Run with Playwright UI
 */
module.exports = defineConfig({
  testDir: './tests',
  
  /* Maximum time one test can run */
  timeout: 60_000,
  
  /* Expect timeout for assertions */
  expect: {
    timeout: 10_000,
  },

  /* Run tests sequentially in CI, parallel locally */
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry failed tests once */
  retries: process.env.CI ? 2 : 1,

  /* Single worker for POS tests (shared database state) */
  workers: 1,

  /* Reporter configuration */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  /* Shared settings for all projects */
  use: {
    /* Base URL for the Vite dev server */
    baseURL: 'http://localhost:5173',

    /* API base URL for backend */
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },

    /* Collect trace on first retry */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'on-first-retry',

    /* Default viewport - typical POS screen */
    viewport: { width: 1366, height: 768 },

    /* Reasonable navigation timeout */
    navigationTimeout: 15_000,
  },

  /* Test projects / browser configurations */
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 },
      },
    },
    {
      name: 'tablet-landscape',
      use: {
        ...devices['iPad Pro 11 landscape'],
      },
    },
  ],

  /* Web server configuration - start both backend and frontend */
  webServer: [
    {
      command: 'cd ../server && npm start',
      url: 'http://localhost:3000/',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'cd ../client && npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
