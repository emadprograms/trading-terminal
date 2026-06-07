---
status: investigating
trigger: Market data is not populating and returning HTML instead of JSON.
---

# Debug Session: Market Data JSON Error

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

## Current Focus
- **Verification**: Local tests in `src/api/market.test.ts` are passing with the new path structure.
- **Unresolved Concerns**: The user feels "something is wrong" with the current implementation or diagnosis. Further empirical testing in the production-like environment is needed to confirm if the `Unexpected token <` error is fully eliminated under all conditions.

## Evidence
- **Vercel Routing Check:** `vercel.json` contains `{ "source": "/api/market(.*)", "destination": "/api/market" }`.
- **Frontend Request Check:** `src/api/market.ts` now calls `api.get('market/v1/prices/...')`. Final URL is `/api/market/v1/prices/...`.
- **Match:** `/api/market/v1/prices/...` matches `/api/market(.*)`.
- **Fallback Avoided:** The request should now hit the serverless function instead of falling through to `index.html`.
