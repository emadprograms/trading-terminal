# Phase 02 Verification: Market Data Engine

**Status:** `passed`

## Goal Achievement
The goal of Phase 02 was to integrate live REST API and WebSocket data from Capital.com to replace local SQLite data, ensuring charts populate immediately and update in real-time.

**Verdict:** The implementation successfully replaces the local data layer with live API integration, providing real-time Bid/Ask updates and historical candle streaming.

## Requirement Traceability

| Requirement ID | Feature | Implementation Status | Evidence |
|----------------|---------|------------------------|----------|
| **DATA-01** | WebSocket Real-time Ticks | `Implemented` | `src/lib/ws-manager.ts`, `src/store/usePriceStore.ts`, `src/components/ChartHeader.tsx` |
| **DATA-02** | REST API Historical Candles | `Implemented` | `src/api/market.ts`, `src/lib/data-adapter.ts`, `src/lib/db.ts` |

## Verified "Must-Haves"

### 1. REST Infrastructure
- [x] **Type-safe Client**: `marketApi.fetchCandles` provides typed `CapitalCandle[]` responses.
- [x] **Resolution Mapping**: `mapTimeframeToResolution` correctly maps app timeframes to API resolutions.
- [x] **Data Adapter**: `transformCapitalCandles` converts API responses to internal `RawBar` format, normalizing timestamps and selecting bid prices.
- [x] **Live Integration**: `fetchMarketData` and `fetchHistoricalChunk` in `src/lib/db.ts` now call the REST API.

### 2. WebSocket Engine
- [x] **Connection Lifecycle**: `WebSocketManager` handles `connect`, `authenticate`, `subscribe`, and `unsubscribe` flows.
- [x] **Real-time Store**: `usePriceStore` provides atomic updates for Bid/Ask prices.
- [x] **UI Feedback**: `ChartHeader` displays live price updates for the active ticker.
- [x] **Environment Switching**: `syncEnvironment` handles reconnecting the WebSocket when switching between Demo and Live environments.

## Validation Results
- **Historical Data**: Verified that `useChartData` triggers `fetchMarketData` on ticker/timeframe change, populating the chart via REST API. (Verified via `tests/unit/hooks/useChartData.test.tsx`)
- **Real-time Data**: Integrated `WebSocketManager` into `useSession` and `useChartData`. Verified that it correctly updates `usePriceStore`, which is observed by the `ChartHeader` component for live Bid/Ask updates. (Verified via `tests/unit/ws-manager.test.ts` and `tests/unit/ChartHeader.live.test.tsx`)
- **Environment Switching**: Integrated `wsManager.syncEnvironment()` into the environment toggle flow. Verified that the WebSocket reconnects to the correct endpoint (Demo/Live) when the environment is switched.
- **Lifecycle Management**: Fixed WebSocket connection leaks by ensuring proper disconnect on unmount and token clearance. (Verified via `tests/unit/hooks/useChartData.test.tsx`)
- **Bug Fixes**: Resolved `ReferenceError` in `ChartHeader` and `Invalid URL` errors in the API client during the UAT phase.
