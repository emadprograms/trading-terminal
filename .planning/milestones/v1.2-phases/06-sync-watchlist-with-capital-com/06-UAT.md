---
status: diagnosed
phase: 06-sync-watchlist-with-capital-com
source: [06-VERIFICATION.md]
started: 2026-06-19T17:35:00Z
updated: 2026-06-20T11:50:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Watchlist Initialization on Startup
expected: |
  On app load, the Watchlist is populated with the user's remote Capital.com watchlist state.
why_human: "Requires live authentication and API keys to verify external service integration against the real Capital.com API."
result: issue
reported: "watchlist is emptly, there should be dropdown in the watchlist header that allows you to select which watchlist you want to sync... there is no name and that watchlist is empty"
severity: major

### 2. Manual Watchlist Sync
expected: |
  Clicking the 'Sync' button in the Watchlist sidebar shows a spinning loading icon. When complete, a success toast notification appears, and the local watchlist is synced with the remote API.
why_human: "Requires live authentication and API keys to verify external service integration against the real Capital.com API."
result: issue
reported: "yes but again, I don't which watchlist is it syncing with and second I should be able to maintain multiple watchlists."
severity: major

## Summary

total: 2
passed: 0
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "On app load, the Watchlist is populated with the user's remote Capital.com watchlist state."
  status: failed
  reason: "User reported: watchlist is emptly, there should be dropdown in the watchlist header that allows you to select which watchlist you want to sync... there is no name and that watchlist is empty"
  severity: major
  test: 1
  artifacts: []
  missing: []

- truth: "Clicking the 'Sync' button in the Watchlist sidebar shows a spinning loading icon. When complete, a success toast notification appears, and the local watchlist is synced with the remote API."
  status: diagnosed
  reason: "User reported: yes but again, I don't which watchlist is it syncing with and second I should be able to maintain multiple watchlists."
  severity: major
  test: 2
  root_cause: "useWatchlistStore hardcodes syncing to watchlists[0], lacks state for all available watchlists, and UI lacks a selector dropdown."
  artifacts:
    - path: "src/store/useWatchlistStore.ts"
      issue: "Hardcodes remoteWatchlistId to first index and missing available watchlists state."
    - path: "src/components/Sidebar.tsx"
      issue: "Missing UI dropdown to select active watchlist."
  missing:
    - "Update store to fetch and track all available remote watchlists."
    - "Add UI dropdown in the header to select the active watchlist."
    - "Update sync logic to use the selected remoteWatchlistId."
  debug_session: .planning/debug/multiple-watchlists-dropdown.md
