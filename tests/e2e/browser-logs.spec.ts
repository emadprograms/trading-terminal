import { test } from '@playwright/test';

test('capture console logs', async ({ page }) => {
  page.on('console', msg => {
    if (msg.text().includes('ACTIVITY RECORD:')) {
      console.log(msg.text());
    }
  });
  
  await page.goto('http://localhost:3001');
  // wait 10 seconds for initial sync to fetch history
  await page.waitForTimeout(10000);
});
