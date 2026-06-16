# Phase 4 Discussion Log

## Area: Audit Strategy
**Selected:** Top-down trace (Agent chosen)
**Notes:** User delegated the choice. We will use a top-down trace from UI to Proxy to find root causes.

## Area: Double Alt Safety
**Selected:** Concurrent execution lock
**Notes:** User explicitly wants a lock. Until the order is returned confirmed and netting is finished by Capital.com, subsequent presses should inform the user it isn't possible.

## Area: Limit Order Fallback
**Selected:** True root-cause fix (No Optimistic UI)
**Notes:** User emphasized hardening over visual band-aids. We must figure out exactly why limit/stop loss orders fail to cancel (e.g., the AAPL limit order bug) and fix the underlying issue.

## Area: Shortcut Context
**Selected:** Strictly scoped to active chart
**Notes:** User confirmed that global shortcuts like `alt+q` triggering across all charts was a bug and they should strictly apply to the active chart.
