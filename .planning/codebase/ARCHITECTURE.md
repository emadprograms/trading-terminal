# Architecture

**Analysis Date:** 2026-06-13

## Pattern Overview

**Overall:** Client-Server Single Page Application (SPA) with local SQLite database play-by-play playback capabilities and an external broker proxy server.

**Key Characteristics:**
- **Local WASM SQLite Storage:** Heavy local analytical capabilities powered by SQLite WASM (`sql.js`) inside a Web Worker.
- **State-Driven Rendering:** Centralized state management using Zustand stores coordinating playback, trade log, and layout states.
- **Proxy Middleware:** Hono Node.js server bypassing CORS restriction policies and injecting fallback API credentials.
- **Plugin-Based Charting:** Drawing, trading, and indicator visual overlay layers implemented via custom lightweight-charts canvas plugins.

## Layers

**Presentation Layer (UI):**
- Purpose: Render dashboard layout, charts canvas, watchlists, trade control panels, and transaction logs.
- Location: `src/components/*.tsx` (e.g. `src/components/ChartCanvas.tsx`, `src/components/TradeControls.tsx`).
- Depends on: Hooks layer, Zustand stores, Types.

**State Management Layer (Zustand):**
- Purpose: Centralize app states (current playback tick, active orders, account state, and active watchlist).
- Location: `src/store/*.ts` (e.g. `src/store/useTradeStore.ts`, `src/store/usePlaybackStore.ts`).
- Depends on: API and Lib layers.

**React Hooks Layer:**
- Purpose: Bridge UI components to stores, lifecycle orchestration, and keyboard shortcut listeners.
- Location: `src/hooks/*.ts` and `src/hooks/chart/*.ts` (e.g. `src/hooks/useChartLifecycle.ts`, `src/hooks/useTradeManager.ts`).
- Depends on: Store layer, API client, Lib wrappers.

**API Client Layer:**
- Purpose: Manage authentication headers and transport-layer fetch actions.
- Location: `src/api/*.ts` (e.g. `src/api/client.ts`, `src/api/trade.ts`).
- Depends on: Network/Proxy targets.

**Services & Workers Layer:**
- Purpose: Heavy lifting (SQLite queries, synchronization logic, and WebSocket communication).
- Location: `src/lib/*.ts` and `src/lib/workers/*.ts` (e.g. `src/lib/db.ts`, `src/lib/workers/db.worker.ts`).

**Backend Proxy Layer:**
- Purpose: Handle CORS policies, exposed authentication headers (`CST`, `X-SECURITY-TOKEN`), and fallback routing target redirection.
- Location: `server/index.ts`.

## Data Flow

**Interactive Market Rewind Playback:**
1. User clicks the "Play" button in `src/components/TradeControls.tsx`.
2. Component triggers action in `src/store/usePlaybackStore.ts`.
3. Playback timer starts ticking; each interval fetches raw candles/bars from the local WASM SQLite database using the Worker proxy `src/lib/db.ts` or coordinates syncing via `src/lib/sync-coordinator.ts`.
4. Zustand store updates the current candle state (`usePriceStore.ts`, `usePlaybackStore.ts`).
5. `src/components/ChartCanvas.tsx` listens to store updates and renders the new candle using lightweight-charts.
6. The `TradePlugin.ts` overlay redraws active mock/live order markers at correct coordinates.

**Session Authentication Flow:**
1. App mounts; `src/hooks/useSession.ts` attempts automatic session recovery or login.
2. Request is dispatched to the Hono proxy `/session` path (`server/index.ts`).
3. Proxy validates credentials, injecting env variables if credentials are missing, and fetches session from Capital.com API.
4. Upstream session response headers (`CST` and `X-SECURITY-TOKEN`) are intercepted by proxy, exposed to CORS, and sent back.
5. Frontend stores tokens in `src/store/useSessionStore.ts` for all downstream requests.

## Key Abstractions

**Database Worker Proxy (`DatabaseWorkerProxy`):**
- Purpose: Expose clean async API for the main thread to fetch SQLite ticks/tickers while keeping database WASM CPU overhead isolated to a Web Worker.
- Location: `src/lib/db.ts` (Main Thread) and `src/lib/workers/db.worker.ts` (Worker Thread).

**Chart Plugins (`BoundaryLinePlugin`, `TradePlugin`, etc.):**
- Purpose: Extend baseline Lightweight Charts functionality with custom canvas layers for horizontal rays, rectangles, volume profiles, and trade levels.
- Location: `src/lib/*.ts` (e.g. `src/lib/TradePlugin.ts`).

**Sync Coordinator (`SyncCoordinator`):**
- Purpose: Handle sync queues for fetching and storing chunked tick historical charts smoothly.
- Location: `src/lib/sync-coordinator.ts`.

## Entry Points

**Frontend Web App:**
- Location: `src/main.tsx` bootstrapping `src/App.tsx`.
- Invocation: Browsers opening the app.

**Backend Server/Proxy:**
- Location: `server/index.ts`.
- Invocation: Running `npm run start:proxy` (loads Hono backend server proxy).

## Error Handling

**Strategy:** Global ErrorBoundary component wraps the dashboard workspace to prevent full app crashes. API errors are wrapped in client catch blocks and surfaced to UI using the `sonner` toast notifications API.
- Custom middleware error tracking logs errors with prefix `[StabilityTrace]`.
- Network request failure triggers retry loops in utility scripts (e.g. `fetchHistoricalChunk` fallback logic).

---

*Architecture analysis: 2026-06-13*
*Update when major patterns change*
