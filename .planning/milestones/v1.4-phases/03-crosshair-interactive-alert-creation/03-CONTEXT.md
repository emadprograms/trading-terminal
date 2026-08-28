# Phase 3: Crosshair Interactive Alert Creation - Context

**Gathered:** 2026-08-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement the plus button on the Y-axis when the user hovers/moves the crosshair. Track crosshair position (price level), render a clickable plus (+) symbol on the Y-axis, and connect it to the alert creation UI.

</domain>

<decisions>
## Implementation Decisions

### Area 1: Hover and Interaction
- Visibility trigger: Show plus button only when mouse is over the chart area.
- Click action: Pre-fill the alert creation sidebar with the specific price level and open the panel.

### Area 2: Positioning and Styling
- Styling: Small circular button with a plus icon, matching the UI theme.
- Positioning technique: Use a DOM overlay positioned absolutely over the chart container, synced with the lightweight-charts crosshair API `subscribeCrosshairMove`.

### the agent's Discretion
- Best integration of the lightweight charts crosshair coordinate API to place the DOM element accurately.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ChartCanvas.tsx` - Has access to chart instance.
- `src/components/AlertsPanel.tsx` - Needed to open/pre-fill alerts.
- Zustand store (`useAlertStore.ts`) - Action to open panel with prefilled price.

### Established Patterns
- DOM overlays on top of the canvas for UI elements that lightweight-charts doesn't natively support.

### Integration Points
- `ChartCanvas.tsx` to add `subscribeCrosshairMove`.
- Global state or context to pass price to `AlertsPanel`.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None

</deferred>
