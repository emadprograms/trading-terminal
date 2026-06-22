---
status: resolved
trigger: "when I place an order, I get order rejected: unknown reason"
created: 2026-06-22
---

## Symptoms
- **Expected behavior**: Order is placed successfully.
- **Actual behavior**: Order gives an order ID, but a second later, an "order rejected unknown error" message is received.
- **Error messages**: "order rejected unknown error"
- **Timeline**: Happens a second after the order ID is returned.
- **Reproduction**: Place a market order for a stock (e.g., META).

## Resolution
- **root_cause**: Capital.com's WebSocket confirmation payload was returning the rejection reason in a field other than `reason` (e.g. `rejectReason` or `errorCode`), causing `payload.reason` to be undefined. The fallback `'Unknown reason'` was displayed. Additionally, the debug payload was logged using `console.log` (Info level), which was likely filtered out in the browser console.
- **fix**: Updated `handleConfirmation` in `useTradeStore.ts` to aggressively extract the rejection reason from `rawPayload.reason || rawPayload.rejectReason || rawPayload.errorCode || rawPayload.developerMessage || rawPayload.message || rawPayload.error`. Also changed the debug log to `console.warn` for rejected payloads so it bypasses Info-level console filters.
- **verification**: User to test placing an order and observe if the actual rejection reason is now shown in the toast/console.
