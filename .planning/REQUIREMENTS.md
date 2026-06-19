# Milestone v1.1 Requirements

## Code & Event Audit
- [ ] **AUDIT-01**: System executes orders perfectly without event listener duplication (e.g. multi-chart alt+q bugs) or unmanaged state causing ghost orders.

## Order System Hardening
- [ ] **ORDER-01**: `flattenHalfSymbol` (Double Alt) calculates true net size exclusively using `status === 'PENDING'` orders (fixes historical sum bug).
- [ ] **ORDER-02**: Limit orders are fully cancellable and never get permanently stuck in a pending/un-cancellable state.
- [ ] **ORDER-03**: Shortcut and UI-triggered orders fire exactly once, guaranteeing no double orders regardless of UI load or chart switching.

## Order Lifecycle Testing
- [ ] **TEST-03**: A rigorous order lifecycle test suite covers extreme latency edge cases, limit order cancellations, multi-chart event handling, and double alt logic.
- [ ] **TEST-04**: Advanced edge case testing covering attached SL/TP cancellations, half-flatten worst leg verification, and API error recovery.

## Future Requirements
- Advanced UI Micro-animations (framer-motion)
- Edge Case E2E Tests (Non-order related)
- Advanced Order Types & Strategies
- Portfolio Analytics & Performance History

## Out of Scope
- Heavy Client-Side Analytics (deferred to prevent main thread blocking)
- Over-Mocked Tests (we need to test the real Capital.com integrations via the proxy)
- Premium Aesthetic Polish (deferred to prioritize core functional correctness and accurate data stitching)

## Traceability
- **AUDIT-01**: Phase 4
- **ORDER-01**: Phase 4
- **ORDER-02**: Phase 4
- **ORDER-03**: Phase 4
- **TEST-03**: Phase 5
- **TEST-04**: Phase 5.1
