# Phase 3: UI Polishing & Bug Fixes - Patterns

## 1. `src/hooks/useTradeManager.ts`

**Role:** React Hook for managing the interaction layer between the application state (Zustand) and the Lightweight Charts API. Responsible for handling chart events like crosshair movement.
**Data Flow:** Subscribes to `chartRef.current.subscribeCrosshairMove`. Intersects mouse coordinates with execution markers to find the closest hovered execution, builds a `closestExec` payload, and dispatches it to the `TradePlugin` via `setHoveredExecutions()`.
**Closest Analog:** The existing logic inside `handleCrosshairMove` that constructs the `closestExec` payload and checks distances.

**Concrete Code Excerpt:**
```typescript
// src/hooks/useTradeManager.ts - Existing `closestExec` construction (Line ~218)
closestExec = {
  x: param.point.x,
  y,
  direction: execData.direction,
  action: execData.action
};
```

*Modification Pattern:* Extend this object with the exact raw price (`price: execData.price`) and dynamically call `chartRef.current.applyOptions` to hide/show the crosshair when hovered.

## 2. `src/lib/TradePlugin.ts`

**Role:** Core Lightweight Charts Primitive plugin (`ISeriesPrimitive`) that extends the chart's rendering capabilities. Responsible for drawing on the chart pane (via `ISeriesPrimitivePaneRenderer`).
**Data Flow:** Receives hovered execution state from `useTradeManager`. Dispatches `_requestUpdate()` to notify the chart to redraw. Returns view instances (like `TradePaneView`) when the chart asks for them via `paneViews()`.
**Closest Analog:** The existing `TradePaneView` class which implements `ISeriesPrimitivePaneView`, and the `paneViews()` method inside `TradePlugin`.

**Concrete Code Excerpt:**
```typescript
// src/lib/TradePlugin.ts - Existing PaneView implementation (Line ~231)
class TradePaneView implements ISeriesPrimitivePaneView {
    _plugin: TradePlugin;

    constructor(plugin: TradePlugin) {
        this._plugin = plugin;
    }
    // ...
}

// src/lib/TradePlugin.ts - Existing paneViews method (Line ~318)
paneViews(): readonly ISeriesPrimitivePaneView[] {
    return this._paneViews;
}
```

*Modification Pattern:* Introduce a parallel class `TradeAxisView` implementing `ISeriesPrimitiveAxisView` to draw the custom Y-axis arrow label. Implement `priceAxisViews()` in `TradePlugin` returning instances of `TradeAxisView` when executions are hovered.
