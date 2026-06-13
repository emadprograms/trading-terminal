# Phase 1: Backend Proxy Hardening & Syncing - Context

**Gathered:** 2026-06-13
**Status:** Ready for planning

## Phase Boundary

Establish a robust, resilient backend proxy foundation to handle order execution and synchronization reliably.

## Implementation Decisions

### Order State Sync Mechanism
- **D-01:** Place orders via the REST API.
- **D-02:** Listen for live confirmations, fills, and rejections via the Capital.com WebSocket connection. Do not aggressively poll the REST API for order state.

### Validation Error UX
- **D-03:** Display clear, detailed error messages explaining exactly why an order failed or was rejected.
- **D-04:** For Capital.com rejections (e.g., market closed, invalid stop loss), pass the exact rejection reason to the UI so the user always knows why it failed.
- **D-05:** For Vercel proxy side failures (e.g., Zod validation errors), clearly inform the user that it failed on the proxy side.

### Rate Limiting / Retry Strategy
- **D-06:** For chart prices and market data: implement automatic retries (e.g., up to 3 attempts). Instead of toasts, display network status via the existing 'Online' button in AccountHeader.
- **D-07:** For order placement: NEVER automatically retry. Fail immediately back to the client, providing the exact error so the user can manually decide their next action (since price may have moved).

### the agent's Discretion
None

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Roadmap
- `.planning/ROADMAP.md` — Defines phase goal and requirements (PROXY-01, PROXY-02, PROXY-03).
- `.planning/REQUIREMENTS.md` — Further context on proxy requirements.

### Architecture & Integrations
- `.planning/codebase/ARCHITECTURE.md` — System design and proxy layer implementation strategy.
- `.planning/codebase/INTEGRATIONS.md` — Capital.com REST and WebSocket integration details.

## Existing Code Insights

### Reusable Assets
- Vercel Serverless Functions (`api/`): The existing proxy layer where Zod validation will be enforced.
- WebSocket Manager: Existing logic that will be extended to listen for live order updates.

### Established Patterns
- Zustand & React Query: Established for state management; UI will update based on WebSocket events reflecting in these stores.

### Integration Points
- Frontend order forms will connect to the hardened proxy endpoints and surface the detailed errors implemented in this phase.

## Specific Ideas

- "I always wish to know why an order was rejected."
- "If order fails then never retry. Just inform the user of the error and he will try again, it is entirely possible that the order has now moved away from the ideal price."

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 1-Backend Proxy Hardening & Syncing*
*Context gathered: 2026-06-13*
