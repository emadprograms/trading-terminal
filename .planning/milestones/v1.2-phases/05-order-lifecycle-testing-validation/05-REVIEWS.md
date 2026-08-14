---
phase: 5
reviewers: [gemini, antigravity]
reviewed_at: 2026-06-18T16:46:00Z
plans_reviewed: [05-01-PLAN.md]
---

# Cross-AI Plan Review — Phase 5

## Gemini Review

# Plan Review: Phase 05 - Live E2E Testing & Validation for Capital.com API

## Summary
The revised plan accurately targets the core issue: the inability of local mocks to replicate the strict matching engine validation of Capital.com. Shifting the testing paradigm to live endpoints for this critical path is the correct strategic decision to prevent false positives.

## Strengths
- **Eradicating False Positives:** Bypassing mocks ensures that tests are a true reflection of the live integration.
- **Account Safety:** The explicit requirement to place a micro-order (1 unit) mitigates the risk of large financial impact on the demo account.
- **Immediate State Cleanup:** Emphasizing the immediate flattening of positions is crucial for maintaining a healthy demo account state.

## Concerns
- **Environment Variable Complexity (LOW):** Accessing `.env.local` inside Playwright requires ensuring `dotenv` or Playwright's native env loading is correctly configured.
- **Flakiness from Live Network (MEDIUM):** Live broker APIs can have latency spikes or downtime. Tests might fail due to network instability rather than logic bugs.

## Suggestions
- **Add Retry Logic:** For the live suite, consider explicitly adding Playwright retries or increased timeouts to account for network instability.
- **Strict Flattening:** Ensure the cleanup runs even if the test assertion fails (e.g., using `finally` blocks or Playwright's `afterAll` / `afterEach` hooks).

## Risk Assessment
**Overall Risk: MEDIUM**
Transitioning to live E2E testing introduces network flakiness and dependency on an external demo environment. The mitigation strategies (workers: 1, micro-orders) are sound, but robust error handling in the teardown phase is essential.

---

## Antigravity Review

### 1. Summary
The plan pivot to a live testing framework is a strong architectural move for trading system integrations. Mocks are inherently limited when dealing with complex state machines like order matching engines. The proposed plan is concise and correctly identifies the need for real credentials and WebSocket verification.

### 2. Strengths
- **Real-World Validation:** Using actual WebSocket `confirms` events ensures the UI will behave identically in production.
- **Concurrency Control:** Enforcing `workers: 1` is a vital preventative measure against race conditions on the single demo account.
- **Documentation Updates:** Updating `tests/e2e/README.md` sets a strong precedent for future developers working on the broker integration.

### 3. Concerns
- **MEDIUM:** **Cleanup on Failure.** If the test fails before the position is flattened, the demo account will accumulate orphaned positions.
- **LOW:** **Credential Exposure.** Ensuring that `.env.local` is never committed and that CI pipelines (if applicable later) handle these securely.

### 4. Suggestions
- **Robust Teardown:** Explicitly mention in Task 2 that the position flattening must occur in an `afterEach` hook or a `finally` block so that it executes regardless of test success or failure.
- **Timeout Management:** Specify an increased timeout for `live-api.spec.ts` since waiting for real WebSocket events will take longer than instant mock responses.

### 5. Risk Assessment
**MEDIUM**
The plan is highly necessary but carries inherent risks associated with live testing. Ensuring teardown logic is bulletproof is the key to lowering this risk.

---

## Consensus Summary

The reviewers agree that moving to a live E2E testing strategy is the correct response to the false positives caused by local mocks.

### Agreed Strengths
- Bypassing mocks provides authentic validation of the Capital.com integration.
- Mitigating financial/account risk by using micro-orders.
- Enforcing sequential execution (`workers: 1`) to prevent test account state collisions.

### Agreed Concerns
- **Robust Teardown (MEDIUM):** Both reviewers strongly emphasize that the flattening of the position must occur even if the test assertion fails. Relying on an inline cleanup might leave the account polluted if an `expect` statement throws.
- **Network Flakiness (LOW):** Live APIs can be slow or intermittently unavailable, leading to flaky tests.

### Divergent Views
- No significant divergence. Both reviewers highlighted the same core architectural requirements for successful live E2E testing.
