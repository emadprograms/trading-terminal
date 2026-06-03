# Project Research Summary

**Project:** Capital.com Trading Terminal
**Domain:** High-Performance Live Trading Terminal
**Researched:** 2025-06-03
**Confidence:** HIGH

## Executive Summary

The Capital.com Trading Terminal is a professional-grade execution layer designed for "zero-friction" trading. It prioritizes speed, risk management, and reliability over analytical complexity. Experts build such systems by decoupling visualization from execution, ensuring high-frequency data streams (WebSockets) are consumed directly by the client while sensitive operations (Authentication/Orders) are proxied through a secure, ephemeral backend to protect API credentials.

The recommended approach utilizes a modern React/Vite stack optimized for 60fps performance, leveraging `lightweight-charts` for visualization and `Zustand` for low-overhead state management. A critical architectural decision is the use of an "Ephemeral Backend" (GHA/Hono) to act as a secret proxy, keeping Capital.com API keys out of the client-side bundle while maintaining a serverless, user-owned infrastructure model.

The primary risks include silent session expiration (10-minute timeout), rate-limiting on order execution (100ms throttle), and precision errors in financial math. These are mitigated through automated heartbeats, client-side debouncing, and the mandatory use of `Decimal.js` for all price and size calculations.

## Key Findings

### Recommended Stack

The stack is focused on high-performance rendering and robust networking to handle the volatility of live trading environments.

**Core technologies:**
- **Vite + React 18**: Build and UI framework — essential for concurrent rendering to keep charts smooth during heavy data bursts.
- **TanStack Query + Ky**: Server state and REST — manages the complex `CST`/`X-SECURITY-TOKEN` lifecycle and automatic retries.
- **Zustand**: Client state — provides the minimal overhead needed for high-frequency bid/ask price updates.
- **lightweight-charts**: Visualization — industry standard for financial charting with minimal memory footprint.
- **Hono**: Backend Proxy — lightweight, edge-optimized framework for the Ephemeral Backend secret proxy.

### Expected Features

The feature set prioritizes the "Execution Layer" over general-purpose charting.

**Must have (table stakes):**
- **Real-time Bid/Ask Stream** — Users expect exact executable prices, not mid-prices.
- **Market/Limit Execution** — Reliable order placement with state tracking (Accepted/Rejected).
- **Position Management** — Instant P&L visibility and "One-Click" close capability.

**Should have (competitive):**
- **Keyboard Shortcut Execution** — The core differentiator (e.g., `Ctrl+1` for full-size entry).
- **Automated Fixed Stop-Loss** — Programmatic risk protection attached immediately to every entry.
- **Visual Trade Markers** — Immediate feedback on chart where orders were filled.

**Defer (v2+):**
- **Take Profit (TP) Orders** — Scalpers often exit manually; TP adds complexity best handled after core stability.
- **Complex Indicators** — Avoid "analysis paralysis" and performance degradation in the MVP.

### Architecture Approach

The architecture follows a "Direct-Stream" pattern where auth/orders are proxied, but high-frequency ticks flow directly to the client.

**Major components:**
1. **Frontend (React)** — Handles 60fps charting and keyboard shortcut orchestration.
2. **Ephemeral Backend (Hono)** — Securely stores API keys and performs the initial session handshake.
3. **Trading Hooks (useTradeManager)** — Decouples order logic and rate-limiting from the UI components.

### Critical Pitfalls

1. **Silent Session Expiration** — Capital.com tokens expire every 10 mins; requires a background heartbeat/ping.
2. **Stale Price Race Conditions** — Market moves during request latency; requires slippage tolerance or market orders for "panic" exits.
3. **Shortcut Spamming** — User hammers keys; requires client-side debouncing to respect the 1-req/0.1s API rate limit.
4. **Lot Size Confusion** — "Shares" vs "Units" varies by asset; requires normalization using market `scalingFactor`.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Secure Foundation & Auth
**Rationale:** No trading or data access is possible without the `CST` token exchange; this is the highest technical risk.
**Delivers:** Ephemeral Backend proxy and successful "Live/Demo" session handshake.
**Addresses:** Demo/Live Environment Toggle.
**Avoids:** Hardcoded API Secrets in Frontend.

### Phase 2: Live Market Data Engine
**Rationale:** High-frequency ticks are needed before execution can be tested or visualized.
**Delivers:** WebSocket integration, direct-stream tick consumption, and historical candle fetching.
**Uses:** `react-use-websocket` and `lightweight-charts`.
**Implements:** Direct-Stream pattern (Architecture).

### Phase 3: The Executioner (MVP)
**Rationale:** Core value proposition. Requires the auth and data layers to be stable.
**Delivers:** Market order placement, automated Stop-Loss attachment, and position closing.
**Addresses:** Market Execution and Automated SL features.
**Avoids:** Rate-limit violations via client-side debouncing.

### Phase 4: Zero-Friction UI
**Rationale:** Optimizes the "Executioner" for professional use once the engine is proven.
**Delivers:** Keyboard shortcuts, visual trade markers, and spread visualization.
**Addresses:** Keyboard Shortcut Execution and Visual Trade Markers.

### Phase Ordering Rationale

- **Dependency-Driven**: Auth must precede Data, and Data must precede Execution.
- **Risk-First**: The Ephemeral Backend (Phase 1) is the most "different" part of the stack compared to standard React apps.
- **Stability-First**: Real-time tick handling (Phase 2) must be performant before adding the overhead of trade execution logic (Phase 3).

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Execution):** Needs specific research into Capital.com `stopLevel` (minimum SL distance) and `scalingFactor` per asset class to ensure orders aren't rejected.
- **Phase 1 (Auth):** Needs validation of GHA (GitHub Actions) as a viable hosting platform for the Ephemeral Backend (CORS/latency).

Phases with standard patterns (skip research-phase):
- **Phase 2 (Ticks):** Standard `lightweight-charts` and `react-use-websocket` patterns are well-documented.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Industry standards for trading; well-vetted libraries. |
| Features | HIGH | Based on Capital.com API capabilities and standard terminal needs. |
| Architecture | HIGH | Proven "Direct-Stream" pattern for low-latency trading. |
| Pitfalls | HIGH | Specifically mapped from Capital.com's public API constraints. |

**Overall confidence:** HIGH

### Gaps to Address

- **GHA Latency**: Implementation must verify if GitHub Actions "Always-on" or "Wait-for" triggers are fast enough for the secret proxy.
- **Slippage Support**: Research if Capital.com API supports a `maxSlippage` parameter on market orders for v1.

## Sources

### Primary (HIGH confidence)
- [Capital.com API Reference](https://capital.com/api-documentation) — Verified REST/WS authentication and rate limits.
- [lightweight-charts Docs](https://tradingview.github.io/lightweight-charts/) — Performance benchmarks for high-frequency updates.

### Secondary (MEDIUM confidence)
- [Capital.com Community (Reddit)](https://www.reddit.com/r/CapitalCom/) — Common pain points (timeouts/rejections).

---
*Research completed: 2025-06-03*
*Ready for roadmap: yes*
