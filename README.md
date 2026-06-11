# Trading Terminal 🚀

Trading Terminal is a professional-grade live market terminal connected to Capital.com. Originally a local-first playback tool, it has evolved into a high-performance live execution platform for stock and forex trading.

## 🏗️ Architecture

- **Live Market Data**: Integrated with Capital.com's REST and WebSocket APIs for historical candles and real-time tick data.
- **Ephemeral Backend**: Uses a lightweight Hono proxy (deployed via GitHub Actions/Cloudflare Tunnel) to securely bridge the browser to Capital.com's trading APIs.
- **High-Performance Rendering**: Powered by `lightweight-charts` for fluid, sub-second price updates. Includes zero-flicker chart reuse and instant in-memory history caching for rapid symbol switching.
- **Zero-Friction Execution**: Optimized for speed with keyboard-driven trade execution and automated risk management.

## 🚀 Getting Started

### Prerequisites
- A Capital.com account (Demo or Live).
- An active Proxy URL from the GHA Tunnel (Launch Terminal).

### Running Locally
1. Install dependencies: `npm install`.
2. Run the dev server: `npm run dev`.
3. Click "Launch Terminal" and provide your ephemeral backend Proxy URL.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Lightweight Charts, Zustand, Ky.
- **Real-time**: WebSockets for live pricing and account sync.
- **Backend**: Hono (Node.js/Edge) acting as an authentication and API proxy.
- **Auth**: Dual-token (CST + X-SECURITY-TOKEN) session flow.

## 📄 License

MIT
