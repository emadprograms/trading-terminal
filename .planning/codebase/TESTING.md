# Testing Patterns

**Analysis Date:** 2026-06-13

## Test Framework

**Runner:**
- Vitest 4.1.7 (frontend unit, component, integration tests, and proxy API tests).
- Playwright 1.60.0 (end-to-end regression tests).

**Assertion Library:**
- Vitest built-in `expect` library with Jest-DOM Matchers (`@testing-library/jest-dom`).
- Matchers: standard matcher API (e.g. `toBe`, `toEqual`, `toThrow`, `toHaveBeenCalled`, `toBeInTheDocument`).

**Run Commands:**
```bash
npm run test                          # Run Vitest test suite once
npm run test:watch                    # Run Vitest in watch mode
npx playwright test                   # Run Playwright end-to-end regression suite
```

## Test File Organization

**Location:**
- Unit/component test files are collocated next to their source files (e.g. `src/components/TradeLog.test.tsx` next to `TradeLog.tsx`).
- General/regression test suites are organized under the `tests/` directory:
  - `tests/unit/` - Unit tests for core scripts.
  - `tests/integration/` - Integration suites.
  - `tests/regression/` - Playwright E2E regression tests (`*.spec.ts`).
  - `tests/performance/` - Resource check test runs.
  - `tests/setup.ts` - Vitest global setup config.

**Structure:**
```
tests/
├── setup.ts               # Global mocks & MSW server setup
├── unit/                  # Isolated logic tests
├── integration/           # Multi-module tests
├── regression/            # Playwright spec files
└── verify-msw.test.ts     # Connectivity sanity verification tests
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi } from 'vitest';

describe('ComponentName', () => {
  it('should render element successfully', () => {
    // arrange & act
    // assert
    expect(element).toBeInTheDocument();
  });
});
```

**Patterns:**
- `beforeAll` & `afterAll` used to configure server mock lifecycles.
- `beforeEach` used for cleaning up localStorage and state stores.
- Mocking of browser DOM APIs (like `ResizeObserver`, `matchMedia`, `CanvasRenderingContext2D`) is configured globally in `tests/setup.ts`.

## Mocking

**Framework:**
- Vitest built-in mocking utilities (`vi`).
- **MSW (Mock Service Worker)** node server setup to intercept broker requests.

**Broker API Interception (MSW):**
MSW handlers are configured in `tests/setup.ts` to stub session auth and accounts:
```typescript
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.post('*/session', () => {
    return new HttpResponse(JSON.stringify({ accountType: 'CFD' }), {
      status: 200,
      headers: { CST: 'mock-cst-token' }
    });
  })
];

export const server = setupServer(...handlers);
```

## Coverage

- Coverage configuration target is not strictly enforced in config.json.
- Run via standard Vitest coverage providers when configured.

---

*Testing analysis: 2026-06-13*
*Update when test patterns change*
