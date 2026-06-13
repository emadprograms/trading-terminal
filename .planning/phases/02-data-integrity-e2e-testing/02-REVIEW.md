---
status: clean
files_reviewed: 16
critical: 0
warning: 0
info: 2
total: 2
---
# Phase 2 Review - Data Integrity & E2E Testing

## Scope
Reviewing the implementation of data stitching integrity checks, WebSocket/REST gap detection, error banner propagation, and Playwright E2E/stress tests against the real Capital.com Demo API.

## Summary of Changes
- **Data Stitching Detection:** Implemented `DataStitchingError` in `SyncCoordinator` which strictly checks the gap between the last REST candle and first WebSocket tick based on timeframe thresholds.
- **UI Propagation:** Added `StitchingErrorBanner` component connected through `useChartData` and `ChartUnit` to visualize stitching breaks to the user.
- **Data Deduplication & Sorting:** Added logic in `useChartData` to strictly sort (`a.time.localeCompare(b.time)`) and deduplicate fetched chunks to prevent `lightweight-charts` assertions.
- **E2E Tests:** Configured Playwright with `x-bypass-mocks` to ensure tests hit the real API proxy. Added `critical-path.spec.ts` to assert that no stitching errors appear during normal usage.
- **Stress Test:** Added `stress-test.ts` to hammer the API proxy endpoint and gauge rate limits/latency.
- **Performance/Regression Tests:** Visual viewport regression and React render-cycle tests confirm optimizations are working.

## Findings

### Critical
*None*

### Warning
*None*

### Info
1. **Empty Debug Blocks in `useChartLifecycle.ts`:**
   - Lines 310-312: There is an empty `if (formatted[i].time <= formatted[i-1].time) { }` block which seems to be a leftover from debugging.
   - Lines 326-328 & 338-340: There are empty `catch (err) { }` blocks when calling `setData`. Swallowing `lightweight-charts` errors without a `console.warn` could make diagnosing future data shape issues difficult.
2. **String comparison for temporal sorting:**
   - In `useChartData.ts` line 276, `newData.sort((a, b) => a.time.localeCompare(b.time));` relies on the string format `YYYY-MM-DD HH:mm:ss`. This works correctly for the current timestamp format but is generally slightly more brittle than comparing parsed epoch timestamps.

## Conclusion
The data integrity and E2E testing logic has been implemented very solidly. The `SyncCoordinator` effectively detects threshold breaches, and the UI correctly captures and surfaces them. The Playwright tests are configured to bypass MSW correctly and validate the critical path against real infrastructure.

The code is approved with the minor suggestion to clean up empty debug blocks if desired.
