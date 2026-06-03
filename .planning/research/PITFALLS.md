# Domain Pitfalls: Capital.com Trading Terminal

**Domain:** Live Trading Integration
**Researched:** 2025-06-03
**Confidence:** HIGH

## Critical Pitfalls

Mistakes that cause financial loss, account lockouts, or major system rewrites.

### Pitfall 1: Silent Session Expiration (The "Zombie Terminal")
**What goes wrong:** Capital.com sessions (`CST` and `X-SECURITY-TOKEN`) expire after **10 minutes of inactivity**. If the user leaves the tab open and then attempts a "fast-execution" shortcut (e.g., `Ctrl+1`), the order fails silently or with a `401 Unauthorized` after the price has already moved.
**Why it happens:** Failing to implement a background heartbeat (ping) or failing to detect/respond to `401` errors with an immediate re-auth.
**Consequences:** Missed entries, frustrated users, and potential for "stuck" UI states where the app thinks it's connected but orders won't fire.
**Prevention:** 
1. Implement a **heartbeat** every 5 minutes (e.g., fetch account summary).
2. Use an **Axios Interceptor** to catch `401` errors and trigger a transparent re-authentication flow if a valid API key is available.
**Detection:** Monitor for `401` status codes in logs; UI warning banner when WebSocket connectivity drops.

### Pitfall 2: The "Stale Price" Race Condition
**What goes wrong:** A user fires a market order based on a price seen on the chart. In the ~200ms it takes for the request to hit the API, the market moves. If the order is a Limit/Stop, it might be rejected as "Invalid Price" because it's now too close to the current price.
**Why it happens:** High-frequency price updates vs. network latency. 
**Consequences:** Rejection of critical "panic" exits or high-conviction entries.
**Prevention:** 
1. Use **Slippage Tolerance** parameters if supported by the API.
2. Implement **Market Orders** for entries where speed > price precision.
3. Validate `minNormalStopOrLimitDistance` from the `GET /markets/{epic}` endpoint before firing orders.
**Detection:** Log `error.security.stop-location-invalid` errors; compare execution price vs. chart price at trigger time.

### Pitfall 3: Shortcut Spamming & Rate Limits
**What goes wrong:** A user hammers `Ctrl+1` multiple times in a second. Capital.com strictly limits order placement to **1 request per 0.1 seconds**.
**Why it happens:** Lack of client-side debouncing or rate-limiting on execution hooks.
**Consequences:** `429 Too Many Requests` errors; accidental "double-sizing" (opening two positions instead of one).
**Prevention:** 
1. Implement **client-side debouncing** on trading shortcuts (e.g., ignore subsequent presses for 500ms).
2. Show a "Processing..." state in the UI to prevent double-clicking.
**Detection:** Monitor for `429` status codes specifically on the `/positions` endpoint.

## Moderate Pitfalls

### Pitfall 1: "Lot Size" vs "Share Count" Confusion
**What goes wrong:** User intends to buy 10 shares but the API interprets the `size` as a "Contract Unit" which might differ by asset class (e.g., Forex vs. Stocks).
**Prevention:** Always normalize the `size` parameter based on the instrument's `scalingFactor` and `lotSize` returned by the Market Details API. Use a "shares" label in UI for stocks and "units" for Forex.

### Pitfall 2: WebSocket Subscription Overload
**What goes wrong:** User opens a workspace with 50 charts. Capital.com limits WebSocket subscriptions to **40 instruments** per connection.
**Prevention:** Implement a subscription manager that prioritizes the most recently viewed/active charts and unsubscribes from hidden or "bottom-of-the-pile" charts.

## Minor Pitfalls

### Pitfall 1: Demo vs. Live URL Mismatch
**What goes wrong:** Trading on Demo with Live API keys or vice versa.
**Prevention:** Enforce environment-specific base URLs (`demo-api-...` vs `api-...`) based on the active account toggle in the UI.

### Pitfall 2: Hardcoded API Secrets in Frontend
**What goes wrong:** API key is leaked in the client-side bundle.
**Prevention:** **Mandatory** use of the Ephemeral Backend as a proxy for all authenticated requests. The frontend should never touch the `API_SECRET`.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Phase 1: Auth** | Session Timeout (10min) | Implement heartbeat/ping logic immediately. |
| **Phase 2: Ticks** | WS Subscription Limit (40) | Limit default workspace size or implement LRU subscription caching. |
| **Phase 3: Execution**| Rate Limiting (1 req/0.1s) | Client-side debouncing on all trading shortcuts. |
| **Phase 3: Execution**| Min Stop Distance | Fetch and cache market details (`stopLevel`) before allowing trade execution. |

## Sources

- [Capital.com API Documentation: Session Management](https://capital.com/api-development-guide)
- [Capital.com API Reference: Rate Limits](https://capital.com/api-reference)
- [Common Trading System Race Conditions (Community Research)](https://algocademy.com/blog/trading-system-pitfalls/)
