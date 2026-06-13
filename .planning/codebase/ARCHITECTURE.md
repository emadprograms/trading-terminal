# Architecture

**Mapped:** 2026-06-13
**Scope:** Full codebase

## System Design
The application follows a **Serverless Proxy + SPA** architecture designed for minimum latency and maximum responsiveness.

### 1. Presentation Layer (React SPA)
- Built with Vite and React 18.
- Manages local UI state with Zustand (e.g., `useTradeStore`).
- Handles data fetching via React Query.
- Renders high-performance canvas charts using Lightweight Charts.

### 2. API Proxy Layer (Vercel Serverless Functions)
- Located in the `api/` directory.
- Intercepts requests from the frontend (e.g., `/api/market`, `/api/order`).
- Uses `undici` to directly proxy requests to Capital.com (`api-capital.backend-capital.com`).
- Handles CORS preflight (`OPTIONS`) and injects server-side credentials (`X-CAP-API-KEY`) securely without exposing them to the browser.
- Explicitly avoids heavy middle-tiers like Hono or Cloudflare Tunnels to minimize latency.

### 3. Data Processing Layer (Web Worker Database)
- Utilizes `sql.js` (SQLite WASM) running in a dedicated Web Worker.
- Caches large volumes of tick data for play-by-play playback and charting without blocking the main React rendering thread.

## Data Sync, Stitching, & Resampling Flow

The application achieves zero-lag chart rendering and highly accurate Daily (1D) bars through a sophisticated data synchronization and resampling engine located in `src/hooks/useChartData.ts` and `src/lib/sync-coordinator.ts`.

### 1. Initial Load & Caching (`syncCoordinator`)
- **Instant Cache Hit:** When a user switches markets, the `syncCoordinator` first attempts to fetch historical data instantly from the local SQLite Web Worker (`sql.js`).
- **REST Fallback:** If the cache is empty or incomplete, it fetches a 1000-candle chunk via the Capital.com REST API (proxied through Vercel Serverless).
- **Infinite Scroll:** As the user pans left on the chart, `timeScale` detects when the view approaches the oldest loaded candle. It triggers `fetchHistoricalChunk` dynamically, prepending older data while rigorously deduplicating and sorting it to prevent chart engine crashes.

### 2. WebSocket Stitching
- **Live Streaming:** `wsManager` maintains an active WebSocket connection to Capital.com for real-time tick data.
- **Offline Gap Recovery:** If the user minimizes the tab or loses internet connection, the app uses `visibilitychange` and `online` event listeners to re-trigger the `syncCoordinator`. This automatically fills in any data gaps missed while offline.
- **Stitching:** Real-time WebSocket ticks are dynamically appended to the historical REST data array and pushed to the local SQLite cache to keep it perfectly synchronized.

### 3. Advanced 1D Chart Resampling (Regular Trading Hours)
Capital.com's native 1D data often includes Extended Trading Hours (ETH) or uses UTC midnight boundaries, which distorts daily candles for equities (e.g., AAPL should only show 09:30-16:00 EST).
To fix this, the app uses a custom resampling engine (`src/lib/resampling.ts`):
- **Condition:** When viewing a **1D timeframe**, with ETH hidden, and the asset is not UTC-based.
- **Intraday Sourcing:** The app pulls `30min` intraday data from the local cache.
- **Filtering:** It filters out all non-RTH (Regular Trading Hours) candles from the 30min dataset.
- **Aggregation:** It passes the filtered 30min data into `resampleData(data, '1D')`, which aggregates the Open, High, Low, Close, and Volume into perfectly aligned daily candles.
- **Splicing:** These ultra-accurate, dynamically generated daily candles are then seamlessly spliced on top of the older historical 1D data, giving the user a flawless chart without losing deep history.
