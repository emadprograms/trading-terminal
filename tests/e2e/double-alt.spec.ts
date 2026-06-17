import { test, expect } from '@playwright/test';

test.describe('Double Alt Execution Lock Resilience', () => {
  test('spamming double alt does not freeze the UI', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the main UI to load
    await page.waitForLoadState('domcontentloaded');

    // Locate Buy and Sell buttons
    const buyBtn = page.getByRole('button', { name: /Buy|Long/i }).first();
    
    // Check if UI loaded enough to have a buy button
    if (await buyBtn.isVisible()) {
      // It should be enabled initially
      await expect(buyBtn).toBeEnabled();

      // Spam Alt key multiple times rapidly to trigger Double Alt (flatten half position)
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Alt');
        await page.waitForTimeout(50); // fast enough to trigger the double alt threshold multiple times
      }

      // Wait a bit for execution locks to potentially get stuck (if bug exists)
      await page.waitForTimeout(1500);

      // Verify the button is still enabled
      await expect(buyBtn).toBeEnabled();

      // Ensure the text hasn't frozen to "..."
      const btnText = await buyBtn.textContent();
      expect(btnText).not.toBe('...');
    }
  });
});
