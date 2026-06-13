# Phase 3: UI Polishing & Bug Fixes - Context

**Gathered:** 2026-06-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a premium, bug-free user interface with accurate visual cues and smooth micro-animations, specifically focusing on the historical order triangle hover behavior on the chart.
</domain>

<decisions>
## Implementation Decisions

### Hover Arrow Entry Price Behavior (Bug Fix)
- **D-01:** Treat the incorrect entry price on hover strictly as a bug. The current behavior shows the wrong price (e.g., 203 when it should be near 205). The fix must focus on debugging the data source or coordinate mapping.
- **D-02:** Do not add new features or change the existing animation (the current animation is acceptable).
- **D-03:** Maintain the current price formatting (the current format is acceptable).

### the agent's Discretion
None. Focus purely on diagnosing and fixing the hover price accuracy.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Roadmap
- `.planning/ROADMAP.md` — Defines phase goal and requirements (UI-01).
- `.planning/REQUIREMENTS.md` — Further context on UI requirements.

### Architecture & Integrations
- `.planning/codebase/STRUCTURE.md` — Code layout, specifically `src/components/` for charts and UI.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- The existing chart components and tooltip/hover logic in `src/components/` will be the primary areas to investigate and fix.
- Existing price formatting utilities should be reused as the user explicitly approved of the current formatting.

### Established Patterns
- The application relies on correct mapping of historical order REST data and live WebSocket ticks (as validated in Phase 2). The bug may lie in how this state is passed to or rendered by the UI component.

### Integration Points
- Chart order markers (triangles) and their associated tooltips/arrows.

</code_context>

<specifics>
## Specific Ideas

- "The only thing that I'm strugglilng with the price at which the arrow pops up when I hover. The price it hovers at is nowhere near the candle. The stock is trading near 205, the hovering arrow is 203? How can I enter at 203 when aapl is trading at 205, so it is either fetching a wrong or something like that. Treat this more like a bug that needs to be debugged, rather any additional feature that I want added."

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed strictly within the phase scope of fixing the bug.

</deferred>

---

*Phase: 3-UI Polishing & Bug Fixes*
*Context gathered: 2026-06-13*
