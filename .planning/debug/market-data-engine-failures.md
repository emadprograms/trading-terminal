---
status: resolved
trigger: User reported fatal crashes and data resolution issues in Market Data Engine.
priority: critical
---

# Debug Session: Market Data Engine Failures

## Current Focus
- **Resolved**: The chart now correctly displays the requested 1000 candles at the specified resolution.

## Evidence
- [Fixed] Fatal Crash `Error: Assertion failed: data must be asc ordered by time` - Fixed via explicit `localeCompare` sort in `useChartData.ts`.
- [Fixed] WebSocket `Error: Cannot update oldest data` - Resolved by synchronizing `1D` anchors to `00:00:00` and adding a safety guard in `useChartLifecycle.ts` to skip out-of-order ticks.
- [Fixed] **Insufficient Data Depth**: Query parameters were being stripped by the proxy server AND date formats were missing the required `T` separator. 

## Resolution
- **Root Cause**: 
    1. Proxy server URL construction was fragile.
    2. API parameters (`to`/`from`) used spaces instead of `T`, causing the API to ignore the query string and return default 10 candles.
    3. `1D` historical data was anchored to 12:00:00 while live data was anchored to 00:00:00, causing WebSocket updates to fail as "older" than history.
- **Fix**: 
    1. Robust URL construction in `server/index.ts`.
    2. Date sanitization in `src/api/market.ts`.
    3. Aligned `1D` anchors in `src/lib/resampling.ts`.
    4. Out-of-order tick guard in `src/hooks/useChartLifecycle.ts`.
