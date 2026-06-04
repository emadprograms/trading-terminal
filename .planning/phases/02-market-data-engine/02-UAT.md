---
status: testing
phase: 02-market-data-engine
source: 
  - .planning/phases/02-market-data-engine/02-00-SUMMARY.md
  - .planning/phases/02-market-data-engine/02-01-SUMMARY.md
  - .planning/phases/02-market-data-engine/02-02-SUMMARY.md
started: 2026-06-04T10:00:00Z
updated: 2026-06-04T10:00:00Z
---

## Current Test

number: 1
name: Cold Start Smoke Test
expected: |
  Kill any running server/service. Clear ephemeral state. Start the application from scratch. Server boots without errors, and the main chart interface loads with live data.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server/service. Clear ephemeral state. Start the application from scratch. Server boots without errors, and the main chart interface loads with live data.
result: [pending]

### 2. Ticker Selection & Historical Data
expected: Selecting a ticker (e.g., EURUSD) immediately populates the chart with historical OHLVC candles fetched from the REST API.
result: [pending]

### 3. Real-time Price Display
expected: The Bid/Ask prices in the Chart Header update in real-time with sub-second latency via WebSocket.
result: [pending]

### 4. Live Candle Progression
expected: The most recent candle on the chart updates its price/wick dynamically as new WebSocket ticks arrive.
result: [pending]

### 5. Environment Toggle
expected: Switching between Demo and Live environments triggers a WebSocket reconnection/subscription change, and price feeds update to reflect the selected environment.
result: [pending]

### 6. Timeframe Switch
expected: Changing the chart timeframe (e.g., 1m to 1h) triggers a new historical data fetch and refreshes the chart with candles of the selected resolution.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0

## Gaps

[none yet]
