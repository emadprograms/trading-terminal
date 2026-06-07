---
status: investigating
trigger: 500 error on /api/session
---

# Debug Session: vercel-500-api-session

## Current Focus
- **Hypothesis:** 
    1. The `Response` constructor in Vercel Node.js Serverless Functions may not support Node.js `Readable` streams (from `undici`) directly, requiring conversion to Web Standard `ReadableStream`.
    2. `req.url` might be a relative path in some Vercel environments, causing `new URL(req.url)` to throw.
    3. `undici` might be crashing during initialization or usage in the Vercel environment.
- **Next Action:** Await user feedback on logs after deploying the implemented instrumentation. Check `/api/debug` to verify the runtime environment.

## Symptoms
- **Endpoint:** `POST https://trading-terminal-psi-ashen.vercel.app/api/session`
- **Observation:** Browser console reports a 500 error. Vercel function logs are empty or not showing the specific cause.
- **Recent Changes:** Fixed `ERR_MODULE_NOT_FOUND` by adding `.js` extensions to imports in the `/api` directory.

## Evidence
- implemented verbose logging in `api/session.ts` and `api/_utils.ts`.
- Added `Readable.toWeb()` conversion for `undici` response bodies.
- Added relative URL handling for `req.url`.
- Created `api/debug.ts` to inspect the runtime environment (Node.js vs Edge).

## Resolution
- **Root Cause:** TBD
- **Fix:** TBD

