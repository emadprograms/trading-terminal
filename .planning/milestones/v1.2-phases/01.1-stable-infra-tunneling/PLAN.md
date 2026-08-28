# Phase 1.1: Stable Infrastructure & Tunneling - Implementation Plan

## Objective
Replace ephemeral Cloudflare Quick Tunnels with **Cloudflare Named Tunnels** to provide a persistent, production-grade endpoint for the Trading Terminal proxy. This eliminates the "random URL" problem and prevents rate-limiting/lockouts, while securing the endpoint via **Cloudflare Access Service Tokens**.

**Goal:** Transition from `*.trycloudflare.com` $ightarrow$ `proxy.trading-terminal.dev` (or similar static domain).

---

## 1. Infrastructure & Secrets Mapping

### Cloudflare Dashboard Requirements (Manual Setup)
Before executing the workflow changes, the following must be configured in the Cloudflare Zero Trust Dashboard:
1. **Create Named Tunnel**: 
   - Go to `Networks` $ightarrow$ `Tunnels` $ightarrow$ `Create a Tunnel`.
   - Name: `tt-proxy-prod`.
   - Select **Cloudflare** (Remotely Managed).
2. **Configure Public Hostname**:
   - Map `proxy.trading-terminal.dev` (or your chosen domain) to `http://localhost:3000`.
3. **Secure with Access**:
   - Go to `Access` $ightarrow$ `Service Auth` $ightarrow$ `Create Service Token`.
   - Name: `trading-terminal-frontend`.
   - **Save the Client ID and Client Secret immediately.**
4. **Add Access Policy**:
   - Create a policy for `proxy.trading-terminal.dev` that allows the `trading-terminal-frontend` Service Token.

### Secrets Configuration
The following secrets must be available to the environment:

| Secret Key | Source | Purpose | Context |
|------------|--------|----------|---------|
| `CLOUDFLARE_TUNNEL_TOKEN` | Tunnel Setup Page | Authenticates the `cloudflared` connector | GitHub Secret |
| `CF_ACCESS_CLIENT_ID` | Service Token Setup | Frontend auth to bypass Cloudflare Access | GitHub Secret & `.env` (as `VITE_CF_ACCESS_CLIENT_ID`) |
| `CF_ACCESS_CLIENT_SECRET` | Service Token Setup | Frontend auth to bypass Cloudflare Access | GitHub Secret & `.env` (as `VITE_CF_ACCESS_CLIENT_SECRET`) |
| `PROXY_STATIC_URL` | Your Domain | The fixed URL (e.g., `https://proxy.trading-terminal.dev`) | GitHub Secret |

---

## 2. Implementation Tasks

### Task 1: Update `cloudflared` Installation
Modify `.github/workflows/auth-proxy.yml` to use the official `.deb` package for better stability and consistency.

**Action:** Replace the `Install cloudflared` step with:
```yaml
- name: Install cloudflared
  run: |
    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
    sudo dpkg -i cloudflared.deb
```

### Task 2: Implement Persistent Tunnel Logic
Replace the "Start Tunnel" polling loop with a token-based background process.

**Action:** Replace the entire `Start Tunnel` step with the following logic. 
**CRITICAL:** The `RUNNER_TRACKING_ID: ""` env var is mandatory to prevent GitHub Actions from killing the background process.

```yaml
- name: Start Cloudflare Tunnel
  env:
    RUNNER_TRACKING_ID: "" # Prevents GH Actions from killing background process
  run: |
    echo "Starting Named Tunnel via token..."
    nohup cloudflared tunnel run --token ${{ secrets.CLOUDFLARE_TUNNEL_TOKEN }} > cloudflared.log 2>&1 &
    echo $! > tunnel.pid
    echo "Tunnel process started with PID $(cat tunnel.pid)"
    
    # Initial wait for connection
    sleep 10
    
    # Verify process is still alive
    if ! kill -0 $(cat tunnel.pid) 2>/dev/null; then
      echo "❌ Tunnel process died immediately. Check logs:"
      cat cloudflared.log
      exit 1
    fi
```

