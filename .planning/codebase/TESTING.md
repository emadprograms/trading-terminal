# Testing Patterns

**Analysis Date:** 2025-06-03

## Test Framework

**Runner:**
- Vitest 4.1.7
- Config: `vitest.config.ts`

**Assertion Library:**
- Vitest (built-in)
- `@testing-library/jest-dom` for DOM assertions.

**Run Commands:**
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

## Test File Organization

**Location:**
- Separate `tests/` directory at root.

**Naming:**
- `.test.ts` or `.test.tsx` (e.g., `tests/unit/useWorkspaceStore.test.ts`).
- `.stress.test.ts` for stress tests (e.g., `tests/unit/resampling.stress.test.ts`).
- `.perf.test.ts` or `.perf.test.tsx` for performance tests (e.g., `tests/performance/render.perf.test.tsx`).
- `.spec.ts` is excluded in `vitest.config.ts` but present in some regression tests (e.g., `tests/regression/sync/propagation.spec.ts`).

**Structure:**
```
tests/
├── helpers/          # Simulation utilities (e.g., `chart-simulation.ts`)
├── hooks/            # Hook-specific tests (e.g., `useTradeManager.test.ts`)
├── integration/      # Cross-component logic (e.g., `lifecycle.test.ts`)
├── performance/      # Rendering and cache perf (e.g., `render.perf.test.tsx`)
├── regression/       # Bug-fix verification (e.g., `sync/grouping.test.ts`)
└── unit/            # Pure logic and store tests (e.g., `resampling.test.ts`)
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '../../src/store/useWorkspaceStore';

describe('useWorkspaceStore', () => {
  beforeEach(() => {
    // Reset store state
    useWorkspaceStore.setState({ ... });
  });

  it('should set and get the selectedId', () => {
    useWorkspaceStore.getState().setSelectedId('chart-1');
    expect(useWorkspaceStore.getState().selectedId).toBe('chart-1');
  });
});
```

**Patterns:**
- **Setup pattern:** Use of `beforeEach` to reset global states (like Zustand stores).
- **Teardown pattern:** Standard Vitest lifecycle hooks.
- **Assertion pattern:** `expect().toBe()`, `expect().toBeGreaterThan()`.

## Mocking

**Framework:** Vitest `vi`

**Patterns:**
```typescript
vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => ({
    // ... mock implementation
  })),
}));
```

**What to Mock:**
- Heavy third-party libraries (`lightweight-charts`).
- Browser APIs not available in JSDOM (e.g., `ResizeObserver`, `matchMedia` in `tests/setup.ts`).
- DOM elements for performance testing.

**What NOT to Mock:**
- Pure business logic and utility functions.
- Store state transitions.

## Fixtures and Factories

**Test Data:**
- Use of helper functions for simulation (e.g., `tests/helpers/chart-simulation.ts`).
- Dynamic generation of chart data in performance tests.

**Location:**
- `tests/helpers/`

## Coverage

**Requirements:** Not explicitly enforced in config.

**View Coverage:**
- Not configured in `package.json` scripts.

## Test Types

**Unit Tests:**
- Scope: Pure functions, Zustand stores, and individual hooks.
- Approach: State-based assertions.

**Integration Tests:**
- Scope: Interaction between hooks and components.
- Approach: Using `@testing-library/react` to render and interact with components.

**Performance Tests:**
- Scope: Re-render counts, cache hits, and rendering lag.
- Approach: Tracking render cycles via refs or window variables (e.g., `tests/performance/render.perf.test.tsx`).

**Stress Tests:**
- Scope: High-volume data processing.
- Approach: Large data sets in `.stress.test.ts` files.

**Regression Tests:**
- Scope: Specific bug reproductions.
- Approach: Dedicated `tests/regression/` directory to prevent future regressions.

## Common Patterns

**Async Testing:**
```typescript
await act(async () => {
    await new Promise(r => setTimeout(r, 0));
});
```

**Error Testing:**
- Use of `ErrorBoundary` and checking for crash recovery.

---

*Testing analysis: 2025-06-03*
