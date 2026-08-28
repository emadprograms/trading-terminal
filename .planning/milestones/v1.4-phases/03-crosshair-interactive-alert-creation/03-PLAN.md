---
wave: 2
depends_on:
  - 01-chart-alerts-e2e-benchmark-tdd
  - 02-lightweight-charts-visual-alerts
files_modified:
  - "src/store/useAlertStore.ts"
  - "src/components/Sidebar.tsx"
  - "src/components/AlertsPanel.tsx"
  - "src/components/ChartCanvas.tsx"
  - "src/components/ChartUnit.tsx"
  - "src/components/CrosshairAlertButton.tsx"
autonomous: true
---

# Phase 3: Crosshair Interactive Alert Creation - Plan

<requirements>
- CHART-01
- CHART-02
</requirements>

<threat_model>
- **Race conditions**: Crosshair hover triggering too frequently causing React state thrashing. Solution: Debounce or throttle position updates, or use a DOM ref and direct style manipulation instead of React state for hover positioning to avoid re-rendering the entire `ChartCanvas` too often.
- **State desync**: Side bar open state in local state and global state might mismatch. Solution: The global state `useAlertStore` acts as the single source of truth for "prefilled alert creation trigger".
</threat_model>

<tasks>

<task id="1">
  <title>Update global alert store with UI state</title>
  <description>Add global state for controlling the alert panel visibility and pre-filling the price from the chart interaction.</description>
  <action>Edit `src/store/useAlertStore.ts` to add `isPanelOpen`, `prefilledPrice`, `openPanelWithPrice`, and `closePanel` properties to the `AlertStore` interface and implementation.</action>
  <read_first>
    - src/store/useAlertStore.ts
  </read_first>
  <acceptance_criteria>
    - `useAlertStore` exports `isPanelOpen` (boolean), `prefilledPrice` (number | null), `openPanelWithPrice(price: number)`, and `closePanel()` actions.
  </acceptance_criteria>
</task>

<task id="2">
  <title>Connect Sidebar and AlertsPanel to global state</title>
  <description>Sync the local Sidebar state with the global `useAlertStore` state, and pre-fill the form in the AlertsPanel when triggered.</description>
  <action>Edit `src/components/Sidebar.tsx` to read `isPanelOpen` from `useAlertStore` and set the active panel to 'alerts'. Edit `src/components/AlertsPanel.tsx` to read `prefilledPrice` and populate its local price state and form input.</action>
  <read_first>
    - src/store/useAlertStore.ts
    - src/components/Sidebar.tsx
    - src/components/AlertsPanel.tsx
  </read_first>
  <acceptance_criteria>
    - When `useAlertStore.getState().openPanelWithPrice(150)` is called, the sidebar opens to the 'alerts' tab and the form is populated with "150".
  </acceptance_criteria>
</task>

<task id="3">
  <title>Implement CrosshairAlertButton component</title>
  <description>Create a button overlay that tracks the chart's crosshair movement on the Y-axis and triggers the alert panel on click.</description>
  <action>Create `src/components/CrosshairAlertButton.tsx`. It will receive `chartRef` and `priceSeriesRef`. Use `chartRef.current.subscribeCrosshairMove` to track the Y-coordinate. Render a plus icon button positioned absolutely at the crosshair Y-coordinate on the right side. On click, call `openPanelWithPrice`.</action>
  <read_first>
    - src/store/useAlertStore.ts
    - src/components/ChartCanvas.tsx
  </read_first>
  <acceptance_criteria>
    - Button must have `data-testid="crosshair-alert-btn"`.
    - Button only appears when hovered (crosshair active).
    - Clicking it sets global state to open the alert panel with the exact crosshair price.
    - Avoid re-rendering the whole chart wrapper on every crosshair movement; preferably update the button's DOM element directly via refs if needed, or isolate state within the new component.
  </acceptance_criteria>
</task>

<task id="4">
  <title>Integrate CrosshairAlertButton into Chart</title>
  <description>Mount the `CrosshairAlertButton` into the chart component tree so it overlays the Lightweight Chart canvas.</description>
  <action>Edit `src/components/ChartUnit.tsx` to pass `chartRef` and `priceSeriesRef` as props to `<ChartCanvas />`. Then, edit `src/components/ChartCanvas.tsx` to render `<CrosshairAlertButton />` and pass down the refs.</action>
  <read_first>
    - src/components/ChartUnit.tsx
    - src/components/ChartCanvas.tsx
  </read_first>
  <acceptance_criteria>
    - The crosshair plus button appears in the DOM overlaying the chart canvas.
  </acceptance_criteria>
</task>

<task id="5">
  <title>Verify E2E tests</title>
  <description>Run the playwright tests to ensure the e2e test `tests/e2e/chart-alerts.spec.ts` passes.</description>
  <action>Run the `npx playwright test tests/e2e/chart-alerts.spec.ts` command to verify the E2E benchmark passes.</action>
  <read_first>
    - tests/e2e/chart-alerts.spec.ts
  </read_first>
  <acceptance_criteria>
    - The test `tests/e2e/chart-alerts.spec.ts` passes successfully, validating the `TEST-01` requirement.
  </acceptance_criteria>
</task>

</tasks>

<verification>
- E2E test `chart-alerts.spec.ts` passes.
- Hovering over the Y-axis of the chart reveals the plus symbol correctly aligned with the crosshair.
- Clicking the plus symbol correctly opens the Alerts panel with the exact price level populated.
- No visual or performance regressions occur when moving the mouse across the chart.
</verification>

<must_haves>
- The button MUST use the selector `data-testid="crosshair-alert-btn"`.
- The crosshair button MUST trigger the opening of the alerts sidebar with the correct prefilled price.
</must_haves>

Artifacts this phase produces:
- A fully functional interactive alert creation flow from the chart crosshair.
