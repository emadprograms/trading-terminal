---
status: investigating
trigger: Market data is not populating and returning HTML instead of JSON.
---

# Debug Session: Market Data JSON Error (v1.2)

## Symptoms
- Frontend console shows `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON` for requests to `/api/market`.
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

## Current Focus
- **Implementation**: Applying fixes to `vercel.json` and `api/market.ts`.
- **Verification**: Ensuring requests hit the serverless function and forward to the correct backend endpoint without the `/api` prefix.

## Evidence
- **Vercel Routing Check:** `vercel.json` contains `{ "source": "/api/market(.*)", "destination": "/api/market" }`. This is incorrect.
- **Frontend Request Check:** `src/api/market.ts` now calls `api.get('market/v1/prices/...')`. Final URL is `/api/market/v1/prices/...`.
- **Match:** `/api/market/v1/prices/...` does NOT match `/api/market(.*)` in Vercel's routing engine.
- **Fallback Observed:** The request falls through to the global `/(.*)` rule, returning `index.html` (HTML), causing the JSON parse error.
