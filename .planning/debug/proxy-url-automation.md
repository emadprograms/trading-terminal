---
status: in_progress
trigger: "User reports manual proxy URL entry requirement and subsequent infinite reload/undefined bugs"
goal: automate_proxy_and_stabilize_handshake
---

# Debug Session: Proxy URL Automation & Stability

## Symptoms
1. **Initial**: User had to manually enter the proxy URL every time.
2. **Regression A**: App entered an infinite rapid reload loop.
3. **Regression B**: App started hitting `https://proxy.scanner-backend.uk/undefined` causing CORS preflight failures.
4. **Regression C**: DB Worker failed with "critical error" (WASM fetch failed).
5. **Current**: App loads briefly then disappears; console shows "BLOCKING malformed request to: undefined".

## Root Causes Identified
1. **LocalStorage Corruption**: The string `"undefined"` was saved in `localStorage.proxyUrl`, causing the app to bootstrap with a broken base URL.
2. **Ky v2 API Changes**: `ky` v2 renamed `prefixUrl` to `prefix` and introduced `baseUrl`. Using `prefixUrl` triggered a library-level error that blocked the handshake.
3. **Hook Resolution Race**: My `beforeRequest` hook in `src/api/client.ts` was sometimes receiving a relative URL before Ky had resolved it against the `prefix`, leading to path segments like `/undefined` if the input was malformed.
4. **Rules of Hooks Violation**: In `ChartHeader.tsx`, a Zustand hook was called inside an IIFE, causing internal React crashes during re-renders.
5. **WASM Pathing**: The DB worker used a relative path for `sql-wasm.wasm`, which failed when the app origin/pathname shifted.

## Fixes Applied

### 1. Store & Storage Sanitization
- **File**: `src/store/useSessionStore.ts`
- **Change**: Added `sanitizeUrl` to reject `"undefined"`, `"null"`, or empty strings, defaulting to the stable Cloudflare proxy.
- **File**: `src/App.tsx`
- **Change**: Added a "first-boot" `useEffect` to explicitly `localStorage.removeItem('proxyUrl')` if it contains the corrupted string.

### 2. API Client Hardening
- **File**: `src/api/client.ts`
- **Change**: 
    - Switched to `prefix` (Ky v2).
    - Implemented a robust `beforeRequest` hook that manually reconstructs absolute URLs to the proxy.
    - Added a **Hard Block**: Throws `Error` if the path contains `undefined` to prevent network clutter and CORS noise.
    - Explicitly injects Cloudflare Service Tokens and Capital.com session tokens.

### 3. DB Worker Stability
- **Action**: Manually copied `node_modules/sql.js/dist/sql-wasm.wasm` to `public/sql-wasm.wasm`.
- **File**: `src/lib/workers/db.worker.ts`
- **Change**: Updated fetch to use `new URL('/sql-wasm.wasm', self.location.origin)`, ensuring it always targets the correct origin regardless of the current path.

### 4. UI Isolation
- **File**: `src/App.tsx`
- **Change**: Wrapped **Header**, **AccountSelector**, and **Workspace** in separate `ErrorBoundary` components to prevent a single component crash from disappearing the entire page.
- **Change**: Added `[StabilityTrace]` logging to track rendering and handshake lifecycle.

## Current Blockers
- **Malformed Request**: Something is still calling `api.get(undefined)` or `api.post(undefined)`. The logs show `BLOCKING malformed request to: undefined`. This is likely a hook (possibly `useQuery` in `AccountHeader` or `useChartData`) triggered before its parameters are hydrated.
- **Handshake Failure**: The auto-login handshake fails because it is being redirected or blocked by the same `undefined` path resolution logic.

## Handover Notes for Next Agent
- **Start here**: Look for the component calling the `api` with an undefined variable as the path. 
- **Suspects**: 
    - `src/components/AccountHeader.tsx`: Check `useQuery` dependencies.
    - `src/hooks/useChartData.ts`: Check `fetchMarketData` calls.
    - `src/hooks/useSession.ts`: Check `loginMutation` parameters.
- **Do not**: Change the Cloudflare headers or the proxy URL (`https://proxy.scanner-backend.uk`); they are confirmed working when the path is correct.
