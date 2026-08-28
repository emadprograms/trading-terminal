# Phase 3 Review: Order Execution Layer

This document contains independent AI reviews for Phase 3 (Order Execution Layer). These reviews are intended to be consumed by the planning process to refine the implementation strategy.

## Reviewer: Gemini CLI (v2.1)

### Phase 3 Plan 02: Technical Deep-Dive

#### 1. Stop Loss Strategy & Precision (Task 1)
*   **Assessment:** The plan proposes a dual strategy: `stopDistance` for precision and "Post-fill SL Validation" as a fallback.
*   **Recommendation:** Prioritize `stopDistance` in the API request. Capital.com's API allows specifying `stopDistance` (in pips/points) which the server calculates relative to the *actual* fill price. This is vastly superior to calculating a `stopLevel` on the client, which can become dangerously close or even invalid if slippage occurs.
*   **Critical Note:** If `guaranteedStop: true` is sent, ensure the store handles `403` or `400` errors gracefully, as some epics or account types do not support guaranteed stops.

#### 2. Slippage Safety Cap (Task 1)
*   **Assessment:** 0.5% cap is a solid industry standard for retail execution.
*   **Refinement:** Ensure the "Reject/Alert" logic triggers *after* the confirmation is received. If the fill price deviates too much, the position should be flattened immediately (if possible) or the user should be alerted with a high-priority "Slippage Warning" toast.

#### 3. Optimistic UI & Rejection Handling (Task 2)
*   **Assessment:** Immediate disable on click prevents "double-click" double-spend threats.
*   **Edge Case:** If the REST request fails (network error) *before* it even reaches the proxy, the buttons must re-enable. The current plan focuses on API-level `REJECTED` status; it should also explicitly cover catch-block logic for network failures.

#### 4. TradeLog & Notification UX (Task 3)
*   **Assessment:** Integration with `sonner` is perfect for this use case.
*   **Recommendation:** In `TradeLog`, clearly distinguish between "Working Orders" (not yet filled) and "Active Positions" (filled). The "Flatten" button should only appear for Active Positions, while "Cancel" is for Working Orders.

### Security & Risk (STRIDE)
*   **T-03-04 (Tampering):** UI limits are good, but the Proxy should ideally enforce a "Max Position Size" per epic to prevent catastrophic errors from a compromised or buggy frontend.

### Verdict
**Verdict: PASS**
The additions in Plan 02 (Slippage Cap, Guaranteed SL, Flatten/Cancel logic) significantly harden the execution layer. Implementation should proceed with a focus on the `stopDistance` vs. `stopLevel` distinction.

## Reviewer: Gemini CLI (v3.5 Flash) - 2026-06-06

### Phase 3 Plan 03: Precision & Orchestration Audit

#### 1. Risk Precision & `stopDistance` (Task 1)
*   **Assessment:** Transitioning to `stopDistance` (points) as the primary risk parameter is a major architectural win. It eliminates the "Invalid Level" race condition caused by price movement between UI interaction and API processing.
*   **Recommendation:** Ensure the UI (Task 2) specifically labels the input as "Points" to avoid user confusion with "Pips" (which may differ by a factor of 10 depending on the `scalingFactor` of the asset).

#### 2. Throttled Orchestration for "Flatten" (Task 1 & 3)
*   **Assessment:** The 100ms throttle implementation for batch DELETE calls correctly mitigates the risk of `429 Too Many Requests` (T-03-06). 
*   **Refinement:** In `flattenAll()`, consider wrapping the entire loop in a try-finally block to ensure that `isExecuting` is *always* reset to false, even if one of the API calls in the middle of the loop fails unexpectedly.

#### 3. Network Failure Resilience (Task 2)
*   **Assessment:** The plan correctly identifies the "stuck button" failure mode. By explicitly resetting UI state in the catch-block for both API and Network (fetch-level) errors, the terminal maintains a "fail-fast-and-recover" UX.
*   **Security Note:** Task 2's use of `toast.promise` is excellent, but ensure the `error` callback implementation follows T-03-07 by sanitizing any low-level error objects (e.g., Axios/Ky stack traces) before display.

#### 4. UI/UX Clarity (Task 3)
*   **Assessment:** The distinct "Flatten All" (Positions) vs "Cancel All" (Working Orders) controls provides the necessary separation for professional trading.
*   **Recommendation:** Visual feedback for rows being closed/cancelled is critical. Ensure the "spinning icon" state is derived from a local `closingDealIds` set in the store to prevent global UI lag.

### Security & Risk (STRIDE)
*   **T-03-07 (Information Disclosure):** The mitigation plan to sanitize error messages is confirmed. Ensure the store's error handling wrapper strips internal headers or URLs from the `Error.message` before passing it to `sonner`.

### Verdict
**Verdict: PASS**
Plan 03 is technically complete and aligns perfectly with the research-driven patterns for Capital.com integration. It addresses the critical reliability gaps (throttling and network failures) while providing the risk precision required for live trading.
