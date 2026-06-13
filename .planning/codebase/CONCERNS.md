# Concerns

**Mapped:** 2026-06-13
**Scope:** Full codebase

## Technical Debt & Confusion
- **Legacy Server Directory:** The `server/` directory containing the Hono proxy setup is still present in the repository, but the production architecture uses Vercel Serverless Functions (`api/`). This creates massive confusion for agents and developers. The `server/` directory should be removed or explicitly deprecated.

## UI/UX Bugs
- **Entry Indicator:** The user reported that hovering over the entry triangle on charts is broken (it shows an arrow with a dash instead of just the arrow pointing to the price). This requires immediate fixing during the polishing phase.
- **General Polish:** Several UI elements lack the required "premium" feel and need aesthetic polishing.

## Fragility & Risk Areas
- **Backend Proxy (Vercel):** The `api/_utils.ts` proxy is the critical bottleneck for all orders and market data. It currently lacks comprehensive error handling and testing for edge cases like Capital.com rate limits, timeouts, or partial failures.
- **Data Stitching:** The logic that stitches pre-fetched REST data with live WebSocket streams for chart switching is complex and performance-sensitive. Any regressions here will directly impact the core value proposition of the terminal (speed).
