---
phase: 06-sync-watchlist-with-capital-com
plan: 05
subsystem: watchlist
tags: [gap-closure, bugfix]
requires: ["06-01", "06-02", "06-03", "06-04"]
provides: ["Working watchlist synchronization", "Stable watchlist E2E tests"]
affects: ["vercel.json", "src/store/useWatchlistStore.ts", "src/services/watchlist.ts", "tests/e2e/watchlist-sync.spec.ts"]
tech-stack.added: []
patterns: ["API Proxy Rewrite", "Entity IDs for updates"]
key-files.created: []
key-files.modified: ["vercel.json", "src/store/useWatchlistStore.ts", "src/services/watchlist.ts", "tests/e2e/watchlist-sync.spec.ts"]
key-decisions:
  - "Store remoteWatchlistId in Zustand state to properly address the Capital.com watchlist API when performing updates."
  - "Isolate E2E watchlist UI tests by mocking all `/api/watchlist*` requests, preventing 401 Unauthorized errors from the backend proxy."
metrics:
  duration: 2m
  completed_date: "2026-06-19"
---

# Phase 06 Plan 05: Watchlist Sync Gap Closure Summary

Resolved critical gaps and blockers for Capital.com watchlist API integration by adding proxy routing, forwarding watchlist IDs, and stabilizing E2E tests.

## Completed Tasks

1. **Fix Backend Proxy Configuration:** Added rewrite rule for `/api/watchlist/:path*` mapping to `/api/watchlist` in `vercel.json`.
2. **Implement Watchlist ID Tracking for Updates:** Updated `src/store/useWatchlistStore.ts` to capture and persist `remoteWatchlistId` when initializing or syncing.
3. **Update Watchlist Service to Forward IDs:** Modified `src/services/watchlist.ts` to append the id to the endpoint URL (`watchlist/${id}`) if provided.
4. **Fix Watchlist Sync E2E Tests:** Mocked `**/api/watchlist*` routes in `tests/e2e/watchlist-sync.spec.ts` to return fake data, ensuring isolation and preventing 401 Unauthorized errors.

## Commits

- `0817891`: chore(06-05): add watchlist proxy rewrite to vercel.json
- `050f17e`: feat(06-05): add remoteWatchlistId tracking and forward in API updates
- `df9edd3`: test(06-05): fix watchlist-sync E2E test by mocking API to avoid 401s

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None

## Threat Flags

None

## Self-Check: PASSED
FOUND: vercel.json
FOUND: src/store/useWatchlistStore.ts
FOUND: src/services/watchlist.ts
FOUND: tests/e2e/watchlist-sync.spec.ts
FOUND: 0817891
FOUND: 050f17e
FOUND: df9edd3
