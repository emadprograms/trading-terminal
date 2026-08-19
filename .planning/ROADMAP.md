# Roadmap: Trading Terminal

## Milestones

- 🚧 **v1.4 Chart Alerts Integration** — Phases 1-3 (in progress)
- ✅ **v1.3 Real-Time Alerting System** — Phases 1-4 (shipped 2026-08-18)
- ✅ **v1.2 Advanced Order History & Chart Integration** — Phases 1-3 (shipped 2026-08-18)
- ✅ **v1.1 Security** — Phases 4-6 (shipped 2026-06-24)

## Phases

### Phase 1: Chart Alerts E2E Benchmark (TDD)

**Goal:** Build the strict Playwright E2E test that validates the chart interaction flow before any implementation.
**Requirements:** TEST-01

- [ ] Create `tests/e2e/chart-alerts.spec.ts` to test hovering over the chart axis and clicking the plus button.
- [ ] Test should mock chart rendering and verify correct interaction flows.
- [ ] Verify test fails correctly before moving to next phase.

### Phase 2: Lightweight Charts Visual Alerts

**Goal:** Visually plot active alerts for the current asset on the chart.
**Requirements:** VISUAL-01

- [ ] Read active alerts for the current asset from `useAlertStore`.
- [ ] Draw horizontal price lines on the Lightweight Chart for each active alert.
- [ ] Ensure lines update/remove when alerts trigger or are deleted.

### Phase 3: Crosshair Interactive Alert Creation

**Goal:** Implement the plus button on the Y-axis when the user hovers/moves the crosshair.
**Requirements:** CHART-01, CHART-02

- [ ] Track crosshair position on the Y-axis (price level) in Lightweight Charts.
- [ ] Render a clickable plus (+) symbol on the Y-axis aligned with the crosshair.
- [ ] Connect the plus symbol click to the alert creation UI modal/sidebar.

<details>
<summary>✅ v1.3 Real-Time Alerting System (Phases 1-4) — SHIPPED 2026-08-18</summary>

See full archive: `.planning/milestones/v1.3-ROADMAP.md`

</details>

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
