# Phase 3: UI Polishing & Bug Fixes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-13
**Phase:** 3-UI Polishing & Bug Fixes
**Areas discussed:** Popup Animation, Interaction Timing, Price Formatting

---

## Popup Animation, Interaction Timing, Price Formatting

| Option | Description | Selected |
|--------|-------------|----------|
| Popup Animation | Fade-in, spring bounce (framer-motion), or instant snap? | |
| Interaction Timing | Immediate on hover, or slight delay to prevent flicker? | |
| Price Formatting | Exact decimals, currency symbol, or chart axis format? | |
| Free-text response | User specified custom feedback | ✓ |

**User's choice:** "the current animation used isn't bad. It's okay. price formatting is okay too. The only thing that I'm strugglilng with the price at which the arrow pops up when I hover. The price it hovers at is nowhere near the candle. The stock is trading near 205, the hovering arrow is 203? How can I enter at 203 when aapl is trading at 205, so it is either fetching a wrong or something like that. Treat this more like a bug that needs to be debugged, rather any additional feature that I want added. I dont' want any additional feature added. I just want this bug fixed."
**Notes:** User explicitly rejected adding any new animations or formatting features, and requested that this phase be treated purely as a bug fix for the hover price accuracy.

---

## the agent's Discretion

None.

## Deferred Ideas

None.
