---
phase: 03-order-execution-layer
plan: 00
subsystem: trade-state
tags: [trading, zustand, types, msw]
requires: []
provides: [trade-foundation]
affects: [store, types, api]
tech-stack: [zustand, vitest, msw]
key-files: [src/types/trade.ts, src/store/useTradeStore.ts, src/store/useTradeStore.test.ts, src/api/trade.test.ts]
decisions:
  - Global Zustand store for trade lifecycle management.
  - Asynchronous order tracking using dealReference.
metrics:
  duration: 15m
  completed_date: 2026-06-05
---

# Phase 03 Plan 00: Scaffolding & Store Summary

Established the foundational types, global state management, and testing infrastructure for the order execution layer.

## Key Changes

### Trade Domain Models
- Created `src/types/trade.ts` defining `Order`, `Position`, and `TradeConfirmation` interfaces.
- Implemented `OrderStatus`, `OrderType`, and `OrderDirection` enums.

### Global Trade Store
- Implemented `useTradeStore` using Zustand to manage `pendingOrders` and `positions`.
- Added actions for adding pending orders, updating order status, and managing active positions.
- Verified state transitions with unit tests in `src/store/useTradeStore.test.ts`.

### Testing Infrastructure
- Setup `src/api/trade.test.ts` with MSW handlers to mock Capital.com's `/positions`, `/workingorders`, and `/confirms` endpoints.
- Verified that the `api` client correctly interacts with these mocked endpoints.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
- [x] `src/types/trade.ts` exists and contains defined types.
- [x] `src/store/useTradeStore.ts` passes unit tests.
- [x] `src/api/trade.test.ts` passes MSW integration tests.
- [x] All changes committed with proper prefixes.
