# Stack Research: Capital.com Live Trading

**Domain:** High-Performance Live Trading Terminal
**Researched:** 2025-06-03
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Vite** | 5.4.x | Build Tool | Industry standard for high-speed HMR and optimized React bundles. |
| **React** | 18.3.x | UI Framework | Stable concurrent rendering; essential for maintaining 60fps charts during heavy tick data. |
| **TanStack Query** | 5.101.x | Server State | Orchestrates the `CST`/`X-SECURITY-TOKEN` lifecycle, handles automatic retries on session expiry, and manages historical data caching. |
| **Zustand** | 5.0.x | Client State | Minimal overhead for high-frequency UI updates (e.g., current Bid/Ask price, active order markers). |
| **Ky** | 2.0.x | REST Client | Lightweight fetch-based client with built-in "Hooks" to inject session tokens into headers automatically before every request. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **react-use-websocket** | 4.13.x | WS Management | Essential for the direct connection to Capital.com's tick stream; handles reconnection and heartbeats out-of-the-box. |
| **Decimal.js** | 10.6.x | Precision Math | Mandatory for calculating `Shares * Price` and Stop Loss offsets to avoid floating-point rounding errors. |
| **Zod** | 4.4.x | Schema Validation | Validate raw API responses from Capital.com to ensure runtime type safety for order confirmations and tick data. |
| **lightweight-charts** | 5.2.x | Financial Charts | Optimized for high-frequency updates and minimal memory footprint; outperforms D3/Chart.js for trading. |
| **Hono** | 4.x | Backend Proxy | Used for the "Ephemeral Backend" to securely store API Secrets and handle the initial `/session` handshake. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Vitest + MSW** | Unit/Integration Testing | Mocking Capital.com API responses (REST/WS) is the only way to test trade logic without risking real capital. |
| **TypeScript** | 5.6+ | Type Safety | Use strict mode to catch "undefined" errors in complex financial data structures. |

## Installation

```bash
# Core Networking & State
npm install @tanstack/react-query ky zustand react-use-websocket

# Math & Validation
npm install decimal.js zod

# Visualization
npm install lightweight-charts

# Dev dependencies (Testing & Backend)
npm install -D vitest msw @testing-library/react
# For Backend Proxy (if Node-based)
npm install hono
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Ky** | Axios | Use only if you need very old browser support (pre-Fetch API) or complex interceptors that `fetch` cannot handle. |
| **react-use-websocket** | Native WebSocket | Use only for extremely minimal implementations where you don't mind writing your own heartbeat and reconnect logic. |
| **Zustand** | Redux Toolkit | Use if the project grows to dozens of developers and requires centralized middleware for complex logging. |
| **Hono** | Express | Use if you require legacy middleware that hasn't been ported to more modern, faster frameworks. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Native Number for Price** | `0.1 + 0.2 === 0.30000000000000004`. Precision errors lead to rejected orders or lost money. | **Decimal.js** |
| **Proxying Ticks via Backend** | Adds 50-150ms of latency. Ticks must be consumed directly by the client for trade accuracy. | **Direct WS Connection** |
| **API Secret in Frontend** | `.env` variables in React are visible to anyone. Your account can be drained. | **Secret Proxy (Backend)** |
| **Polled Price Updates** | Polling is too slow for "Zero-friction execution". | **WebSocket Stream** |

## Stack Patterns by Variant

**If using Vercel/Cloudflare (Serverless):**
- Use **Hono** as the backend proxy.
- Because it is optimized for Edge/Serverless environments and has zero dependencies.

**If using GitHub Actions (Ephemeral Bot):**
- Use **Node.js + Ky** for the scripts.
- Because Ky handles the authentication flow and retries more robustly for long-running batch jobs.

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `react@18.3.x` | `lightweight-charts@5.2.x` | Fully compatible. |
| `zustand@5.x` | `react@18.3.x` | Uses the new `useSyncExternalStore` for performance. |
| `tanstack-query@5.x` | `react@18.3.x` | Requires React 18+ for concurrent features. |

## Sources

- [Capital.com API Reference](https://capital.com/api-documentation) — Verified REST/WS authentication flow (CST/X-SECURITY-TOKEN).
- [Ky GitHub README](https://github.com/sindresorhus/ky) — Verified hook support for header injection.
- [Decimal.js Docs](https://mikemcl.github.io/decimal.js/) — Verified precision math requirements for financial apps.
- [React-use-websocket Docs](https://github.com/robtaussig/react-use-websocket) — Verified reconnection logic features.

---
*Stack research for: Capital.com Trading Terminal*
*Researched: 2025-06-03*
