# Phase 3: Order Execution Layer - Deep-Dive Discussion Log

**Date:** 2026-06-06
**Context:** Redoing the "broken" Phase 3 implementation with a focus on professional-grade speed and reliability.

## 1. Execution Architecture (Finalized)
- **Hybrid Flow:** Order placement uses **REST (POST)** for the command and **WebSocket** for high-speed fill confirmation.
- **Deal Lifecycle:**
  1. UI sends REST request.
  2. UI waits for `dealReference` (approx. 100ms) before updating state.
  3. UI displays a **PENDING** state once the `dealReference` is received.
  4. WebSocket confirmation transitions the order to an **ACTIVE POSITION** (using `dealId`).
- **Orchestration:** Implementation will use a **Zustand-Integrated Service Layer** (Manager pattern) to handle the async lifecycle and state updates.

## 2. Synchronization Strategy (Finalized)
- **Initial State:** Fetch the full position stream via REST on app load/login to establish a baseline.
- **Delta Updates:** Use WebSocket "Deltas" (Add/Remove/Update) for real-time changes during the session.
- **Safety Net (Watchdog):** A background timer (2 seconds) triggers a REST poll to `/confirms/{ref}` if the WebSocket confirmation is missed.
- **Manual Sync:** A "Refresh" button will be added to the Trade Log to force a full state re-sync if the user suspects a mismatch.

## 3. Risk & Sizing (Finalized)
- **Sizing:** Use **Shares** (Number of contracts) as the primary unit.
- **Stop Loss (SL):** Automated fixed SL is **Pre-flight**. The `stopLevel` must be calculated and included in the initial order payload sent to Capital.com.

## 4. Pending Questions (For Next Agent/Turn)
*User, please review these when you return:*

- **Slippage Handling:** Should the UI warn the user if the fill price deviates significantly (>0.1%) from the clicked price, or just update the log silently?
- **Flatten Button Scope:** Should the "Flatten" feature close only the *selected* position, or should there be a "Global Flatten" to close *all* open positions instantly?
- **Optimistic UI Nuance:** We confirmed waiting for the `dealReference` (~100ms). Should we add a subtle loading spinner on the BUY/SELL buttons during that brief window?

## 5. Instructions for Future Agent
Downstream agents (researcher, planner) must use this log to override any "vague" requirements in the original ROADMAP or existing "broken" code. The priority is **Reliability first, Speed second**. Do not use "purely optimistic" UI that hides the `dealReference` tracking.
