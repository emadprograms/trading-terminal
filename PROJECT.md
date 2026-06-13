# Trading Terminal

## Vision
A lightning-fast, highly robust, and aesthetically pleasing trading terminal built specifically for Capital.com. The primary focus is minimizing latency in two critical areas: chart switching (via data pre-fetching and WebSocket/REST stitching) and order placement (by streamlining the proxy and removing middlemen). The user experience should feel premium, responsive, and completely reliable.

## Core Features
- **Ultra-Fast Chart Switching:** Seamlessly switch between markets with zero lag by pre-fetching tick data and dynamically stitching REST API history with real-time WebSocket streams.
- **Direct Order Placement:** Low-latency trade execution via minimal Vercel Serverless Functions proxying to Capital.com, handling CORS and credential injection without adding unnecessary overhead.
- **Robust Local State:** High-performance, play-by-play market data caching using a Web Worker-based SQLite (sql.js) database to prevent main thread blocking.
- **Premium Aesthetics:** A sleek, modern, and highly polished user interface with fluid micro-animations and exact interaction states.

## Current Milestone: Hardening & Polishing
The core functionality is built. This milestone focuses on taking the app from "working" to "production-grade robust and beautiful."
1. **Backend Audit & Hardening:** Review the Vercel Serverless proxy (`api/`) for fragility, security vulnerabilities, and stability issues.
2. **Critical Path Testing:** Implement integration and automated tests focusing heavily on order placement, data fetching, and state integrity.
3. **UI Bug Fixes:** Resolve specific broken interactions, notably the entry price indicator on chart hover (the triangle should display a clean arrow without dashes pointing to the price).
4. **General Aesthetic Polish:** Review and refine the overall UI/UX, ensuring smooth hover states, modern typography, and a polished dark-mode aesthetic.

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
