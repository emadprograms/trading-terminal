---
status: investigating
trigger: User reported fatal crashes and data resolution issues in Market Data Engine.
priority: critical
---

# Debug Session: Market Data Engine Failures

## Current Focus
- **Hypothesis**: Data merging logic in `useChartData.ts` does not guarantee ascending order of timestamps, causing `lightweight-charts` to crash. REST API resolution logic is mismatched with Capital.com requirements.
- **Next Action**: Investigate `useChartData.ts` and `marketApi.ts` to identify sorting and resolution bugs.

## Evidence
- [2023-10-27T10:00:00Z] Symptom 1: Fatal Crash `Error: Assertion failed: data must be asc ordered by time` in `useChartData.ts` during infinite scroll/prepend phase.
- [2023-10-27T10:00:00Z] Symptom 2: REST API calls are requesting the wrong resolution (e.g., requesting `DAY` when a shorter timeframe is expected) and returning insufficient candles (e.g., 10 candles for BTCUSD).
- [2023-10-27T10:00:00Z] Symptom 3: `WebSocketManager` logs `Error: Cannot update oldest data` because the underlying chart series is in a corrupted state due to the sorting crash.

## Resolution
- **Root Cause**: TBD
- **Fix**: TBD
