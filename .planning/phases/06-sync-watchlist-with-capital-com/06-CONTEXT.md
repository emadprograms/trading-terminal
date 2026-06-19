# Phase 6: Sync watchlist with capital.com - Context

**Gathered:** 2026-06-19T12:44:03+03:00
**Status:** Ready for planning

<domain>
## Phase Boundary

Synchronizing user watchlists between the local trading terminal and the Capital.com API.
</domain>

<decisions>
## Implementation Decisions

### Sync Direction & Truth Source
- **D-01:** Two-way manual sync: A "Sync" button will be available at the top of the UI. When clicked, it will pull the latest watchlist from Capital.com and push any local additions to Capital.com, so both perfectly match.

### Conflict Handling
- **D-02:** Override local on startup: On terminal startup, Capital.com is treated as the master state. Any local symbols not present there are wiped to match the server state.

### Data Fetching Frequency
- **D-03:** Manual sync via button: Updates while the terminal is open are triggered manually via the "Sync" button. There is no real-time websocket subscription or background polling for external watchlist changes.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Existing API proxy structure in `api/` can be reused to create the new Capital.com watchlist endpoints securely.

### Established Patterns
- UI interactions should remain snappy and proxy through Vercel serverless functions with credential injection.

### Integration Points
- Frontend Watchlist UI component (placement of the "Sync" button).
- Capital.com REST API endpoints for Watchlists (needs mapping to fetch/add symbols).
- Vercel Serverless proxy handlers (new endpoints needed for watchlist sync).

</code_context>

<specifics>
## Specific Ideas

- **Sync Button Placement:** The "Sync" button should be placed at the top of the watchlist sidebar. Specifically, when the user opens the watchlist, there is a header that says "Watchlist"; the sync button should be located on the right side of this header.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 6-sync-watchlist-with-capital-com*
*Context gathered: 2026-06-19T12:44:03+03:00*
