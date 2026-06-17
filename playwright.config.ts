import { defineConfig, devices } from '@playwright/test';

const useMocks = process.env.USE_MOCKS === 'true';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.ts', '**/stress-test.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://trading-terminal-demo.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // D-01, D-02, D-04: Bypass MSW usage and interact with real Capital.com demo via proxy
    ...(useMocks ? {} : {
      extraHTTPHeaders: {
        'x-bypass-mocks': 'true'
      }
    })
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
