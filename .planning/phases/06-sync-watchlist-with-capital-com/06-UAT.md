---
status: testing
phase: 06-sync-watchlist-with-capital-com
source: [06-VERIFICATION.md]
started: 2026-06-19T17:35:00Z
updated: 2026-06-20T11:43:00Z
---

## Current Test
number: 1
name: Watchlist Initialization on Startup
expected: |
  On app load, the Watchlist is populated with the user's remote Capital.com watchlist state.
awaiting: user response

## Tests

### 1. Watchlist Initialization on Startup
expected: |
  On app load, the Watchlist is populated with the user's remote Capital.com watchlist state.
why_human: "Requires live authentication and API keys to verify external service integration against the real Capital.com API."
result: pending

### 2. Manual Watchlist Sync
expected: |
  Clicking the 'Sync' button in the Watchlist sidebar shows a spinning loading icon. When complete, a success toast notification appears, and the local watchlist is synced with the remote API.
why_human: "Requires live authentication and API keys to verify external service integration against the real Capital.com API."
result: pending

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0

## Gaps

[none yet]
