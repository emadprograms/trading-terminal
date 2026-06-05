# Known Pitfalls and Debugging Notes

**Analysis Date:** 2026-06-05

## Chart Data Not Populating (API Parsing)

**Issue:** Charts do not populate with data, returning empty or throwing errors. Console shows `candles.map is not a function` or similar.

**Root Causes:**

1.  **Response Wrapper:** The Capital.com `/api/v1/prices/{epic}` REST API returns historical data wrapped in a `prices` object (e.g., `{ prices: [...] }`). The code must extract the array from the wrapper (e.g., `const pricesArray = responseData.prices`) before mapping over it.
2.  **Date Range Limits:** The API enforces strict limits on the number of bars that can be returned per request, depending on the `resolution`. Exceeding these limits results in a 400 Bad Request.
    *   `MINUTE`: Max ~16 hours
    *   `MINUTE_5`: Max ~3 days
    *   `MINUTE_15`: Max ~7 days
    *   `MINUTE_30`: Max ~14 days
    *   `HOUR`: Max ~60 days
    *   `DAY`: Max ~5 years
    *   Always cap the `max` parameter to 1000.
3.  **`ky` Client Configuration:** When using the `ky` HTTP client (v2+), use `prefixUrl` (not `prefix` or `baseUrl`) to prepend a base URL to requests, and ensure the requested endpoint path does *not* start with a leading slash (e.g., `api.get('api/v1/prices/...')`).
4.  **WebSocket Field Naming:** The WebSocket `marketData.update` / `quote` payload uses the field `ofr` for the ask/offer price, whereas the REST API `prices` endpoint uses the field `ask`. Ensure the data adapter correctly maps these to internal types.

## Session and Authentication

**Issue:** Sessions expire unexpectedly or "zombie" states occur where the UI seems connected but orders fail.

**Root Causes & Mitigations:**

*   **10-Minute Timeout:** Capital.com `CST` and `X-SECURITY-TOKEN` tokens expire after 10 minutes of inactivity.
*   **Mitigation:** Implement a periodic "heartbeat" ping (e.g., fetching account info every 5 minutes) to keep the session alive. Ensure API clients gracefully handle 401 Unauthorized errors by clearing the session state or prompting re-authentication.

## Rate Limiting

**Issue:** Frequent order rejections or API blocks (429 Too Many Requests).

**Root Causes & Mitigations:**

*   **Order Throttling:** Capital.com restricts order placements to 1 request per 0.1 seconds.
*   **Mitigation:** Implement client-side debouncing or a queue for rapid actions like keyboard shortcut trading.

## Real-time Execution

**Issue:** Market orders fail due to "Invalid Price" or slippage limits.

**Root Causes & Mitigations:**

*   **Stale Data:** Executing orders based on delayed chart data instead of the latest live WebSocket tick.
*   **Mitigation:** Always use the most recent bid/ask tick from the WebSocket for execution logic, not the last closed candle.

*Updated: 2026-06-05*
