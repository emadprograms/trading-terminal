# Trading Terminal 🚀

Trading Terminal is a professional-grade, lightning-fast live market terminal connected directly to Capital.com. It is designed for maximum speed, utilizing advanced data caching and a serverless proxy architecture to provide sub-second trade execution and chart switching.

## 🏗️ Architecture

- **Vercel Serverless Proxy:** Replaces legacy middleware (like Hono/Cloudflare Tunnels) with highly optimized Vercel Serverless functions (`api/`). Requests are proxied via `undici` to securely inject Capital.com API credentials without exposing them to the client.
- **In-Memory Caching Engine:** The `syncCoordinator` manages thousands of historical candles and real-time ticks entirely in-memory using an optimized `Map` to ensure zero-lag switching, keeping the main React thread free without the overhead of database transactions. (SQLite WASM is still available but restricted to static backtesting playback).
- **Intelligent Data Stitching:** Automatically prepends historical REST data via infinite scroll, stitches it with live WebSocket streams, and features a custom resampling engine to generate accurate 1D (Daily) candles strictly for Regular Trading Hours (RTH) using 30-minute intraday data.
- **High-Performance Rendering:** Powered by `lightweight-charts` for fluid price updates, zero-flicker chart reuse, and immediate rendering upon symbol switching.
- **Visual FIFO Netting Engine:** An instantaneous UI-layer netting engine intercepting optimistic counter-orders. It mathematically nets opposing positions in-memory to prevent visual UI flicker and psychological ghost positions while the broker backend executes the actual cleanup.

## ⚡ Keyboard Shortcuts & Execution

The terminal is heavily optimized for keyboard-driven execution to ensure traders never miss an entry.

### Order Placement
- **`Alt + Q`**: Buy (Full Size)
- **`Alt + W`**: Buy (Half Size)
- **`Alt + A`**: Sell (Full Size)
- **`Alt + S`**: Sell (Half Size)

### Position Management
- **`Double Ctrl` (Tap twice)**: Flatten Symbol (Close all positions for the active ticker)
- **`Double Shift` (Tap twice)**: Scratch Closest (Close the single position closest to the current market price)
- **`Double Alt` (Tap twice)**: Flatten Half (Dynamically scale out 50% of your position. Features **Smart Fractional Halving** that automatically matches the original order's step size constraints and safely falls back to a full close if the halved size violates the broker's minimum limits).

### Chart & Navigation
- **`Type Letters`**: Instantly switch ticker (e.g., type "AAPL")
- **`Type Numbers`**: Instantly change timeframe (e.g., type "15" for 15m)
- **`Space` / `Shift + Space`**: Navigate forward/backward through your Watchlist
- **`Alt + J`**: Toggle Ray drawing tool
- **`Alt + Shift + R`**: Toggle Rectangle drawing tool
- **`Alt + Shift + E`**: Toggle Extended Trading Hours (ETH) visibility
- **`Backspace` / `Delete`**: Clear all drawings on the current chart
- **`Escape`**: Cancel drawing / Cancel keyboard input

## 🚀 Getting Started

### Prerequisites
- A Capital.com account (Demo or Live).
- Environment variables configured in `.env.local`:
  - `CAPITAL_API_KEY_DEMO`
  - `CAPITAL_API_KEY_LIVE`

### Running Locally
1. Install dependencies: `npm install`.
2. Run the Vercel local dev server: `vercel dev` (or `npm run dev` depending on setup).
3. The frontend will proxy `/api/*` requests to the local serverless functions automatically.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Lightweight Charts, Zustand (State), React Query.
- **Backend Proxy**: Vercel Serverless Functions (`api/`), Undici.
- **Data/Cache**: In-Memory `Map` via `syncCoordinator` (Live), Web Worker + `sql.js` (Static Playback).
- **Real-time**: WebSockets for live pricing and account synchronization.

## 📄 License

MIT
