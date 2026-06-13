import { test, expect } from '@playwright/test';

test.describe('Group Synchronization Propagation', () => {
  test('Scenario 1: Real-time Propagation between grouped charts', async ({ page }) => {
    await page.goto('/');
    
    const chartCard = page.locator('.chart-card').first();
    if (await chartCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      // 1. Create two charts by setting layout to 2 vertical
      const layoutBtn = page.locator('.layout-icon.l2v');
      if (await layoutBtn.isVisible()) {
        await layoutBtn.click();
      }
      
      // Wait for 2 charts
      await expect(page.locator('.chart-card')).toHaveCount(2);

      // 2. Assign them to the same group ('red')
      const chart1Group = page.locator('.chart-card').nth(0).locator('.chart-header .custom-select').filter({ hasText: 'Group' });
      if (await chart1Group.isVisible()) {
        await chart1Group.click();
        await page.locator('.dropdown-item', { hasText: 'Red' }).first().click();
      }

      const chart2Group = page.locator('.chart-card').nth(1).locator('.chart-header .custom-select').filter({ hasText: 'Group' });
      if (await chart2Group.isVisible()) {
        await chart2Group.click();
        await page.locator('.dropdown-item', { hasText: 'Red' }).last().click();
      }

      // 3. Change ticker in Chart 1
      const tickerSelect = page.locator('.chart-card').nth(0).locator('.chart-header .custom-select').nth(0);
      if (await tickerSelect.isVisible()) {
        await tickerSelect.click();
        await page.locator('.dropdown-search input').fill('ETH');
        const result = page.locator('.dropdown-item', { hasText: 'ETH' }).first();
        await result.waitFor({ state: 'visible' });
        await result.click();
      }

      // 4. Verify Chart 2's header updates
      const allTickers = page.locator('.chart-card .chart-header span', { hasText: 'ETH' });
      await expect(allTickers).toHaveCount(2, { timeout: 10000 });
    }
  });

  test('Scenario 2: Mount Sync for new chart joining existing group', async ({ page }) => {
    await page.goto('/');
    
    const chartCard = page.locator('.chart-card').first();
    if (await chartCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      // 1. Establish a group with a specific ticker
      const tickerSelect = page.locator('.chart-card').nth(0).locator('.chart-header .custom-select').nth(0);
      if (await tickerSelect.isVisible()) {
        await tickerSelect.click();
        await page.locator('.dropdown-search input').fill('SOL');
        const result = page.locator('.dropdown-item', { hasText: 'SOL' }).first();
        await result.waitFor({ state: 'visible' });
        await result.click();
      }
      const chart1Group = page.locator('.chart-card').nth(0).locator('.chart-header .custom-select').filter({ hasText: 'Group' });
      if (await chart1Group.isVisible()) {
        await chart1Group.click();
        await page.locator('.dropdown-item', { hasText: 'Red' }).first().click();
      }

      // 2. Add a new chart
      const layoutBtn = page.locator('.layout-icon.l2v');
      if (await layoutBtn.isVisible()) {
        await layoutBtn.click();
      }
      
      await expect(page.locator('.chart-card')).toHaveCount(2);

      // 3. Assign it to the group
      const chart2Group = page.locator('.chart-card').nth(1).locator('.chart-header .custom-select').filter({ hasText: 'Group' });
      if (await chart2Group.isVisible()) {
        await chart2Group.click();
        await page.locator('.dropdown-item', { hasText: 'Red' }).last().click();
      }

      // 4. Verify the new chart adopts 'SOL'
      const solHeaders = page.locator('.chart-card .chart-header span', { hasText: 'SOL' });
      await expect(solHeaders).toHaveCount(2, { timeout: 10000 });
    }
  });
});
