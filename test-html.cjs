const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.route('**/api/session', async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        clientAccountId: 'acc_123',
        securityToken: 'sec_123',
        cst: 'cst_123'
      }
    });
  });

  await page.addInitScript(() => {
    window.localStorage.setItem('trade-storage', JSON.stringify({
      state: {
        credentials: { identifier: 'test', password: 'test', appKey: 'test' },
        isAuthenticated: true,
        executions: []
      },
      version: 0
    }));
  });

  await page.goto('http://localhost:3001/?ticker=TSLA');
  await page.waitForTimeout(5000);
  const html = await page.content();
  console.log(html);
  await browser.close();
})();
