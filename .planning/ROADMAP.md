# Project Roadmap

## Phase 1: Backend Proxy Hardening & Syncing

**Requirements:** PROXY-01, PROXY-02, PROXY-03
**Focus:** Establish a robust, resilient backend proxy foundation to handle order execution and synchronization reliably.

**Success Criteria:**

- **Robust Order Execution:** Users can reliably place orders through the Vercel proxy, with strict input validation via Zod preventing malformed requests.
- **Accurate Syncing:** The user's order history, active orders, and prices are accurately synchronized with Capital.com without data misinterpretation.
- **Graceful Error Handling:** When Capital.com returns errors (e.g., rate limits or invalid tokens), the UI receives clean error messages and remains fully responsive without crashing.

## Phase 2: Data Integrity & E2E Testing

**Requirements:** TEST-01, TEST-02
**Status:** COMPLETED
**Focus:** Implement a comprehensive Playwright testing suite to guarantee state integrity and prevent regressions on the critical path.

**Success Criteria:**

- **Automated Critical Path:** E2E tests successfully simulate the user journey of placing an order, switching charts, and viewing order history without latency regressions.
- **Verified Data Stitching:** Tests consistently validate that historical REST data and live WebSocket ticks stitch together accurately without gaps or overlaps.
- **Reliable CI Foundation:** The Playwright suite runs reliably (non-flaky) against the real proxy and UI integrations.

## Phase 3: UI Polishing & Bug Fixes

**Requirements:** UI-01
**Status:** COMPLETED
**Focus:** Deliver a premium, bug-free user interface with accurate visual cues and smooth micro-animations.

**Success Criteria:**

- **Accurate Entry Price Indicator:** When the user hovers over the historical order triangle on the chart, an arrow (instead of a dash) immediately displays the exact correct entry price.
- **Fluid Interactions:** UI elements, including entry indicators and order interactions, feel instantaneous and premium without main-thread blocking.
