import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load local environment variables for live API testing
dotenv.config({ path: '.env.local' });
const useMocks = process.env.USE_MOCKS === 'true';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.ts', '**/stress-test.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 2,
  timeout: 60000,
  workers: 1,
  reporter: 'html',
  webServer: {
    command: 'npm run dev',
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001',
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
