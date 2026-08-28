# Phase 3: Crosshair Interactive Alert Creation - Research

## Objective
Implement a plus button on the Y-axis that appears when the user hovers over the chart. Clicking this button should open the Alert Creation panel in the sidebar, pre-filled with the price level at the crosshair.

## Codebase Context
- `src/components/ChartCanvas.tsx`: The wrapper `div` for the Lightweight Chart instance. Elements placed here can overlay the chart using `position: absolute`.
- `src/components/ChartUnit.tsx`: Instantiates the chart lifecycle hooks (`useChartInit`, `useChartLifecycle`) and creates `chartRef` and `priceSeriesRef`. It renders `ChartCanvas`.
- `src/store/useAlertStore.ts`: Global Zustand store for alerts. It lacks state to control the visibility and pre-filled data of the `AlertsPanel`.
- `src/components/Sidebar.tsx`: Manages the active sidebar panel (`tradeLog`, `watchlist`, `orderHistory`, `alerts`) via local state.
- `src/components/AlertsPanel.tsx`: The UI for creating alerts, which currently uses local state for `price` and `isOpen`.

## Implementation Plan

### 1. Update `useAlertStore.ts`
Add global UI state to the store so the chart can command the sidebar to open:
```typescript
interface AlertStore {
  // existing properties...
  isPanelOpen: boolean;
  prefilledPrice: number | null;
  openPanelWithPrice: (price: number) => void;
  closePanel: () => void;
}
```
*Action*: Implement `openPanelWithPrice` to set `isPanelOpen: true` and `prefilledPrice: price`.

### 2. Connect `Sidebar.tsx` to the Global UI State
The `Sidebar` currently uses local state `const [activePanel, setActivePanel] = useState(...)`. 
We need to synchronize it with `useAlertStore`:
```tsx
const alertPanelOpen = useAlertStore(s => s.isPanelOpen);

useEffect(() => {
  if (alertPanelOpen) {
    setActivePanel('alerts');
  }
}, [alertPanelOpen]);
```
*(Optional: Reset `isPanelOpen` when the sidebar switches away from 'alerts').*

### 3. Update `AlertsPanel.tsx`
Read `prefilledPrice` from `useAlertStore` and pre-fill the form:
```tsx
const prefilledPrice = useAlertStore(s => s.prefilledPrice);

useEffect(() => {
  if (prefilledPrice !== null) {
    // Format appropriately, e.g. .toFixed(2)
    setPrice(prefilledPrice.toFixed(2));
    setIsOpen(true);
  }
}, [prefilledPrice]);
```

### 4. Create `CrosshairAlertButton.tsx`
Create a new React component that tracks the Lightweight Charts crosshair API and renders an overlay button.
- **Hook**: `chart.subscribeCrosshairMove((param) => { ... })`
- **Data**: Retrieve the Y-coordinate `param.point.y` and the price at that coordinate `series.coordinateToPrice(param.point.y)`.
- **Positioning**: Render a `<button data-testid="crosshair-alert-btn">` at `position: absolute`.
  - `top: param.point.y - 12`
  - `right: chart.priceScale('right').width() - 12` (this centers it exactly on the boundary between the chart area and the right Y-axis).
- **Action**: `onClick` calls `useAlertStore.getState().openPanelWithPrice(price)`.

### 5. Integrate into `ChartUnit.tsx` and `ChartCanvas.tsx`
- Modify `ChartCanvasProps` to accept `chartRef` and `priceSeriesRef`.
- In `ChartUnit.tsx`, pass `chartRef` and `priceSeriesRef` down to `<ChartCanvas>`.
- In `ChartCanvas.tsx`, render `<CrosshairAlertButton chartRef={chartRef} priceSeriesRef={priceSeriesRef} />` as a child, ensuring it is positioned correctly on top of the canvas.

## Testing Selectors
Ensure the button includes a reliable selector for Playwright (e.g., `data-testid="crosshair-alert-btn"`) as this is required for the `TEST-01` milestone requirement.
