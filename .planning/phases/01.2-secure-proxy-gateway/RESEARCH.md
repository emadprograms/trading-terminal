# Research: Phase 1.2 - Secure Proxy Gateway

**Phase Goal:** Resolve the CORS 'Catch-22' and ALPN negotiation failures by implementing a Vercel Serverless Function proxy.

## Key Findings

### 1. Vercel Serverless Gateway
The solution requires moving the proxy logic from the local Vite dev server to a Vercel Serverless Function (located in `/api/proxy.ts`). This allows Vercel to handle the TLS handshake and provides a stable environment for injecting Cloudflare Access Service Tokens.

### 2. ALPN Negotiation Fix
The `ERR_ALPN_NEGOTIATION_FAILED` is caused by Node.js/Undici attempting HTTP/2 over a proxy/tunnel that expects HTTP/1.1 or handles ALPN incorrectly. The fix is to use `undici.Agent({ allowH2: false })` in the Vercel function to force HTTP/1.1 when communicating with the Cloudflare Tunnel.

### 3. CORS 'Catch-22' Resolution
By routing browser requests through the Vercel Proxy, we bypass the browser's restriction on adding custom headers (`CF-Access-Client-Id`) to `OPTIONS` preflight requests. The Vercel function will handle the preflight or forward the request with tokens injected server-side.

### 4. Vercel Configuration
`vercel.json` must be updated to rewrite `/api/:path*` to the `/api/proxy` function. Environment variables for Cloudflare Access must be configured in the Vercel Dashboard.

## Architecture Pattern: The Bridge Proxy

- **Flow**: Browser -> Vercel `/api/proxy` -> Cloudflare Access -> Hono Backend.
- **Responsibility**: Vercel tier owns the Service Token injection. Hono tier owns the Capital.com API Key injection.

## Implementation Details

### Vercel Configuration (vercel.json)
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/proxy" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### ALPN Fix Code Snippet
```typescript
import { Agent, setGlobalDispatcher } from 'undici';
// Force HTTP/1.1 to avoid ALPN negotiation failures with Cloudflare Tunnels
const agent = new Agent({ allowH2: false });
setGlobalDispatcher(agent);
```

### Security
Cloudflare Access Service Tokens should be stored in Vercel Environment Variables (`CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`) **without** the `VITE_` prefix to ensure they remain server-side only.

## Verification Strategy
1.  **Direct Test**: Call the Vercel proxy endpoint with mock headers to verify target reachability.
2.  **CORS Test**: Verify `OPTIONS` requests to `/api/...` return 200 OK without needing tokens.
3.  **ALPN Test**: Ensure no `ERR_ALPN_NEGOTIATION_FAILED` occurs during full handshake.
