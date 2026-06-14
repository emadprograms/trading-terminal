# Phase 3: UI Polishing & Bug Fixes - Research

## 1. Root Cause of the Bug
The user reported: "The stock is trading near 205, the hovering arrow is 203".
This discrepancy occurs because the execution markers (triangles) on the chart are deliberately placed at the `candleLow` or `candleHigh` (e.g., 203) so they don't occlude the candlestick body. When the user hovers their cursor over this triangle, their mouse's Y coordinate is physically located at 203. 

Currently, `lightweight-charts` automatically displays its default crosshair horizontal line and price axis label (the "dash") at the exact mouse Y coordinate (203). Although `useTradeManager` detects the hover and tells `TradePlugin` to draw a sideways arrow on the chart pane at the execution's *true* price (205), the **price axis label** remains the default crosshair's dash at the mouse's coordinate (203), confusing the user.

## 2. Implementation Plan
To replace the default crosshair dash with an accurate price axis arrow label, we must leverage the `lightweight-charts` Primitive API to draw an `ISeriesPrimitiveAxisView`.

### A. Pass the Exact Price to the Plugin
In `src/hooks/useTradeManager.ts`, update the `closestExec` payload passed to `setHoveredExecutions` to include the raw execution price (`price: execData.price`).

### B. Disable Default Crosshair Dash on Hover
In `src/hooks/useTradeManager.ts` (`handleCrosshairMove`), dynamically hide the horizontal crosshair line and label when hovering an execution:
```typescript
chartRef.current.applyOptions({ crosshair: { horzLine: { visible: false, labelVisible: false } } });
```
Restore the horizontal crosshair (`visible: true, labelVisible: true`) when the hover ends or the user moves away from the marker.

### C. Render Custom Price Axis Arrow
In `src/lib/TradePlugin.ts`:
- Update `TradePlugin` to implement the `priceAxisViews(): readonly ISeriesPrimitiveAxisView[]` method.
- Create a new `TradeAxisView` class that implements `ISeriesPrimitiveAxisView`.
- For hovered executions, `TradeAxisView` will return:
  - `coordinate()`: The execution's true Y coordinate (`exec.y`).
  - `text()`: The correctly formatted exact entry price using `this._plugin._series.priceFormatter().format(exec.price)`.
  - `textColor()`: `#ffffff`
  - `backColor()`: The action color (`#007aff` for BUY, `#ff3b30` for SELL).

## 3. Constraints Checklist
- **No new features:** We are only replacing the crosshair label logic during hover to fix the bug.
- **Keep existing animation:** The sideways arrows rendered on the pane in `TradeRenderer.draw()` must remain untouched.
- **Current price formatting:** Using `series.priceFormatter().format()` ensures we accurately respect the chart's decimal precision and formatting rules without hardcoding.

## 4. Validation Architecture
- **State Validation:** Verify that hovering a historical order marker fires `handleCrosshairMove`, calculates the correct exact price, and accurately updates the `TradePlugin` state with the `price` payload.
- **Visual Validation:** Ensure the standard dashed crosshair line and label disappear on hover, and a solid custom price label (the arrow) appears on the Y-axis at the exact entry price, perfectly formatted.
- **Regression Validation:** Ensure the crosshair fully restores when the mouse moves off the marker, and ensure `TradePlugin`'s existing sideways arrow on the chart canvas still renders correctly.
