import { defineConfig, devices } from '@playwright/test';

const isPreviewMode = process.env.PW_PREVIEW === '1';
const isDebugMode = process.env.PW_LOG === '1' || isPreviewMode;

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  preserveOutput: 'always',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['./tools/log-reporter.ts'],
    ['./tools/agent-reporter.ts'],
  ],
  timeout: isPreviewMode ? 120 * 1000 : 30 * 1000,
  use: {
    trace: isDebugMode ? 'retain-on-failure' : 'on-first-retry',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,
    video: 'off',
  },

  projects: [
    {
      name: 'e2e',
      testDir: './tests',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        launchOptions: {
          slowMo: isPreviewMode ? 700 : 0,
        },
      },
    },
  ],
});
