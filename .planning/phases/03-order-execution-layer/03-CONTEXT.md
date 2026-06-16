# Context: Phase 03 — Order Execution Layer
**Date:** 2026-06-06

## Domain
This phase delivers the core **Live Execution Layer**, transitioning the terminal from a read-only viewer to a functional trading platform. It handles the lifecycle of Market and Limit orders, synchronized via a hybrid REST and WebSocket architecture.

## Decisions

### 1. Execution Architecture
- **Hybrid Flow**: Use **REST (POST)** for order placement commands and **WebSocket** for high-speed fill confirmation.
- **Lifecycle**:
  1. UI sends REST request to `/positions` or `/workingorders`.
  2. UI receives `dealReference` (approx. 100ms) and enters **PENDING** state.
  3. WebSocket "quote" or "confirmation" message transitions the order to an **ACTIVE POSITION** using the `dealId`.
- **Reliability**: A 2-second "Watchdog" timer will poll `/confirms/{ref}` if the WebSocket confirmation is missed.

### 2. Risk & Sizing
- **Unit**: All trades use **Shares** (Number of contracts/contracts).
- **Automated Stop Loss (SL)**: Calculated **Pre-flight**. The `stopLevel` must be included in the initial order payload based on the user's "Fixed SL Distance" setting.
- **Guaranteed Stops**: Use Capital.com's "Guaranteed Stop" feature where available to ensure absolute loss protection.

### 3. UI & Interaction
- **Optimistic Feedback**: Show a loading spinner on the Buy/Sell buttons immediately upon click to prevent double-execution and provide instant feedback.
- **Slippage Transparency**: The trade log/UI must explicitly alert the user if the actual fill price deviates more than a baseline (e.g., >0.05%) from the price at the time of execution.
- **Slippage Protection**: Implement a hidden safety cap (0.5%). Orders should be rejected/canceled if the market moves beyond this threshold before the order hits the exchange.

### 4. Flattening (Exits)
- **Scope**: Initial implementation focuses on **Single-Position Flattening**.
- **Expansion**: Global **Flatten All** and **Cancel All** have been implemented with 100ms throttling to ensure account-wide safety and rate-limit compliance.

## Canonical Refs
- `.planning/research/CAPITAL_API_REFERENCE.md` — Mandatory for request/response schemas and field names (e.g., `ask` vs `ofr`).
- `.planning/REQUIREMENTS.md` — EXEC-01, EXEC-02, and EXEC-03 definitions.

## Code Context
- `src/api/trade.ts` — Base API client for order placement.
- `src/store/useTradeStore.ts` — Zustand store for managing pending orders and active positions.
- `src/api/client.ts` — Configuration for `ky` with `baseUrl` fix.
