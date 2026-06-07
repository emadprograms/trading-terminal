# Debug Session: Vercel 500/504 Errors on /api/session

## Status: IN PROGRESS (Handover to Next AI)
**Slug:** `vercel-500-api-session`
**Date:** 2026-06-07
**Current Commit:** `d222db6` (fix(proxy): resolve stream compatibility and URL parsing issues on Vercel)

## Current Symptoms

1.  **504 Timeout Error (300s):** The function hits Vercel's hard limit of 5 minutes. This usually indicates an upstream connection that hangs or never closes.
2.  **500 FUNCTION_INVOCATION_FAILED:** Reported on the `/api/debug` endpoint. This often points to a runtime crash or a routing loop in `vercel.json`.
3.  **Empty Logs:** Log entries are not appearing for the 504 errors, making it difficult to trace the failure without the added `[StabilityTrace]` instrumentation.

## Architecture & Data Flow
**Path:** `Browser` -> `Vercel (/api/...)` -> `Cloudflare Access` -> `Cloudflare Tunnel` -> `GHA Hono Backend` -> `Capital.com`

- **Vercel Layer:** Injects `CF-Access-Client-Id` and `Secret`. Proxies via `undici`.
- **GHA Layer:** The "Vault". Injects `CAPITAL_USER`, `PASSWORD`, `API_KEY`.

## Root Causes Identified & Addressed in `d222db6`

### 1. ESM Module Resolution
- **Issue:** Node.js ESM requires `.js` extensions on imports.
- **Fix:** All internal imports in `/api` now use `.js` (e.g., `import ... from './_utils.js'`).

### 2. Stream Type Mismatch
- **Issue:** `undici` returns Node.js `Readable` streams. Vercel's `Response` (Edge/Web standard) expects `ReadableStream`.
- **Fix:** Implemented `Readable.toWeb(body)` conversion in `api/_utils.ts`.

### 3. URL Parsing Deadlock
- **Issue:** `new URL(req.url)` throws on relative paths.
- **Fix:** Robust URL reconstruction using the `host` header is now implemented in `api/_utils.ts`.

### 4. Vercel Routing Conflict
- **Issue:** Redundant rewrites in `vercel.json` and a catch-all that competed with API routes.
- **Fix:** Cleaned up `vercel.json` with a negative lookahead to isolate the frontend from the API.

## Remaining Investigation Areas for the next AI:

1.  **The 300s Timeout:** Even with `undici` timeouts (15s) now added in `d222db6`, verify if the function is still hanging. If it is, the problem might be in the **body consumption** or a deadlock between the stream conversion and Vercel's internal piping.
2.  **GHA Backend Reachability:** Verify if Vercel can actually reach the `BACKEND_URL`. Check if Cloudflare Access is blocking the request despite the service tokens.
3.  **Body Duplexing:** Check if `duplex: 'half'` is required for the `Response` when handling streaming bodies in Vercel Serverless Functions.
4.  **Runtime Logs:** Use the new `[StabilityTrace]` logs added in `d222db6` to see exactly which line is the last one to execute before the 504 occurs.

## Code Entry Points
- `api/_utils.ts`: Main proxy logic, header injection, and stream handling.
- `api/session.ts`: The specific endpoint that is failing.
- `vercel.json`: Routing configuration.
- `api/debug.ts`: Environment diagnostics endpoint.
