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
