import { test, expect } from '@playwright/test';

const setupTest = async (page: any, executions: any[]) => {
    await page.addInitScript((execs: any[]) => {
      window.localStorage.setItem('CST', 'mock-cst-token');
      window.localStorage.setItem('X-SECURITY-TOKEN', 'mock-security-token');
      localStorage.setItem('trade-storage', JSON.stringify({
        state: { executions: execs, positions: [], pendingOrders: {} },
        version: 0
      }));
    }, executions);

    await page.goto('/');
    await page.waitForTimeout(4000);
};

test.describe('Debug Hover', () => {
  test('Find hit zone', async ({ page }) => {
    await page.route('**/api/market/v1/prices/**', async route => {
      await route.fulfill({
        status: 200,
        json: {
          prices: [
            { snapshotTime: '2023-11-13T00:00:00.000', snapshotTimeUTC: '2023-11-13T00:00:00.000', openPrice: { bid: 150, ask: 150 }, closePrice: { bid: 150, ask: 150 }, highPrice: { bid: 151, ask: 151 }, lowPrice: { bid: 140, ask: 140 } },
            { snapshotTime: '2023-11-14T00:00:00.000', snapshotTimeUTC: '2023-11-14T00:00:00.000', openPrice: { bid: 150, ask: 150 }, closePrice: { bid: 150, ask: 150 }, highPrice: { bid: 151, ask: 151 }, lowPrice: { bid: 149, ask: 149 } },
            { snapshotTime: '2023-11-15T00:00:00.000', snapshotTimeUTC: '2023-11-15T00:00:00.000', openPrice: { bid: 151, ask: 151 }, closePrice: { bid: 152, ask: 152 }, highPrice: { bid: 153, ask: 153 }, lowPrice: { bid: 150, ask: 150 } }
          ]
        }
      });
    });
    
    await setupTest(page, [
      { id: 'mock-exec-1', dealId: 'deal-1', epic: 'SPY', size: 1, price: 150, direction: 'BUY', timestamp: new Date('2023-11-14T22:13:30Z').getTime(), action: 'ENTRY' }
    ]);
    
    await page.evaluate(() => {
        (window as any).__DEBUG_OUTPUT__ = [];
        const chart = (window as any).__TEST_CHART_API__;
        const orig = chart.subscribeCrosshairMove;
        chart.subscribeCrosshairMove = (handler: any) => {
           orig.call(chart, (param: any) => {
              (window as any).__DEBUG_OUTPUT__.push(param);
              handler(param);
           });
        };
    });
    
    const { cx, yRaw, canvasTop, canvasLeft } = await page.evaluate(() => {
       const chart = (window as any).__TEST_CHART_API__;
       const series = (window as any).__TEST_PRICE_SERIES__;
       const canvas = document.querySelector('canvas');
       const box = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
       let cx = chart.timeScale().timeToCoordinate('2023-11-14');
       const yRaw = series.priceToCoordinate(149);
       return { cx, yRaw, canvasTop: box.top, canvasLeft: box.left };
    });
    
    const cxReal = canvasLeft + cx;
    
    // just move there
    await page.mouse.move(cxReal, canvasTop + yRaw);
    await page.waitForTimeout(200);
    
    const output = await page.evaluate(() => {
       return {
         markers: (window as any).__MARKERS__,
         lastHovered: (window as any).__LAST_HOVERED_RAW__,
         testHovered: (window as any).__TEST_HOVERED_EXECUTIONS__,
         barLoop: (window as any).__DEBUG_BAR_LOOP__
       }
    });
    console.log("DEBUG OUTPUT:", output);
    
    expect(true).toBeTruthy();
  });
});
