# Phase 5: Order Lifecycle Testing & Validation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-17
**Phase:** 5-Order Lifecycle Testing & Validation
**Areas discussed:** Test Environment Target, Concurrency Simulation, Test Data State Setup, Assertion Strategy

---

## Test Environment Target

| Option | Description | Selected |
|--------|-------------|----------|
| Strictly live environment | Ensures 100% real-world accuracy, even if slower. | |
| Strictly mocked environment | Faster, deterministic, but risk of diverging from actual API behavior. | |
| Hybrid approach | Use mocks for rapid iteration/stress tests, but run a nightly/critical suite against live. | ✓ |

**User's choice:** Hybrid approach — Use mocks for rapid iteration/stress tests, but run a nightly/critical suite against live.
**Notes:** N/A

---

## Concurrency Simulation

| Option | Description | Selected |
|--------|-------------|----------|
| Use Playwright's rapid interaction | Zero delay to truly stress the system's locking and queuing. | |
| Add human-like delays | Simulate a fast but realistic user (e.g., 100-200ms). | |
| Run both | A "realistic" pass and an "impossible speed" pass to ensure total safety. | ✓ |

**User's choice:** Run both: a "realistic" pass and an "impossible speed" pass to ensure total safety.
**Notes:** N/A

---

## Test Data State Setup

| Option | Description | Selected |
|--------|-------------|----------|
| Create fresh account per test | Clean slate, but might hit rate limits or be slow. | |
| Reuse same test account | Run a cleanup script `beforeEach` test to flatten positions and cancel orders. | ✓ |
| Mock state entirely for fast tests | Only clean up the live account for the critical E2E suite. | |

**User's choice:** Reuse the same test account, but run a cleanup script `beforeEach` test to flatten all positions and cancel orders.
**Notes:** N/A

---

## Assertion Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Assert strictly on visual UI updates | e.g. "Order Pending" toast appears, position size changes. | |
| Assert on underlying intercepts | e.g. ensure exactly one POST /order request is made. | |
| Do both | Verify the underlying network payload fires exactly once AND the UI correctly reflects final state. | ✓ |

**User's choice:** Do both: Verify the underlying network payload fires exactly once AND the UI correctly reflects the final state.
**Notes:** N/A

---

## the agent's Discretion

None

## Deferred Ideas

None
