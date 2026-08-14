# Milestone v1.2 Roadmap

## Phase 1: Test-Driven Development (TDD) Foundation
**Goal:** Build a robust, bulletproof testing benchmark (Playwright & Unit) for the Netting Engine before implementing any code.
**Requirements:** HIST-04
- [ ] Investigate raw activity history from Capital.com to understand partial close data structures.
- [ ] Write Unit Tests for the Netting Engine that input mocked raw execution arrays (handling staggered entries, partial closes, and full exits) and assert the correct output `Trade` objects.
- [ ] Write Playwright E2E Tests that verify a mocked Trade object renders correctly in the Sidebar and triggers the chart zoom interaction when clicked.
- [ ] Verify tests FAIL initially (benchmark established).

## Phase 2: Netting Engine Implementation
**Goal:** Implement the logic to parse raw executions into grouped Trade objects.
**Requirements:** HIST-01
- [ ] Build the `TradeHistory` netting engine in `useTradeStore.ts`.
- [ ] Chronologically aggregate raw executions into `Trade` entities with accurate `realizedPnL`, `totalSize`, `openTime`, and `closeTime`.
- [ ] Run the Phase 1 Unit Tests.
- [ ] Refine the engine until 100% of Phase 1 Unit Tests PASS.

## Phase 3: Sidebar UI & Chart Sync
**Goal:** Build the user interface for Order History and link it to the charting engine.
**Requirements:** HIST-02, HIST-03
- [ ] Build the `Sidebar` UI component to cleanly render the list of `Trade` entities.
- [ ] Implement click handlers on the Trade cards that dispatch an event to `TradePlugin` / Lightweight Charts to update the `visibleRange` based on the trade's `openTime` and `closeTime`.
- [ ] Run the Phase 1 Playwright Tests.
- [ ] Refine the UI and logic until 100% of Phase 1 Playwright Tests PASS.
