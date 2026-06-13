import { test, expect } from '@playwright/test';

test.describe('API Stress Test', () => {
  test('issues high-frequency requests to discover demo API bounds', async ({ request }) => {
    // Determine the base URL, defaulting to the live proxy
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'https://trading-terminal-demo.vercel.app';
    const iterations = 50;
    const results: any[] = [];

    // Hypothetical endpoint that the proxy exposes to interact with Capital.com
    const targetUrl = `${baseUrl}/api/market/tick`;

    console.log(`[Stress Test] Starting ${iterations} rapid requests to ${targetUrl}`);

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      try {
        const response = await request.get(targetUrl, {
          headers: {
            'x-bypass-mocks': 'true' // Bypass mocks as per D-02
          }
        });
        results.push({
          iteration: i,
          status: response.status(),
          duration: Date.now() - start
        });
      } catch (e: any) {
        results.push({
          iteration: i,
          error: e.message,
          duration: Date.now() - start
        });
      }

      // Minimal backoff to intentionally stress the endpoint
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const errorsOrLimits = results.filter(r => r.status !== 200);
    const avgTime = results.reduce((sum, r) => sum + r.duration, 0) / iterations;

    console.log(`[Stress Test Results]`);
    console.log(`Average Latency: ${avgTime}ms`);
    console.log(`Non-200 Responses (e.g., Rate Limits): ${errorsOrLimits.length}`);
    if (errorsOrLimits.length > 0) {
      console.log('First non-200 response example:', errorsOrLimits[0]);
    }

    // Test succeeds structurally if it ran the loop without hard crashing
    expect(results.length).toBe(iterations);
  });
});
