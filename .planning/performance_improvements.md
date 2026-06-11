# Performance Improvements & Optimization Plan

This document outlines the known performance bottlenecks in the application, specifically regarding high load times, chart switching lag, and CPU usage.

## 1. Chart Instance Destruction (High Priority)
**Issue:** Currently, every time a user switches a ticker or changes a timeframe, the application completely destroys the `LightweightCharts` canvas instance and reconstructs it from scratch (`chart.remove()` -> `createChart()`). Rebuilding the DOM canvas, recalculating dimensions, and re-attaching plugins is incredibly expensive and causes visible flickering and lag.
**Solution:** Initialize the chart only once per container. When switching symbols, reuse the existing chart instance by calling `priceSeries.setData([])` to clear it, and then inject the new data. For timeframe changes, dynamically update the timescale localization options rather than destroying the chart.

## 2. Zero Caching for Historical Data
**Issue:** When switching to a ticker, `useChartLifecycle` fires a fresh HTTP request to `marketApi.fetchHistoricalData`. Because there is no client-side caching, the user is forced to wait for a full network roundtrip every single time they click a symbol, even if they were just looking at it 5 seconds ago.
**Solution:** Wrap the historical data fetching in a robust query cache (e.g., using `@tanstack/react-query`) with a configurable stale time (e.g., 1-5 minutes).

## 3. Excessive React Re-renders on Price Ticks
**Issue:** The `useTradeManager` hook subscribes to live prices to calculate where to place order badges. However, because it maps over the order data, it creates a brand new `markers` array object on *every single websocket tick*. This forces the entire `ChartCanvas` (and its nested badge HTML elements) to run React's diffing algorithm 5-10 times a second per active chart, consuming significant CPU overhead even when there are no active orders on the chart.
**Solution:** Decouple the live price dependency from the React render cycle where possible. Alternatively, use a much tighter Zustand selector so the component only re-renders when a position/order is actually opened, closed, or modified, rather than on every raw price tick.

## 4. WebSocket Thrashing
**Issue:** Because the WebSocket subscriptions are directly tied to the React component lifecycle, quickly clicking between 3 different symbols sends a rapid sequence of `UNSUBSCRIBE` -> `SUBSCRIBE` messages to the Capital.com WebSocket server. This can cause the server to throttle responses, unnecessarily delaying the live data feed.
**Solution:** Implement a debounce or buffer for WebSocket subscriptions. Keep recently viewed tickers subscribed for a few seconds in the background before fully unsubscribing, to handle rapid clicking and immediate backtracking gracefully.
