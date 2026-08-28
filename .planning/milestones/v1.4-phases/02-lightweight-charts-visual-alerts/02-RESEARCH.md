# Phase 02: Lightweight Charts Visual Alerts - Research

## Objective
Answer the question: **"What do I need to know to PLAN this phase well?"**

Based on reading the `.planning` state, the phase context (`02-CONTEXT.md`), and inspecting the codebase, here is a detailed breakdown of the technical approach, necessary file changes, and validation architecture to fulfill requirement `VISUAL-01`.

## Technical Approach

1. **Modular Hook Architecture**
   - The chart functionality is currently organized into distinct, modular hooks (e.g., `useChartLifecycle`, `useTradeManager`, `useChartPlugins`). To maintain this pattern and keep `ChartUnit.tsx` manageable, we should create a dedicated hook: `useChartAlerts`.
   - This hook will accept `ticker`, `priceSeriesRef`, and `theme`.

2. **Efficient State Management**
   - We must avoid causing expensive re-renders to `ChartUnit` every time an alert state changes.
   - Instead of accessing `useAlertStore` via a reactive state hook inside the component, `useChartAlerts` should initialize via `useAlertStore.getState()` and then use `useAlertStore.subscribe(callback)` within a `useEffect`.
   - This allows us to intercept alert creations, deletions, and triggers, and imperatively update the Canvas without triggering React renders.

3. **Managing `PriceLine` Lifecycles**
   - Lightweight Charts allows adding lines to a series using `priceSeriesRef.current.createPriceLine(options)`.
   - The hook will maintain a `useRef<Map<string, IPriceLine>>(new Map())` to map `alert.id` to the Lightweight Charts line instances.
   - **Syncing Logic**: When the store updates, we filter `state.alerts` for `a.epic === ticker && !a.triggered`.
     - **Add**: If an alert ID is not in our Map, call `createPriceLine` and store it.
     - **Update**: If an alert ID exists, call `line.applyOptions({ price: alert.targetPrice })`.
     - **Remove**: If an ID exists in our Map but is absent from the active alerts, call `priceSeriesRef.current.removePriceLine(line)` and delete it from the Map.
   - **Cleanup**: In the `useEffect` cleanup function, iterate over the Map and remove all price lines to ensure proper unmounting when the user switches tickers.

4. **Visual Styling Decisions**
   - **Line Style**: Solid line (`lineStyle: 0` in Lightweight Charts).
   - **Color**: Based on a search of the codebase, the established warning/alert color is `#ff9800` (`tvOrange`, used in `TradeBadge.tsx`).
   - **Options payload**:
     ```typescript
     {
       price: alert.targetPrice,
       color: '#ff9800',
       lineWidth: 2,
       lineStyle: 0,
       axisLabelVisible: true,
       title: 'ALERT',
     }
     ```
   - Interaction is strictly view-only (no drag/click logic needed for `VISUAL-01`).

## File Changes

1. **`src/hooks/chart/useChartAlerts.ts` (NEW)**
   - Implement the new hook containing the `useEffect` with the `useAlertStore.subscribe` logic and `Map` tracking.

2. **`src/components/ChartUnit.tsx` (MODIFIED)**
   - Import `useChartAlerts`.
   - Invoke the hook near the other managers (e.g., below `useTradeManager`), passing it the required props:
     ```typescript
     useChartAlerts({
       ticker: data.ticker,
       priceSeriesRef,
       theme,
     });
     ```

## Validation Architecture

1. **Visual Plotting (Manual/Playwright)**
   - Open the sidebar to the "Alerts" panel.
   - Add a new alert for the current asset (e.g., AAPL).
   - Verify that a solid orange line with the label "ALERT" immediately appears on the chart at the exact price.
2. **Lifecycle: Deletion**
   - Remove the alert using the sidebar (if deletion is supported there) and verify the line instantly disappears from the chart.
3. **Lifecycle: Triggering**
   - Move the price (via mocking or live tick) to hit the alert threshold.
   - Observe the global toast firing (existing logic) and confirm the orange line is removed from the chart because the alert is no longer `!triggered`.
4. **Context Switching**
   - Switch the active ticker (e.g., from AAPL to MSFT) and verify that AAPL's alert lines do not persist on the MSFT chart. Switching back to AAPL should re-render its active alerts.
