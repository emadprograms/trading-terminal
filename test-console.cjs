const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log(msg.text()));
  page.on('pageerror', err => console.error(err));
  
  await page.addInitScript(() => {
    window.localStorage.setItem('layout-storage', JSON.stringify({
        state: {
          workspaces: {
            'default': {
              id: 'default',
              name: 'Default',
              layout: [{ id: '1', type: 'chart', data: { ticker: 'TSLA', timeframe: 'MINUTE_1' } }]
            }
          },
          activeWorkspaceId: 'default'
        },
        version: 0
    }));
  });
  
  await page.goto('http://localhost:3001/?ticker=TSLA');
  await page.waitForTimeout(5000);
  await browser.close();
})();
