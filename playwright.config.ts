import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.ts', '**/stress-test.ts'],
  fullyParallel: true,
  forbidOnly: process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://trading-terminal-demo.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // D-01, D-02, D-04: Bypass MSW usage and interact with real Capital.com demo via proxy
    extraHTTPHeaders: {
      'x-bypass-mocks': 'true'
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
