# Milestone v1.0 Requirements

## UI Polishing & Bug Fixes
- [ ] **UI-01**: User sees the correct entry price when hovering over the historical order triangle on the chart (an arrow without a dash must pop up showing the exact correct entry price for that candle).

## Data Integrity & Testing
- [ ] **TEST-01**: Thoroughly test and validate the data stitching (REST history seamlessly synced with live WebSocket ticks) to guarantee state integrity.
- [ ] **TEST-02**: Playwright E2E suite successfully tests the critical path (order placement, chart switching, order histories) against regressions in latency and correctness.

## Proxy Hardening & Syncing
- [ ] **PROXY-01**: System correctly and reliably syncs order history, prices, and orders with Capital.com without data misinterpretation.
- [ ] **PROXY-02**: User orders are executed reliably via Vercel Serverless Functions with strict Zod validation.
- [ ] **PROXY-03**: System gracefully handles Capital.com backend errors without crashing the client or blocking the UI.

## Future Requirements
- Advanced UI Micro-animations (framer-motion)
- Edge Case E2E Tests
- Advanced Order Types & Strategies
- Portfolio Analytics & Performance History

## Out of Scope
- Heavy Client-Side Analytics (deferred to prevent main thread blocking)
- Over-Mocked Tests (we need to test the real Capital.com integrations via the proxy)
- Premium Aesthetic Polish (deferred to prioritize core functional correctness and accurate data stitching)

## Traceability
<!-- Filled by roadmap -->
