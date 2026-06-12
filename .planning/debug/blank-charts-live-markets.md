# Debug Log: Blank Charts on Live Markets

## The Problem
When switching tickers or timeframes, the chart canvas intermittently goes completely blank. 
**Crucial Clue:** This issue *only* affects live, open markets (where WebSocket ticks are actively streaming). Closed markets (no active WebSocket data) load perfectly fine.

## Context
The application uses `SyncCoordinator` to fetch historical REST data and `ws-manager` to stream live pricing via WebSockets. `useChartLifecycle.ts` manages the synchronization of historical data (REST) and live ticks (WS) into the `lightweight-charts` instance.

## What Has Been Attempted So Far

### 1. API Rate Limiting & Concurrency Control (Kept)
*   **Hypothesis:** The newly introduced background watchlist prefetcher was spamming the API, causing 429 errors. The foreground chart fetch was sharing the same promises, so when the background request failed, the foreground received an empty array.
*   **Action:** Decoupled the foreground `syncTicker` from the background prefetcher. They no longer share `pendingFetches`. Added a request queue (throttle) to the prefetcher and a 1-retry mechanism for foreground fetches.

### 2. Chart Canvas & Plugin Reuse (Reverted)
*   **Hypothesis:** Destroying and recreating the `lightweight-charts` instance on every ticker switch was slow.
*   **Action:** Attempted to reuse the chart instance and plugins by removing `ticker` and `timeframe` from their initialization `useEffect` dependency arrays, opting instead to just clear data with `setData([])`.
*   **Result:** This introduced severe race conditions between React's render cycle, plugin attachment, and data hydration. 
*   **Current State:** **REVERTED.** The chart is correctly destroyed and recreated from scratch on every ticker/timeframe change to ensure a clean slate.

### 3. Hydration Race Conditions (Partially Kept)
*   **Hypothesis:** The `isLoadingHistory` boolean state was triggering the main data update effect in `useChartLifecycle` prematurely. Before data arrived, the effect would run, hit the `else` block, and clear the chart series.
*   **Action:** Removed `isLoadingHistory` from the data effect's dependency array so it only reacts to actual `chartData` changes.

### 4. WebSocket Buffering Removal (Kept)
*   **Hypothesis:** To close the gap between REST historical data and live WS ticks, `syncTicker` used to enable "buffering" in `ws-manager`. During the fetch, all WS ticks were diverted to an array instead of updating the `usePriceStore`. 
*   **Action:** Because this seemed to block live ticks during crucial hydration moments, buffering was completely removed from `SyncCoordinator`. Live ticks now flow freely to the `usePriceStore` at all times.

## Current Suspicions for the Next Developer

Since the issue strictly isolates to **Live Markets**, the problem almost certainly resides in the interaction between historical data injection and live WebSocket tick updates.

1.  **Lightweight-Charts Time Conflict (Out-of-Order Error):**
    In `useChartLifecycle.ts` (Effect 7: Live Tick Updates), we append live ticks to the chart. `lightweight-charts` is notoriously strict about time series data; if a live tick arrives with a timestamp that is *older* than or *equal to but malformed* compared to the last historical candle injected, it can crash the series internally or cause it to render blank.
2.  **`lastCandleRef` Synchronization:**
    `lastCandleRef` is seeded from the historical data (Effect 7b). If a live WebSocket tick arrives exactly as the historical data is being parsed but *before* `lastCandleRef` is correctly seeded, the live tick logic might create a malformed candle or break the series sequence.
3.  **Hydration Boundary:**
    We guard live ticks with `isHydrated`. There might be a micro-state where `isHydrated` is true, historical data has been passed to `setData()`, but the internal chart state isn't ready for a `series.update()` call yet.

## Next Steps
Focus debugging efforts entirely on `useChartLifecycle.ts`, specifically the `Live Tick Updates from WebSocket` effect and how `lastCandleRef` is managed alongside incoming historical data. Monitor the console for hidden `lightweight-charts` errors regarding out-of-order timestamps.