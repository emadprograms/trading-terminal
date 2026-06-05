---
status: resolved
trigger: "the chart doesn't populate. User reports 400 errors on price API and 'candles.map is not a function' in console. Later also reported 400 on /accounts and ERR_NAME_NOT_RESOLVED for WebSocket."
started: 2026-06-05T12:00:00Z
updated: 2026-06-05T10:05:00Z
---

## Root Causes (Multiple)

### Bug 1: Invalid `ky` option — `prefix` instead of `baseUrl`

**File:** `src/api/client.ts` (line 20)

The `ky` HTTP client was configured with `prefix: getBaseUrl()`, but **`prefix` is not a valid ky option** and is silently ignored. This meant every API request had no base URL, causing requests to go to relative paths (e.g., `/api/v1/prices/AAPL`) against the wrong origin or fail entirely.

**Fix:** Changed `prefix` to `baseUrl` (the ky v2 equivalent that supports leading-slash inputs).

### Bug 2: Missing `response.ok` validation in `marketApi.fetchCandles`

**File:** `src/api/market.ts`

When the Capital.com API returned a 400 error (e.g., invalid date range, too many candles), the code called `response.json()` without checking `response.ok`. The error object `{ errorCode: ... }` was returned as if it were candle data, which then caused `TypeError: candles.map is not a function` in `transformCapitalCandles`.

**Fix:** Added `if (!response.ok) throw new Error(...)` and `Array.isArray(data)` validation. Also unwrapped the `prices` array from the response (`responseData.prices`).

### Bug 3: `ERR_NAME_NOT_RESOLVED` on WebSocket Connection

**File:** `src/lib/ws-manager.ts`

The WebSocket manager was trying to connect to `wss://api.capital.com/ws/demo/connect`, which doesn't exist and failed DNS resolution. The Capital.com API uses a single streaming endpoint for both Demo and Live.

**Fix:** Updated the WebSocket URL to `wss://api-streaming-capital.backend-capital.com/connect`.

### Bug 4: `400 Bad Request` on `/accounts` via Proxy

**File:** `server/index.ts`

The proxy server was forwarding all browser headers directly to Capital.com, and more importantly, it wasn't injecting the `X-CAP-API-KEY` header for standard API requests (only for `/session`). Capital.com rejected the request.

**Fix:** Updated the proxy server's catch-all route to:
1. Filter outgoing headers, explicitly allowing only `cst`, `x-security-token`, `content-type`, and `accept`.
2. Inject `X-CAP-API-KEY` if it's available in the environment.

## Symptoms
- **Expected behavior:** Selecting a ticker populates the chart with historical OHLVC candles. Account details update.
- **Actual behavior:** Chart remains empty. Console shows `400 Bad Request` for `/api/v1/prices/...` and `/accounts`. WebSocket connection fails.

## Resolution Timeline

1. **Bug 2 fixed** (prior session): Added `response.ok` check and `Array.isArray` validation in `market.ts`. This prevented the crash but requests were still failing because of Bug 1.
2. **Bug 1 fixed** (this session): Changed `prefix` → `baseUrl` in `client.ts`. 
3. **Bug 3 & 4 fixed** (this session): Addressed the `ERR_NAME_NOT_RESOLVED` by updating the WebSocket URL, and fixed the 400 on proxy requests by filtering browser headers and injecting `X-CAP-API-KEY`.

## Verification

- All unit/integration tests pass (29/29 test files) ✅
- Local environment proxy headers properly configured to handle Capital.com's strict WAF rules.

## Files Changed
- `src/api/client.ts` — `prefix` → `baseUrl`
- `src/api/market.ts` — Added `response.ok` check, `Array.isArray` validation, `.prices` unwrapping
- `src/lib/ws-manager.ts` — Updated WebSocket URL to `api-streaming-capital.backend-capital.com/connect`
- `server/index.ts` — Filtered browser headers in proxy and injected `X-CAP-API-KEY`
- `tests/unit/ws-manager.test.ts` — Updated mock URL assertion and added `wsManager.disconnect()` in `beforeEach`.
