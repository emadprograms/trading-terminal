---
status: in_progress
trigger: "Phase 1.1 Proxy Migration causing CORS preflight failures and stability crashes"
goal: restore_stability_and_finalize_proxy_bridge
---

# Handover: Proxy Stability & Infrastructure Recovery

## 1. Technical Audit & Context
The application recently underwent **Phase 1.1 (Stable Infra & Tunneling)**, transitioning to **Cloudflare Named Tunnels**. This introduced a secured endpoint requiring **Cloudflare Access Service Tokens**.

### Identified Failure Points (Updated)
1.  **CORS Preflight Blockage**:
    - **Symptom**: `Access to fetch at 'https://proxy.scanner-backend.uk/session' from origin 'http://localhost:3000' has been blocked by CORS policy`.
    - **Root Cause**: The frontend injects `CF-Access` headers, triggering an `OPTIONS` preflight. Cloudflare Edge blocks this preflight because browsers don't include the service token headers in `OPTIONS` requests.
2.  **Persistence Conflict (Legacy Storage)**:
    - **Symptom**: Requests still hitting the remote URL even after the Vite proxy fix.
    - **Root Cause**: `localStorage.proxyUrl` containing the old remote URL, which overrides the new `/api` default in the store.
3.  **The "Undefined" Path Loop**:
    - **Status**: Fixed in `src/api/client.ts`.
4.  **The `duplex` TypeError**:
    - **Status**: Fixed in `src/api/client.ts`.

---

## 2. Master Implementation Plan

### Phase A: The "Vite Proxy" Bridge & Client Hardening
We will move Cloudflare Access header injection from the browser to a local development proxy and ensure the client definitively uses it.

**1. Vite Configuration (`vite.config.ts`)**:
- Configure `server.proxy['/api']`.
- Inject `CF-Access-Client-Id` and `CF-Access-Client-Secret` during the `proxyReq` event.

**2. Storage Migration (`App.tsx` / `useSessionStore.ts`)**:
- **Action**: In `App.tsx`, implement a definitive cleanup effect that removes `https://proxy.scanner-backend.uk` from `localStorage` if found.
- **Action**: Update `DEFAULT_PROXY_URL` in `useSessionStore.ts` to `/api`.

**3. API Client Hardening (`src/api/client.ts`)**:
- **Action**: Update `DEFAULT_PROXY_URL` to `/api`.
- **Action**: In the `beforeRequest` hook, if a remote proxy (`http`) is used, strip the `/api` prefix from the path to prevent double-prefixing.
- **Action**: Remove `CF-Access` header injection for same-origin (`/api`) requests.

**4. Hono Proxy Update (`server/index.ts`)**:
- Update CORS middleware to allow `CF-Access-Client-Id` and `CF-Access-Client-Secret` in `allowHeaders`.

### Phase B: DB Worker Stabilization
1.  **Check Logs**: Look for `[DBWorker] FATAL INITIALIZATION ERROR`.
2.  **Verify WASM**: Ensure `public/sql-wasm.wasm` exists and is reachable via the new proxy path if applicable.

### Phase C: Edge Configuration (Infrastructure)
This phase addresses the root cause at the network layer to ensure long-term stability across all environments.

**1. Cloudflare Access Policy**:
- **Requirement**: Create a bypass rule for the `OPTIONS` method in the Cloudflare Zero Trust dashboard.
- **Rationale**: This allows the browser's preflight requests to reach the Hono proxy without requiring Service Tokens, which browsers cannot send during preflight.

**2. Hono Proxy CORS Enhancement (`server/index.ts`)**:
- **Action**: Update the `cors` middleware to explicitly allow the following headers:
    - `CST`
    - `X-SECURITY-TOKEN`
    - `X-Environment`
    - `CF-Access-Client-Id`
    - `CF-Access-Client-Secret`
- **Action**: Ensure `Access-Control-Allow-Origin` is handled dynamically or set to `*` (as per current security posture).

---

## 3. Verification Matrix

| Test Case | Expected Result | Success Signal |
| :--- | :--- | :--- |
| **CORS Preflight** | `OPTIONS /api/session` returns 200 OK | No CORS errors in console |
| **Auto-Login** | `api.post('session', ...)` succeeds | `[StabilityTrace] Login handshake successful` |
| **Account Fetch** | `api.get('accounts')` succeeds | `AccountHeader` displays balance/equity |
| **DB Init** | `db.initDB()` returns `true` | `DB Worker status: LOADED` in UI |

---

## 4. Critical Handover Notes

- **Environment Variables**: Ensure `VITE_CF_ACCESS_CLIENT_ID` and `VITE_CF_ACCESS_CLIENT_SECRET` are available in the local `.env` for Vite to use.
- **Surgical Edits**: Focus on `vite.config.ts` and `src/api/client.ts`. Avoid changing the Hono proxy logic unless CORS requires it.
- **Vite Proxy**: This only affects local development. Production (Vercel) will need a different proxy strategy (e.g., Vercel Rewrites or a serverless function) if the same CORS issues occur there.
