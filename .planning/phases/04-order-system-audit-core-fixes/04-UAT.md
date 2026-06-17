---
status: partial
phase: 04-order-system-audit-core-fixes
source: [04-SUMMARY.md]
started: 2026-06-17T15:34:35Z
updated: 2026-06-17T15:34:35Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Global Event Listener Isolation
expected: |
  Open multiple charts. Focus on one and press alt+q. Exactly one order should be placed for the focused chart, and 0 orders for the others.
result: pass

### 2. Double Alt Netting (Execution Locks)
expected: |
  Spam "Double Alt" quickly on a chart. The UI should block the second press or safely ignore it without causing a double order.
result: issue
reported: "spamming double alt freezes the buy and sell button. the numbers disappear and buttons becomes unckickable.  is possible write a playwright test for double alt and test it."
severity: blocker

### 3. Attached Stop-loss/Take-profit Cancellation
expected: |
  Place a limit order and cancel it. Verify it is successfully removed from the backend and local state. Place an attached stop-loss on a position and cancel it. Verify the position is updated without the stop-loss.
result: issue
reported: "i can place a limit but the order id always is 00000. so not sure if the backend is the limit orders is working properly or not."
severity: major

### 4. State Sync Crash Fix
expected: |
  Open the application and view positions. The application should load without fatal crashes caused by state initialization issues.
result: pass

## Summary

total: 4
passed: 2
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: |
    Spam "Double Alt" quickly on a chart. The UI should block the second press or safely ignore it without causing a double order.
  status: failed
  reason: "User reported: spamming double alt freezes the buy and sell button. the numbers disappear and buttons becomes unckickable.  is possible write a playwright test for double alt and test it."
  severity: blocker
  test: 2
  artifacts: []
  missing: []
- truth: |
    Place a limit order and cancel it. Verify it is successfully removed from the backend and local state. Place an attached stop-loss on a position and cancel it. Verify the position is updated without the stop-loss.
  status: failed
  reason: "User reported: i can place a limit but the order id always is 00000. so not sure if the backend is the limit orders is working properly or not."
  severity: major
  test: 3
  artifacts: []
  missing: []
