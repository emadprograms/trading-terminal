# Integrations

**Mapped:** 2026-06-13
**Scope:** Full codebase

## Capital.com API
The entire terminal is tightly coupled to Capital.com's infrastructure.

### REST API
- **Proxy Endpoints:** The Vercel functions in `api/` act as a transparent proxy.
- **Authentication:** The frontend holds session tokens (`CST`, `X-SECURITY-TOKEN`), while the Vercel proxy securely injects the API Key (`X-CAP-API-KEY`) before forwarding to Capital.com.
- **Environments:** Dynamically switches between `https://demo-api-capital.backend-capital.com` and the live URL based on the `X-Environment` header sent by the client.

### WebSockets
- Used for real-time market data streaming.
- Stitched together with historical REST API data to provide seamless, zero-lag chart rendering and order book updates.

## WebAssembly SQLite (sql.js)
- Used entirely on the client side for high-performance data caching.
- The `.wasm` binary is served from the `public/` directory and loaded into a Web Worker.
