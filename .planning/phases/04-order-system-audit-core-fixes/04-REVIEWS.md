---
phase: 4
reviewers: [gemini]
reviewed_at: 2026-06-16T11:06:51Z
plans_reviewed: [.planning/phases/04-order-system-audit-core-fixes/04-PLAN.md]
---

# Cross-AI Plan Review — Phase 4

## Gemini Review

# Plan Review: Phase 4 - Order System Audit & Core Fixes

## Summary
The implementation plan is high-quality, logically structured, and directly addresses the root causes identified during the research phase. It avoids "band-aid" fixes (like optimistic UI) in favor of systemic hardening. By targeting execution locks, event isolation, and API endpoint correctness, the plan effectively maps to the requirements of AUDIT-01 through ORDER-03.

## Strengths
- **Direct Root-Cause Mapping:** Every task in the plan is a direct response to a finding in the research document, ensuring no wasted effort.
- **API Precision:** The distinction between "standalone working orders" and "attached stops/limits" shows a deep understanding of the Capital.com API constraints, which is the most likely source of the "stuck order" bug.
- **Failure Safety:** The explicit mention of `finally` blocks for clearing `isExecuting` prevents the "permanent lockout" scenario where a crashed API call bricks the trading interface.
- **Verification Rigor:** The testing strategy includes "spamming" and multi-chart scenarios, which are essential for reproducing race conditions and event duplication.

## Concerns
- **Lock Granularity (MEDIUM):** The plan proposes a general `isExecuting` lock in `useTradeStore`. If this is a single global boolean, a slow API response while cancelling a limit order on `AAPL` would prevent the user from placing a critical market order on `BTC`. 
- **State Synchronization (LOW):** While the plan addresses the API call for attached orders (`updatePosition`), it doesn't explicitly detail how the local `pendingOrders` or `positions` state is cleaned up after an attached stop is removed. There is a risk that the backend is updated, but the UI still shows the stop-loss.
- **Focus Management (LOW):** If the `tabIndex={0}` approach is chosen for keyboard isolation, it may introduce unexpected "focus rings" or change the tabbing order of the application, potentially impacting accessibility or UX.

## Suggestions
- **Refine Lock Scope:** Instead of a single `isExecuting` flag, consider a map of locks (e.g., `executingOrders: Set<string>`) keyed by symbol or order ID, or at least separate locks for `placeOrder` vs `cancelOrder` to allow concurrent unrelated operations.
- **Centralized Event Registry:** For Task 2, I strongly recommend the **Centralized Active Chart State** approach over the `tabIndex` approach. Querying a `useUIStore.getState().activeChartEpic` is more robust in React and avoids the brittle nature of DOM focus management in complex dashboards.
- **Explicit State Cleanup:** Ensure that the `cancelWorkingOrder` logic (and the new `updatePosition` path) explicitly triggers a state refresh or a specific removal from the `pendingOrders` array in the store to ensure the UI is perfectly synced.

## Risk Assessment
**Overall Risk: LOW**

The plan is surgical and grounded in empirical research. The primary risks are related to UI polish (focus management) and operational concurrency (lock granularity), neither of which threatens the structural integrity of the application. Provided the "Active Chart" state is used for event isolation and locks are handled in `finally` blocks, this plan will successfully harden the order system.

---

## Consensus Summary

The review confirms that the plan is high-quality, addresses the root causes directly, and correctly maps the API precision needed. The primary focus is on refining the implementation details of the execution lock and event isolation.

### Agreed Strengths
- **Direct Root-Cause Mapping:** Tasks correctly target the systemic issues instead of band-aids.
- **API Precision:** Capital.com API constraints (working order vs attached stops) are well-understood.
- **Failure Safety:** `finally` blocks prevent permanent lockouts.

### Agreed Concerns
- **Lock Granularity (MEDIUM):** A single global `isExecuting` flag might block unrelated operations (e.g. cancelling an order while placing another).
- **State Synchronization (LOW):** The local state cleanup for attached order removal is not explicitly mapped out in the plan.
- **Focus Management (LOW):** `tabIndex` could introduce UX/accessibility issues compared to a state-based approach.

### Divergent Views
- None (single reviewer).
