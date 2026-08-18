# Roadmap: Trading Terminal

## Milestones

- 🚧 **v1.3 Real-Time Alerting System** — Phases 1-3 (in progress)
- ✅ **v1.2 Advanced Order History & Chart Integration** — Phases 1-3 (shipped 2026-08-18)
- ✅ **v1.1 Security** — Phases 4-6 (shipped 2026-06-24)

## Phases

### Phase 1: Alerting E2E Benchmark (TDD)
**Goal:** Build the strict Playwright E2E test that validates the full alert lifecycle from UI creation to trigger.
**Requirements:** ALERT-01
- [ ] Create `tests/e2e/alerts.spec.ts` testing the alert creation flow.
- [ ] Test should mock time/price movement to trigger the alert.
- [ ] Verify test fails correctly before implementation.

### Phase 2: Alerting Engine Implementation
**Goal:** Build the core logic to evaluate market data against alert conditions.
**Requirements:** ALERT-02
- [ ] Create `src/store/useAlertStore.ts` to manage active alerts.
- [ ] Build evaluator logic that hooks into the WebSocket price feed.
- [ ] Write unit tests for the evaluator logic (`alertEngine.test.ts`).

### Phase 3: Alert UI & Notifications
**Goal:** Build the visual components to create alerts and show notifications when triggered.
**Requirements:** ALERT-03, ALERT-04
- [ ] Create `AlertCreationModal.tsx` for setting price/time alerts.
- [ ] Create `ActiveAlerts.tsx` sidebar list.
- [ ] Implement toast notifications or audio when the alert triggers.
- [ ] Run the Phase 1 E2E test and ensure 100% pass rate.

<details>
<summary>✅ v1.2 Advanced Order History & Chart Integration (Phases 1-3) — SHIPPED 2026-08-18</summary>

- [x] Phase 1: Test-Driven Development (TDD) Foundation
- [x] Phase 2: Netting Engine Implementation
- [x] Phase 3: Sidebar UI & Chart Sync

</details>

<details>
<summary>✅ v1.1 Security (Phases 4-6) — SHIPPED 2026-06-24</summary>

- [x] Phase 4: Order System Audit & Core Fixes
- [x] Phase 5: Order Lifecycle Testing & Validation
- [x] Phase 5.1: Advanced Edge Case Testing
- [x] Phase 5.2: Data Stitching & Market Engine Validation
- [x] Phase 6: Sync watchlist with capital.com

</details>
