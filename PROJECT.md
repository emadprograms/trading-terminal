# Trading Terminal

## Vision
A lightning-fast, highly robust, and aesthetically pleasing trading terminal built specifically for Capital.com. The primary focus is minimizing latency in two critical areas: chart switching (via data pre-fetching and WebSocket/REST stitching) and order placement (by streamlining the proxy and removing middlemen). The user experience should feel premium, responsive, and completely reliable.

## Core Features
- **Ultra-Fast Chart Switching:** Seamlessly switch between markets with zero lag by pre-fetching tick data and dynamically stitching REST API history with real-time WebSocket streams.
- **Direct Order Placement:** Low-latency trade execution via minimal Vercel Serverless Functions proxying to Capital.com, handling CORS and credential injection without adding unnecessary overhead.
- **Robust Local State:** High-performance, play-by-play market data caching using a Web Worker-based SQLite (sql.js) database to prevent main thread blocking.
- **Premium Aesthetics:** A sleek, modern, and highly polished user interface with fluid micro-animations and exact interaction states.

## Current Milestone: v1.1 Orders Audit & Hardening

**Goal:** Rigorously audit, harden, and comprehensively test the entire order placement and lifecycle logic to ensure bulletproof execution and discover/fix hidden bugs (including unknown edge cases like event duplication across multiple charts).

**Target features:**
- **Comprehensive Code & Event Audit:** Deep dive into the codebase to find undiscovered bugs, race conditions, event listener duplications, and state mismanagement in order execution.
- **Double Alt Fix:** Fix the known `flattenHalfSymbol` bug caused by summing unfiltered historical pending orders (`FLATTEN_HALF_DIAGNOSIS.md`).
- **Double/Ghost Orders & Stuck Limit Orders Fix:** Identify and resolve root causes of known issues (double orders, ghost orders, non-cancellable limit orders).
- **Rigorous Order Testing Suite:** Implement a comprehensive, edge-case-heavy test suite designed to stress-test the entire order lifecycle under extreme conditions.

## Future Milestones
- Advanced Order Types & Strategies
- Portfolio Analytics & Performance History
- Real-time Alerting System

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

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state
