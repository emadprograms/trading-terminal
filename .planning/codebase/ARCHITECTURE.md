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

## Data Flow
1. **User Action:** User requests a chart switch or places an order.
2. **Frontend Request:** React app sends an HTTP request to `/api/[endpoint]`.
3. **Serverless Proxy:** Vercel function catches the request, attaches the private Capital.com API key, and forwards it via `undici`.
4. **Response:** Response is streamed back to the frontend.
5. **Real-time:** WebSockets are established (either directly or via proxy) to stream live ticks, which are then stitched with historical REST data in the frontend/worker.
