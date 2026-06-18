import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Read credentials from .env.local
const envFile = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});
const identifier = env.CAPITAL_USER;
const password = env.CAPITAL_PASSWORD;
const apiKey = env.CAPITAL_API_KEY;

test.describe('Live Order Test (No Mocks)', () => {
  test('Places a real order and checks for rejection toast', async ({ page }) => {
    await page.goto('http://localhost:3001');

    // Login
    console.log("Logging in...");
    await page.fill('input[type="email"]', identifier);
    await page.fill('input[type="password"]', password);
    await page.fill('input[placeholder*="API Key"]', apiKey);
    await page.click('button:has-text("Connect to Capital.com")');

    // Wait for the app to be ready
    console.log("Waiting for trade controls...");
    await expect(page.locator('.trade-controls').first()).toBeVisible({ timeout: 15000 });

    console.log("Clicking BUY...");
    const buyButton = page.locator('.trade-controls button').filter({ hasText: /buy/i }).first();
    await buyButton.click();

    // Listen to toasts
    console.log("Waiting for Toast...");
    
    // We want to catch the exact text of any error toast
    // The sonner toast container usually has role="alert" or class "sonner-toast"
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toBeVisible({ timeout: 10000 });
    const toastText = await toast.innerText();
    console.log("==== LIVE TOAST RESULT ====");
    console.log(toastText);
    console.log("===========================");
  });
});
