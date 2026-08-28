# Testing Patterns

**Analysis Date:** 2026-08-12

## Test Framework

**Runner:**
- Vitest 4.1.7
- Config: `vitest.config.ts`

**Assertion Library:**
- Vitest's built-in `expect` (compatible with Chai) and `@testing-library/jest-dom` for DOM matchers.

**Run Commands:**
```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
```

## Test File Organization

**Location:**
- Co-located for unit tests (e.g. `src/App.test.tsx`)
- Separate `tests/` directory for integration/E2E and setup (e.g. `tests/verify-msw.test.ts`, `tests/setup.ts`)

**Naming:**
- `*.test.ts`, `*.test.tsx`, `*.spec.ts`

**Structure:**
```
tests/
├── e2e/
├── integration/
├── regression/
├── unit/
├── helpers/
├── hooks/
└── setup.ts
src/
└── [Component].test.tsx
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from 'vitest';

describe('Component/Hook Name', () => {
  it('should behave in a specific way', () => {
    // test body
  });
});
```

**Patterns:**
- Use `beforeAll`, `afterEach`, `afterAll` (imported from `vitest`) for global setup/teardown in setup files (e.g. `tests/setup.ts` starting MSW server).

## Mocking

**Framework:** Vitest (`vi`), MSW (Mock Service Worker)

**Patterns:**
```typescript
// Component mock
vi.mock('./hooks/useDatabase', () => ({
  useDatabase: () => ({
    // mocked implementation
  }),
}));

// MSW HTTP mock
http.post('*/session', () => {
  return new HttpResponse(JSON.stringify({ ... }), { status: 200 });
});
```

**What to Mock:**
- External hooks and services using `vi.mock`
- API calls using MSW (Mock Service Worker) setup in `tests/setup.ts`
- Browser APIs (e.g. `ResizeObserver`, `localStorage`) in `tests/setup.ts`

**What NOT to Mock:**
- Core component rendering logic (using `@testing-library/react`)

## Fixtures and Factories

**Location:**
- Hardcoded mock data is used within `tests/setup.ts` (e.g. Mock accounts).

## Coverage

**Requirements:** None enforced in standard scripts, though Vitest supports it.

## Test Types

**Unit Tests:**
- Component rendering and hook isolation using `@testing-library/react` and `@testing-library/react-hooks` (or similar).

**Integration Tests:**
- MSW is used to test HTTP flows without hitting real APIs.

**E2E Tests:**
- Playwright is configured in `playwright.config.ts`.
- Run commands typically hit `npm run dev` and run against `localhost:3001`.

## Common Patterns

**Async Testing:**
```typescript
it('intercepts /session', async () => {
  const response = await fetch('/session', { method: 'POST' })
  const data = await response.json()
  expect(response.status).toBe(200)
})
```

---

*Testing analysis: 2026-08-12*
