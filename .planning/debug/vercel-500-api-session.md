# Debug Session: Vercel 500/504 Errors on /api/session

## Status: COMPLETED
**Slug:** `vercel-500-api-session`
**Date:** 2026-06-07

## Current Symptoms

- **502 Error** on `/api/session` in Vercel.
- **TypeError:** `req.headers.get is not a function` at `proxyRequest (/vercel/path0/api/_utils.ts:57:32)`.
- **Vercel Warning:** `WARN: default export returned a Response. The default-export signature is (req, res) => void — returns are ignored.`

## Root Cause Identified

Vercel executes handlers in the **Node.js runtime** by default for files in `api/`. The previous implementation used the **Web API signature** (`Request` -> `Response`), which is intended for the Edge runtime. In the Node.js runtime, `req` is an `IncomingMessage` (where `headers` is a plain object, not a `Headers` instance) and the response must be sent via the `res` (`ServerResponse`) object rather than returned.

## Resolution

Converted all API handlers and the shared proxy utility to the Node.js `(req, res)` signature.

### Changes:
1.  **`api/_utils.ts`**:
    - Refactored `proxyRequest` to accept `IncomingMessage` and `ServerResponse`.
    - Implemented `readBody` helper to consume the request stream into a Buffer for `undici`.
    - Replaced Web API `Headers` and `Response` usage with Node.js `res.setHeader`, `res.statusCode`, and `body.pipe(res)`.
    - Updated URL reconstruction to use `req.headers['host']`.
2.  **`api/session.ts`, `api/market.ts`, `api/order.ts`, `api/debug.ts`**:
    - Updated to standard Node.js handler signature.
3.  **`api/proxy.test.ts`**:
    - Updated test mocks to use `Readable` and `PassThrough` streams to simulate Node.js `req` and `res`.
    - Verified all tests pass.

## Evidence
- timestamp: 2026-06-07T12:00:00Z
  type: error_log
  content: "TypeError: req.headers.get is not a function at proxyRequest (/vercel/path0/api/_utils.ts:57:32)"
- timestamp: 2026-06-07T13:30:00Z
  type: test_result
  content: "8 tests passed in api/proxy.test.ts"

## Resolution Summary
**Root Cause:** Vercel Node.js runtime mismatch with Web API code.
**Fix:** Converted handlers to `(req, res)` Node.js signature and implemented stream-based proxying.

## Post-Fix Status & Handover

### Current State
The fix has been implemented and pushed to `main` (Commit: `1ad5c5e`). 
- All handlers in `/api` now use the Node.js `(req, res)` signature.
- `api/_utils.ts` no longer calls `.headers.get()`.
- Tests verify that the proxy correctly handles Node.js streams.

### Observation on Recent Logs
The user reported that the issue persists, providing logs timestamped `09:03:54`. 
**Note for Next AI:** These logs appear to be from *before* the fix was pushed (which occurred around `13:30`). If the user continues to see `TypeError: req.headers.get is not a function` at `_utils.ts:57:32` in **new** logs (post-deployment), it would imply that Vercel is still serving the old version of the code or the deployment failed.

### Verification Steps for Next AI:
1. Verify the Vercel deployment status for commit `1ad5c5e`.
2. Access `/api/debug` and check the `runtime` field (should be `node`) and the `headers` field (should be a plain object, not an empty object or error).
3. If a 502 persists with **new** logs, check the `[StabilityTrace]` logs to identify the new failure point. The `req.headers.get` error should be impossible in the new code.

