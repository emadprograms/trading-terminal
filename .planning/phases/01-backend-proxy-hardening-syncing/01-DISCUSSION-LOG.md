# Phase 1: Backend Proxy Hardening & Syncing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-13
**Phase:** 1-Backend Proxy Hardening & Syncing
**Areas discussed:** Order State Sync Mechanism, Validation Error UX, Rate Limiting / Retry Strategy

---

## Order State Sync Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| WebSockets | Rely purely on Capital.com WebSockets for live order updates | ✓ |
| Polling | Aggressively poll the REST API after placing an order | |
| Hybrid | Use WebSockets but poll on certain actions | |

**User's choice:** Place order via REST API, get confirmation via WebSocket.
**Notes:** User explicitly clarified the architecture: order goes through REST, and confirmation/fill comes from the WebSocket.

---

## Validation Error UX

| Option | Description | Selected |
|--------|-------------|----------|
| Toasts | Simple toasts ("Invalid order parameters") | |
| Detailed | Detailed inline form errors explaining exactly which fields failed | ✓ |
| Modal | Blocking modal with error details | |

**User's choice:** Very clear message explaining why it failed.
**Notes:** Wants to know exactly why an order was rejected, whether it failed from the Vercel side or from Capital.com (and exact reason provided by Capital.com). "I always wish to know why an order was rejected."

---

## Rate Limiting / Retry Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Auto Retry | Proxy automatically retries (increasing latency) | ✓ (for prices) |
| Fail Immediately | Immediately fail back to the client for the user to retry | ✓ (for orders) |

**User's choice:** Differentiate by type. Prices get retries, orders do not.
**Notes:** For chart prices, attempt retries (e.g., attempt 1/3) and inform user. For orders, NEVER retry. "Just inform the user of the error and he will try again, it is entirely possible that the order has now moved away from the ideal price. no point in retrying an order."

---

## the agent's Discretion

None

## Deferred Ideas

None
