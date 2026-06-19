---
status: complete
phase: 06-sync-watchlist-with-capital-com
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md]
started: 2026-06-19T17:00:00Z
updated: 2026-06-19T17:03:33.704Z
---

## Current Test

[testing complete]

## Tests

### 1. Watchlist Initialization on Startup
expected: |
  On app load, the Watchlist is populated with the user's remote Capital.com watchlist state.
result: issue
reported: "Request failed with status code 405: PUT https://trading-terminal-psi-ashen.vercel.app/api/watchlist"
severity: blocker

### 2. Manual Watchlist Sync
expected: |
  Clicking the 'Sync' button in the Watchlist sidebar shows a spinning loading icon. When complete, a success toast notification appears, and the local watchlist is synced with the remote API.
result: issue
reported: "after the test failed, I think I can say that everything has failed. clicking on the sync button gives. Request failed with status code 405: PUT https://trading-terminal-psi-ashen.vercel.app/api/watchlist"
severity: blocker

### 3. Sync Failure Notification
expected: |
  If the manual sync fails (e.g. network error), an error toast notification is displayed to the user.
result: skipped
reason: "I don't know how to test this."

## Summary

total: 3
passed: 0
issues: 2
pending: 0
skipped: 1

## Gaps

- truth: "Clicking the 'Sync' button in the Watchlist sidebar shows a spinning loading icon. When complete, a success toast notification appears, and the local watchlist is synced with the remote API."
  status: failed
  reason: "User reported: after the test failed, I think I can say that everything has failed. clicking on the sync button gives. Request failed with status code 405: PUT https://trading-terminal-psi-ashen.vercel.app/api/watchlist"
  severity: blocker
  test: 2
  artifacts: []
  missing: []


- truth: "On app load, the Watchlist is populated with the user's remote Capital.com watchlist state."
  status: failed
  reason: "User reported: Request failed with status code 405: PUT https://trading-terminal-psi-ashen.vercel.app/api/watchlist"
  severity: blocker
  test: 1
  artifacts: []
  missing: []

