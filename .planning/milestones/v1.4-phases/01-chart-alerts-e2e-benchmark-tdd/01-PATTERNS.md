# Phase 1: Chart Alerts E2E Benchmark (TDD) - Pattern Map
**Mapped:** 2026-08-19
**Files analyzed:** 1
**Analogs found:** 1 / 1

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `tests/e2e/chart-alerts.spec.ts` | test | event-driven | `tests/e2e/alerts.spec.ts` | role-match |

## Pattern Assignments

### `tests/e2e/chart-alerts.spec.ts` (test, event-driven)

**Analog:** `tests/e2e/alerts.spec.ts` (with `tests/e2e/marker-placement.spec.ts` for chart mock patterns)

**Imports pattern** (`tests/e2e/alerts.spec.ts` lines 1-1):
```typescript
import { test, expect } from '@playwright/test';
```

**Setup & Mocking pattern** (`tests/e2e/alerts.spec.ts` lines 20-31):
```typescript
    // Bypass authentication and initialize stores
    await page.evaluate(() => {
      (window as any).__E2E_MOCK_EXECUTIONS = true;
      (window as any).__sessionStore.setState({ 
        isAuthenticated: true, 
        cst: 'mock', 
        securityToken: 'mock',
        client: {
          clientAccountId: 'mock-account-123'
        }
      });
    });
```

**Chart Data Mocking pattern** (`tests/e2e/marker-placement.spec.ts` lines 26-37):
```typescript
    // Mock Chart prices to contain the exact candle
    await page.route('**/api/market/v1/prices/*', route => {
      return route.fulfill({
        status: 200, 
        json: {
          prices: [
            { snapshotTime: '2023-11-13T00:00:00.000', snapshotTimeUTC: '2023-11-13T00:00:00.000', openPrice: { bid: 150, ask: 150 }, closePrice: { bid: 150, ask: 150 }, highPrice: { bid: 151, ask: 151 }, lowPrice: { bid: 140, ask: 140 } }
          ]
        }
      });
    });
```

**WebSocket Mocking pattern** (`tests/e2e/alerts.spec.ts` lines 50-64):
```typescript
    // Mock a price update that hits the target price using real WebSocket message flow
    await page.evaluate(() => {
      if ((window as any).wsManager) {
        const msg = {
          destination: 'quote',
          payload: {
            epic: 'MOCK_EPIC',
            bid: 150.05,
            ofr: 150.06,
            timestamp: Date.now()
          }
        };
        (window as any).wsManager.handleMessage(JSON.stringify(msg));
      }
    });
```

## Shared Patterns

### Playwright State Initialization
**Source:** `tests/e2e/alerts.spec.ts`
**Apply to:** E2E test setup
Use `page.evaluate()` to inject mock state directly into the browser's `window.__sessionStore` to bypass auth and prepare the application state.

### WebSocket Message Injection
**Source:** `tests/e2e/alerts.spec.ts`
**Apply to:** Testing real-time reactions
Use `page.evaluate()` to call `window.wsManager.handleMessage()` with mock JSON payloads to simulate real-time market data updates and alert triggers.

## Metadata

**Analog search scope:** `tests/e2e/`
**Files scanned:** 31
**Pattern extraction date:** 2026-08-19