### Task 3: Implement Edge-to-Proxy Health Check
Instead of searching logs for a random URL, verify the static hostname is reachable and returning the expected health status.

**Action:** Replace the "Verify Capital.com Connectivity" (or add before it) a Tunnel Health Check:

```yaml
- name: Verify Tunnel Reachability
  run: |
    echo "Testing connectivity to ${{ secrets.PROXY_STATIC_URL }}..."
    # Use the Service Tokens to bypass Cloudflare Access during verification
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" 
      -H "CF-Access-Client-Id: ${{ secrets.CF_ACCESS_CLIENT_ID }}" 
      -H "CF-Access-Client-Secret: ${{ secrets.CF_ACCESS_CLIENT_SECRET }}" 
      ${{ secrets.PROXY_STATIC_URL }}/ping)
    
    if [ "$RESPONSE" -eq 200 ]; then
      echo "✅ Tunnel is healthy and reachable at the edge."
    else
      echo "❌ Tunnel unreachable. HTTP Code: $RESPONSE. Check Cloudflare Dashboard."
      cat cloudflared.log
      exit 1
    fi
```

### Task 4: Cleanup & State Management
Since the URL is now static, we no longer need to update `STATE.md` on every run.

**Action:** 
1. **Delete** the `Update Discovery State` step entirely.
2. **Update** the `Keep Alive` step to reference `${{ secrets.PROXY_STATIC_URL }}` instead of `$PROXY_URL`.
3. **Add** a final cleanup step to ensure the tunnel is closed if the runner persists.

```yaml
- name: Cleanup Tunnel
  if: always()
  run: |
    if [ -f tunnel.pid ]; then
      PID=$(cat tunnel.pid)
      echo "Stopping tunnel process $PID..."
      kill $PID || true
    fi
```

### Task 5: Update Frontend API Client
The frontend must be updated to include Cloudflare Access Service Token headers to avoid HTTP 403 Forbidden errors when communicating with the secured tunnel.

**Files:** `src/api/client.ts`

**Action:** 
Modify the `beforeRequest` hook in the `api` client configuration to inject the `CF-Access` headers using environment variables.

```typescript
// Inside beforeRequest hook in src/api/client.ts
const newHeaders = new Headers(request.headers)
// ... existing tokens ...
if (import.meta.env.VITE_CF_ACCESS_CLIENT_ID) {
  newHeaders.set('CF-Access-Client-Id', import.meta.env.VITE_CF_ACCESS_CLIENT_ID)
}
if (import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET) {
  newHeaders.set('CF-Access-Client-Secret', import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET)
}
```

---

## 3. Verification Plan

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Trigger `auth-proxy` workflow | Workflow completes "Verify Tunnel Reachability" with HTTP 200 |
| 2 | Access URL in Browser | Should see Cloudflare Access login page (proving it's protected) |
| 3 | Curl with tokens | `curl -H "CF-Access-Client-Id: ..." ... /ping` returns `{"status":"OK"}` |
| 4 | Frontend API Call | Application successfully makes requests to the proxy without receiving HTTP 403 |
| 5 | Test `/session` | Proxy successfully logs into Capital.com via the static URL |

## Success Criteria
- [ ] Workflow starts `cloudflared` using a token, not `--url`.
- [ ] Tunnel persists for the full `duration` specified in workflow inputs.
- [ ] Static hostname `proxy.trading-terminal.dev` resolves and is reachable.
- [ ] Requests without `CF-Access` headers are blocked with HTTP 403.
- [ ] Requests with `CF-Access` headers reach the Hono proxy successfully.
- [ ] Frontend API client (`src/api/client.ts`) correctly injects `CF-Access-Client-Id` and `CF-Access-Client-Secret`.
