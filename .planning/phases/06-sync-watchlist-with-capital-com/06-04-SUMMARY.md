---
phase: 06-sync-watchlist-with-capital-com
plan: 04
subsystem: testing
tags: [e2e, playwright, testing]
requires:
  - phase: 06-sync-watchlist-with-capital-com
    provides: ["Watchlist manual sync"]
provides:
  - "Watchlist Sync E2E tests"
affects: ["tests/e2e/watchlist-sync.spec.ts"]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Playwright page.evaluate for teardown"]

key-files:
  created: ["tests/e2e/watchlist-sync.spec.ts"]
  modified: ["src/store/useWatchlistStore.ts"]

key-decisions:
  - "Used page.evaluate for setup and teardown to ensure requests run in the browser context where MSW or Vite API routing correctly handles `/api/watchlist` locally."
  - "Added error throwing to `syncWithRemote` store action to ensure the UI error toast is correctly triggered on failures."

patterns-established:
  - "Network interception in Playwright for failure scenario testing."

requirements-completed: []

# Metrics
duration: 15 min
completed: 2026-06-19
---

# Phase 06 Plan 04: Testing & Verification Summary

**Implemented Watchlist Sync E2E tests covering happy path and failure scenarios.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-19T13:36:00+03:00
- **Completed:** 2026-06-19T13:51:00+03:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `tests/e2e/watchlist-sync.spec.ts` for end-to-end testing of Watchlist syncing.
- Added a happy path test that adds a symbol and asserts successful sync.
- Implemented state cleanup in `afterEach` via `page.evaluate` to prevent test symbols from polluting the live Capital.com account.
- Implemented a failure scenario using Playwright's `page.route` to mock a 500 server error and verify the error toast notification.
- Fixed an issue in `useWatchlistStore.ts` where `syncWithRemote` was swallowing errors, causing the "Sync Failed" toast to never appear.

## Task Commits

Each task was committed atomically:

1. **Task 1 & 2: Create Watchlist Sync E2E tests and fix store error handling** - `38741ac` (test)

## Files Created/Modified
- `tests/e2e/watchlist-sync.spec.ts` - New E2E test file.
- `src/store/useWatchlistStore.ts` - Fixed error swallowing on failed syncs.

## Decisions Made
- Used `page.evaluate` to perform `fetch` in setup and teardown instead of Playwright's `request` object to ensure it is handled correctly by the dev server or MSW in the browser context.
- Grouped both tasks into one file creation since they relate to the exact same file and flow.

## Deviations from Plan
- Task 1 and Task 2 were committed together as they were implemented in a single cohesive test file structure.
- Modified `src/store/useWatchlistStore.ts` to throw errors in `syncWithRemote` so that the failure test scenario passes and UI behaves as expected.

## Issues Encountered
None

## Next Phase Readiness
Phase 06 is fully verified and complete. Ready for next phase.
