---
wave: 1
depends_on: []
files_modified:
  - src/hooks/chart/useChartAlerts.ts
  - src/components/ChartUnit.tsx
autonomous: false
---

# Phase 02: Lightweight Charts Visual Alerts - Plan

## Requirements
- VISUAL-01

## Must Haves
- A new modular hook `useChartAlerts` must be created.
- Active alerts (matching the current ticker and `!triggered`) must be rendered as horizontal solid orange (`#ff9800`) lines.
- The `ChartUnit` component must integrate `useChartAlerts` without introducing extra reactive renders for alert updates.
- Alert lines must automatically clean up when they are removed from the store, triggered, or when the ticker changes.

## Artifacts this phase produces
- `useChartAlerts` (hook)
- `UseChartAlertsProps` (interface)

## Tasks

<task>
  <id>01-create-hook</id>
  <title>Create useChartAlerts hook</title>
  <read_first>
    - src/store/useAlertStore.ts
    - src/hooks/chart/useChartLifecycle.ts
  </read_first>
  <action>
    Create a new file `src/hooks/chart/useChartAlerts.ts`.
    Implement and export `interface UseChartAlertsProps` containing:
    - `ticker: string`
    - `priceSeriesRef: React.MutableRefObject<ISeriesApi<"Candlestick"> | null>`
    - `theme: 'light' | 'dark'`

    Implement and export `useChartAlerts(props: UseChartAlertsProps)`:
    - Use `useRef<Map<string, IPriceLine>>(new Map())` to track alert IDs to lightweight-charts `IPriceLine` instances.
    - Use a `useEffect` that depends on `ticker`, `priceSeriesRef`, and `theme`.
    - Within the effect, define a `syncAlerts(state: AlertState)` function that:
      1. Filters `state.alerts` for `a.epic === ticker && !a.triggered`.
      2. Iterates the filtered active alerts:
         - If `alert.id` is not in the Map, create the line using `priceSeriesRef.current?.createPriceLine({ price: alert.targetPrice, color: '#ff9800', lineWidth: 2, lineStyle: 0, axisLabelVisible: true, title: 'ALERT' })` and add it to the Map.
         - If `alert.id` is in the Map, update it via `line.applyOptions({ price: alert.targetPrice })`.
      3. Identifies orphaned lines (in the Map but not in the filtered active alerts), removes them using `priceSeriesRef.current?.removePriceLine(line)`, and deletes them from the Map.
    - Run `syncAlerts(useAlertStore.getState())` immediately within the effect to handle initial state.
    - Subscribe to store updates via `const unsubscribe = useAlertStore.subscribe(syncAlerts)`.
    - In the `useEffect` cleanup function: call `unsubscribe()`, iterate over the Map values to call `priceSeriesRef.current?.removePriceLine(line)`, and `clear()` the Map.
  </action>
  <acceptance_criteria>
    - File `src/hooks/chart/useChartAlerts.ts` exists and exports `useChartAlerts` and `UseChartAlertsProps`.
    - The hook correctly imports types from `lightweight-charts` (`IPriceLine`, `ISeriesApi`).
    - The hook uses `useAlertStore.subscribe` rather than reactive Zustand hooks to avoid React renders on alert state changes.
    - The hook maps `alert.id` to line instances, updating, creating, or removing them correctly.
    - The hook clears all lines and unsubscribes on unmount or ticker change.
  </acceptance_criteria>
</task>

<task>
  <id>02-integrate-hook</id>
  <title>Integrate useChartAlerts in ChartUnit</title>
  <read_first>
    - src/components/ChartUnit.tsx
    - src/hooks/chart/useChartAlerts.ts
  </read_first>
  <action>
    Modify `src/components/ChartUnit.tsx`.
    Import `useChartAlerts` from `../hooks/chart/useChartAlerts`.
    Invoke the hook within the `ChartUnit` component function, placing it after the other hook initializations (e.g., right after `useTradeManager`).
    Pass the required props:
    ```typescript
    useChartAlerts({
      ticker: data.ticker,
      priceSeriesRef,
      theme,
    });
    ```
  </action>
  <acceptance_criteria>
    - `src/components/ChartUnit.tsx` imports and calls `useChartAlerts` with the correct props.
    - The component compiles without TypeScript errors.
  </acceptance_criteria>
</task>

## Verification Criteria
1. Add a new alert for an asset via the Alerts panel. Verify a solid orange (`#ff9800`) line titled "ALERT" appears at the correct price on the chart.
2. Remove an alert via the UI. Verify the corresponding line disappears from the chart immediately.
3. Switch tickers (e.g., from AAPL to MSFT). Verify AAPL's alert lines disappear and do not persist on the MSFT chart.
4. Trigger an alert. Verify that when the global toast fires, the orange line is removed from the chart because it is no longer active.
