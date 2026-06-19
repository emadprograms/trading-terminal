# Phase 06 Research: Sync watchlist with capital.com

## What do I need to know to PLAN this phase well?

To effectively plan Phase 06, we need to structure the implementation around the core decisions from `06-CONTEXT.md` while adhering to the project patterns established in `STATE.md` and `REQUIREMENTS.md`.

### 1. Architectural & Behavioral Requirements
- **Master State on Startup (D-02):** Upon terminal startup, the Capital.com API is the absolute source of truth. Any symbols present in the local state but not on Capital.com must be wiped.
- **Manual Two-Way Sync (D-01 & D-03):** There is no polling or WebSocket subscription for watchlists. Syncing only happens when the user clicks a "Sync" button.
- **Sync Logic:** When clicked, it pulls the latest from Capital.com, pushes any local additions to Capital.com, and perfectly matches both states.

### 2. UI/UX Specifics
- **Button Placement:** A "Sync" button must be added to the Watchlist sidebar. Specifically, it should be placed on the right side of the "Watchlist" header.

### 3. Backend & Integration Points
- **API Proxy Structure:** We must reuse the existing Vercel Serverless proxy structure within the `api/` directory.
- **Capital.com API Mapping:** We need to implement new proxy handlers to interact with Capital.com's Watchlist REST API endpoints (for fetching the watchlist and adding symbols to it). 
- **Security:** Ensure credential injection follows established patterns in the existing proxy handlers.

### 4. Planning Breakdown (Recommended Plan Steps)
Based on the context, the planning should be broken down into the following logical plans:

- **Plan 1: API Proxy Implementation**
  - Identify the exact Capital.com REST API endpoints for Watchlists.
  - Create Vercel Serverless functions (e.g., `api/watchlist/get`, `api/watchlist/update`) to proxy these requests with credential injection.
- **Plan 2: Frontend Sync Logic & Startup Handling**
  - Implement the startup logic to fetch the Capital.com watchlist and override the local state.
  - Implement the "Manual Sync" logic (fetch remote -> diff with local -> push local additions -> update local state).
- **Plan 3: UI Implementation**
  - Update the Watchlist UI component to include the "Sync" button on the right side of the "Watchlist" header.
  - Hook up the button to the sync logic.
  - Add appropriate loading/success/error states for the UI during sync.
- **Plan 4: Testing & Verification**
  - Add/update tests to ensure the proxy behaves securely.
  - Add Playwright E2E tests for the watchlist sync flow, adhering to the project's pattern of testing against the live environment.

### 5. Contextual Project Constraints
- **Testing:** Based on `REQUIREMENTS.md`, we should avoid "Over-Mocked Tests" and test the real integrations via the proxy.
- **Aesthetics:** Premium Aesthetic Polish is currently deferred in favor of functional correctness, but micro-animations are noted as future requirements. The button should look good but prioritize functionality.
