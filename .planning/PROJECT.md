# Trading Terminal

## Vision
A lightning-fast, highly robust, and aesthetically pleasing trading terminal built specifically for Capital.com. The primary focus is minimizing latency in two critical areas: chart switching (via data pre-fetching and WebSocket/REST stitching) and order placement (by streamlining the proxy and removing middlemen). The user experience should feel premium, responsive, and completely reliable.

## Core Features
- **Ultra-Fast Chart Switching:** Seamlessly switch between markets with zero lag by pre-fetching tick data and dynamically stitching REST API history with real-time WebSocket streams.
- **Direct Order Placement:** Low-latency trade execution via minimal Vercel Serverless Functions proxying to Capital.com, handling CORS and credential injection without adding unnecessary overhead.
- **Robust Local State:** High-performance, play-by-play market data caching using a Web Worker-based SQLite (sql.js) database to prevent main thread blocking.
- **Premium Aesthetics:** A sleek, modern, and highly polished user interface with fluid micro-animations and exact interaction states.
- **Real-Time Alerting:** Asset-specific price alerts that evaluate live WebSocket ticks and notify the user visually (toast) and audibly (Web Audio API beep).

## Current State

Shipped v1.3 Real-Time Alerting System.
- **Alert Engine:** Zustand-backed `useAlertStore` evaluates live WebSocket price ticks per-epic and triggers alerts when conditions are met.
- **Alert UI:** `AlertsPanel` in the sidebar for creating/managing alerts, uses the active workspace's current price as the baseline.
- **Notification System:** `AlertToast` shows a visual toast and plays a Web Audio API beep on alert trigger.
- **Full E2E Coverage:** Playwright tests verify the complete lifecycle from alert creation → WebSocket tick → toast notification, with no mock bypasses.
- **Strict TDD Methodology:** The entire milestone was built test-first — E2E benchmark → unit tests → implementation → E2E validation.

## Requirements

### Validated
- ✓ Ultra-fast chart switching — v1.0
- ✓ Direct order placement — v1.1
- ✓ Order history & trade netting engine — v1.2
- ✓ Chart sync with trade entries/exits — v1.2
- ✓ Real-time price alert engine (per-asset) — v1.3
- ✓ Alert creation UI in sidebar — v1.3
- ✓ Toast + audio notification on alert trigger — v1.3
- ✓ E2E TDD test coverage for alert lifecycle — v1.3

### Active (Next Milestone)
- [ ] Multiple watchlist selection dropdown
- [ ] Stock order qty validation using Capital.com dealing rules
- [ ] 1-minute chart sparse data tolerance (graceful handling of 0-volume minutes)

### Out of Scope
- Mobile app — web-first approach
- Backend alert processing — client-side via WebSockets saves latency/cost
- SMS/Email delivery — future milestone

## Future Milestones
- Advanced Order Types & Strategies (limit orders, stop-loss, take-profit)
- Portfolio Analytics & Performance History
- Watchlist multi-select & dealing rules validation

## Technical Constraints & Stack
- **Frontend:** React (Vite), Zustand (State), TailwindCSS (assumed, or Vanilla CSS), Lightweight Charts.
- **Backend Proxy:** Vercel Serverless Functions (`api/`) for secure credential injection and CORS management.
- **Data Persistence:** Web Worker SQLite (`sql.js`) for intensive data crunching off the main thread.
- **APIs:** Capital.com REST API & WebSocket streams.
- **Testing:** Playwright (E2E), Vitest (Unit/Integration).

## User Profiles
- **High-Frequency/Day Trader:** Requires absolute minimum latency. Will notice a few milliseconds of lag in order execution or chart rendering. Values reliability, clear visual cues for entry/exit, and a non-distracting UI.

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-18 after v1.3 milestone*
