# Phase 5: Order Lifecycle Testing & Validation - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a rigorous test suite to stress-test the order execution under all known and edge-case conditions, focusing strictly on functional correctness and data integrity without adding new capabilities.

</domain>

<decisions>
## Implementation Decisions

### Test Environment Target
- **D-01:** Implement a hybrid approach. Use MSW (Mock Service Worker) mocks for rapid iteration and stress tests, but ensure a critical suite runs against the live Vercel proxy.

### Concurrency Simulation
- **D-02:** Run both a "realistic" pass (human-like delays) and an "impossible speed" pass (zero delay, high-frequency) to stress the system's locking and queuing mechanisms safely.

### Test Data State Setup
- **D-03:** Reuse the same test account to avoid rate limits and flakiness. Run a cleanup script `beforeEach` test to flatten all positions and cancel active limit/stop orders.

### Assertion Strategy
- **D-04:** Do both: Verify the underlying network payload fires exactly once via intercept AND ensure the UI correctly reflects the final state.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Testing Infrastructure
- `.planning/codebase/TESTING.md` — Defines current tools (Playwright, MSW, Vitest) and locations of existing tests.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Playwright Configuration (`playwright.config.ts`): Use for the E2E tests and live proxy runs.
- MSW Setup: Use for intercepting API requests in the mocked rapid-iteration passes.
- Vitest (`vitest.config.ts`): Use for component/unit tests where UI state is tested.

### Established Patterns
- Tests are split into `tests/` for E2E and co-located files for Vitest components. The dual-run approach matches the project's strategy for live E2E against the real Vercel URL.

### Integration Points
- Order placement and chart components: Need testing hooks to trigger `alt+q` and ensure visual tracking is consistent with network activity.

</code_context>

<specifics>
## Specific Ideas

- Ensure Playwright's rapid interaction is used to simulate "impossible speed" double alt spams to verify locks.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 5-Order Lifecycle Testing & Validation*
*Context gathered: 2026-06-17*
