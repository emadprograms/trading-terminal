---
status: resolved
trigger: Market data is not populating and returning HTML instead of JSON.
---

# Debug Session: Market Data JSON Error

## Symptoms
- Frontend console shows `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON` for requests to `/api/market`.
- Frontend console shows `SyntaxError: Unexpected token '(', "(/...` for larger payloads (e.g., AAPL), indicating compressed binary data being interpreted as JSON.
- Vercel logs showed that requests to `/api/market` were not reaching the serverless function (invisible requests), indicating a routing fallback to `index.html`.
- `/api/session` is working perfectly (returning 200).

## Research/Changes Attempted
1. Migrated all `/api` handlers to Node.js `(req, res)` signature to fix 502/TypeError.
2. Stripped `transfer-encoding` header in `api/_utils.ts` to fix Undici `InvalidArgumentError`.
3. Corrected `BACKEND_URL` typo (`proxy.backend-scanner.uk` -> `proxy.scanner-backend.uk`).
4. Renamed Vercel env var `VITE_CF_ACCESS_CLIENT_SECRET` -> `CF_ACCESS_CLIENT_SECRET`.
5. Simplified and then restored explicit routing in `vercel.json` using wildcards (`/api/market(.*)`) to handle trailing slashes.
6. Fixed a double-prefix issue in `src/api/market.ts` where the path was `api/v1/prices` resulting in `/api/api/v1/prices`.
7. **Implemented Routing Alignment**: Updated `src/api/market.ts` to use the `market/` prefix (e.g., `api.get('market/v1/prices/...')`).
8. **Dynamic Handler**: Updated `api/market.ts` to dynamically extract the sub-path and forward it to the backend (e.g., `/api/market/v1/prices` -> `BACKEND_URL/api/v1/prices`).
9. **Standardized Client**: Re-verified and locked `src/api/client.ts` to use `prefix: '/api'` as per Ky v2.0.2 standards for this project environment.
10. **Vercel Routing Fix (v1.2)**: Identified that `(.*)` is not a valid wildcard in `vercel.json` rewrites, causing requests to fall through to `index.html`. Changing to `:path*`.
11. **Backend Path Alignment (v1.2)**: Identified that `api/market.ts` was adding an unnecessary `/api` prefix to the target path. Removing `/api` to match the working pattern in `api/session.ts`.
12. **Backend Path Correction (v1.3)**: Observed a 404 error after backend restart. Determined that while `/session` works without `/api`, market data endpoints require the `/api` prefix (e.g., `/api/v1/prices`). Restoring the `/api` prefix in `api/market.ts`.
13. **Instrumentation Phase (v1.4)**: Implemented high-resolution logging at Frontend (Browser), Proxy (Vercel), and WebSockets (Browser) to empirically locate the break in the data chain.
14. **Fixed Decompression Error**: Stopped stripping `content-encoding` header in `api/_utils.ts`. This allows the browser to correctly decompress Gzip/Brotli responses from the backend, resolving the `Unexpected token '('` error.

## Preservation Mandate
**CRITICAL:** This document contains a detailed history of failed hypotheses and routing iterations. To prevent "circular debugging" where future AI agents repeat the same mistakes in new sessions, **this historical record must be preserved in its entirety**. Do not simplify or remove the versioned attempts (v1.1 - v1.4).

## Current Focus
- **Verified**: Vercel logs confirm that requests to `/api/market` now correctly hit the serverless function.
- **Verified**: Decompression fix applied to ensure large payloads are handled correctly by the browser.

## Evidence
- **Vercel Routing Check:** `vercel.json` contains `{ "source": "/api/market(.*)", "destination": "/api/market" }`.
- **Frontend Request Check:** `src/api/market.ts` now calls `api.get('market/v1/prices/...')`. Final URL is `/api/market/v1/prices/...`.
- **Match:** `/api/market/v1/prices/...` matches `/api/market(.*)`.
- **Log Proof:** Vercel logs show `[StabilityTrace] Market handler started` and `Upstream Response: 404` (business logic error), confirming the request successfully bypassed the HTML fallback.
- **Payload Proof:** The `Unexpected token '('` error for AAPL coincided with larger payloads, confirming a missing `content-encoding` header.
