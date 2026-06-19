---
phase: 06-sync-watchlist-with-capital-com
plan: 02
subsystem: api
tags: [watchlist, state, zustand, fetch]

# Dependency graph
requires:
  - phase: 06-sync-watchlist-with-capital-com
    provides: [API proxy structure]
provides:
  - Watchlist syncing logic
  - Watchlist startup override from Capital.com
affects: [06-03]

# Tech tracking
tech-stack:
  added: []
  patterns: [Zustand persist, Optimistic UI updates]

key-files:
  created: []
  modified: ["src/store/useWatchlistStore.ts", "src/App.tsx"]

key-decisions:
  - "Sync uses a two-way differential approach, pulling down Capital.com's list and retaining local un-pushed additions, deleting local pending deletions."
  - "Startup wipes local state and overrides perfectly with Capital.com."

patterns-established:
  - "Watchlist manual sync handles pending queues for atomic API updates."

requirements-completed: []

# Metrics
duration: 15min
completed: 2026-06-19
---

# Phase 06: Sync watchlist with capital.com - Plan 02 Summary

**Implemented the frontend logic for startup watchlist overrides and manual two-way sync.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-19T13:30:00+03:00
- **Completed:** 2026-06-19T13:45:00+03:00
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Extended `useWatchlistStore` with `pendingAdditions`, `pendingDeletions`, and `isInitialized` queues.
- Added `initializeWatchlist` action to overwrite local symbols perfectly with Capital.com's state on startup.
- Added `syncWithRemote` action to compute a delta between remote and local pending changes, pushing the atomic result up to the Capital.com API.
- Integrated `initializeWatchlist` into `App.tsx`'s mounting `useEffect`.

## Task Commits

1. **Task 1 & 2: Implement frontend sync logic and pending queues** - `...` (feat)
2. **Task 3: Call initializeWatchlist on app mount** - `...` (feat)

## Files Created/Modified
- `src/store/useWatchlistStore.ts` - Extended with `initializeWatchlist`, `syncWithRemote`, and pending tracking arrays.
- `src/App.tsx` - Bootstraps the application state with Capital.com watchlist via `useEffect`.

## Decisions Made
None - followed plan as specified.

## Deviations from Plan
Combined Task 1 and 2 commits as they were deeply intertwined within `useWatchlistStore.ts` refactoring.

## Issues Encountered
None.

## Next Phase Readiness
Ready for UI Implementation (Plan 03).
