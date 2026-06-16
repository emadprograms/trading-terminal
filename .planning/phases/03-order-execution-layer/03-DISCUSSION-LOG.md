# Discussion Log: Phase 03 — Order Execution Layer

**Date:** 2026-06-06

## Participants
- **User** (Visionary/Founder)
- **Gemini CLI** (Builder)

## Summary of Discussion

### Area: Execution Architecture
- **Options**: Pure REST, Pure WebSocket, or Hybrid.
- **Decision**: **Hybrid**. REST provides reliable command acknowledgment (`dealReference`), while WebSocket provides the lowest latency for fill confirmation.
- **Rationale**: Professional-grade reliability requires knowing the order was received (REST) before waiting for the fill (WS).

### Area: Slippage Handling
- **User Question**: Should the UI warn the user of deviations?
- **Decision**: **Yes, show it**. Transparency is preferred over a "silent" update to keep the user informed of market conditions.
- **Additional Guard**: Added an automatic 0.5% slippage protection cap to prevent execution in extreme volatility.

### Area: Optimistic UI
- **Decision**: **Spinner on click**. Provides instant feedback during the ~100ms REST roundtrip and prevents accidental double-trades.

### Area: Flatten Scope
- **Decision**: **Currently selected position only**.
- **Rationale**: Keeps the implementation simple and robust. Global flatten is deferred to Phase 4.

## Deferred Ideas
- **Global Flatten**: Close all positions with one click.
- **Advanced Slippage Settings**: User-definable slippage tolerance (fixed at 0.5% for now).
- **Multiple SL Distances**: Support for different SL distances per epic.
