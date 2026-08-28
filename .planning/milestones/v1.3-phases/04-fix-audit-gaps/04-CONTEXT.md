# Phase 4 Context: Fix Audit Gaps (Engine & UI Integration)

## Requirements & Gaps
Based on `v1.3-MILESTONE-AUDIT.md`:
- **ALERT-01 (E2E Test)**: E2E mocks wiring instead of testing E2E flow. `tests/e2e/alerts.spec.ts` manually invokes the engine (`__E2E_PUSH_PRICE_TICK`) instead of verifying real WebSocket data flow.
- **ALERT-02 (Engine Integration)**: Engine disconnected from WS, missing ticker logic. `evaluatePrice` is never called by real market data. Alerts do not track which ticker they belong to.
- **ALERT-03 (UI Hardcoded Price)**: UI uses hardcoded initial price (100) instead of retrieving it from active ticker.
- **ALERT-04 (Audio Missing)**: Visual toast works, but audio is missing.

## Goal
Fix Alert Engine integration, asset routing, UI data binding, audio triggers, and E2E mocks.
