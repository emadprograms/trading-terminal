# Phase 2: Lightweight Charts Visual Alerts - Context

**Gathered:** 2026-08-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Visually plot active alerts for the current asset on the chart. Read active alerts from `useAlertStore`, draw horizontal price lines on the Lightweight Chart for each active alert, and ensure lines update/remove when alerts trigger or are deleted.

</domain>

<decisions>
## Implementation Decisions

### Area 1: Visual Styling of Alert Lines
- Line style: Solid colored line
- Line color: Match the application's warning/alert theme color
- Label placement: Right y-axis label

### Area 2: Interaction with Lines
- Are lines draggable? No, display only for now to keep it simple (manage via AlertsPanel).
- Are lines clickable? No, keep it display-only.

### the agent's Discretion
- Best approach for integrating with Lightweight Charts `PriceLine` API.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/store/useAlertStore.ts` - For reading active alerts
- `src/components/ChartCanvas.tsx` - Where the chart instance is initialized and managed

### Established Patterns
- Zustand state management
- Lightweight Charts API for adding `PriceLine` to series

### Integration Points
- `ChartCanvas.tsx` needs to subscribe to `useAlertStore` for the current asset and add/remove `PriceLine` instances on the main series.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
