# Troubleshooting Cloudflare Tunnels in GitHub Actions

This guide addresses common issues when running `cloudflared` in ephemeral CI environments.

## 1. Tunnel Dies Immediately (Process Killed)
**Symptom:** Logs show `cloudflared` started, but it's not active in the dashboard, and the step finished.
**Cause:** GitHub Actions kills all background processes when a step ends.
**Solution:** Set `RUNNER_TRACKING_ID: ""` in the environment variables of the step starting the tunnel.
```yaml
- name: Start Tunnel
  env:
    RUNNER_TRACKING_ID: ""
  run: nohup cloudflared tunnel run --token ${{ secrets.TOKEN }} &
```

## 2. "Existing connector already active"
**Symptom:** Logs show `failed to create new connection: ... already exists`.
**Cause:** A previous workflow run didn't clean up the connection properly, and Cloudflare still thinks it's alive.
**Solution:** 
- Wait ~30 seconds for Cloudflare to detect the heartbeat failure.
- Or, use multiple replicas (Cloudflare supports up to 50 active connectors for one tunnel).
- Or, use the `--force` flag (not recommended for general use).

## 3. "Access Denied" (HTTP 403)
**Symptom:** The tunnel is up, but browser/frontend gets 403.
**Cause:** Cloudflare Access policy is blocking the request.
**Solution:** 
- Ensure you are sending `CF-Access-Client-Id` and `CF-Access-Client-Secret` if using Service Tokens.
- Check the Access logs in the Cloudflare dashboard to see which policy is triggering.

## 4. "502 Bad Gateway"
**Symptom:** URL is reachable, but returns 502.
**Cause:** The tunnel is connected to Cloudflare, but `cloudflared` cannot reach your local service (e.g., Hono proxy).
**Solution:**
- Verify your service is running: `curl http://localhost:3000`.
- Ensure the tunnel configuration (Public Hostname) matches the local port (e.g., `localhost:3000` vs `127.0.0.1:3000`).

## 5. DNS Propagation Issues
**Symptom:** `proxy.yourdomain.com` doesn't resolve.
**Cause:** CNAME record hasn't propagated or wasn't created.
**Solution:**
- When using the Dashboard (Remotely Managed), Cloudflare creates the DNS record automatically.
- Check **DNS > Records** in Cloudflare to ensure the CNAME points to `<tunnel-uuid>.cfargotunnel.com`.

## 6. Rate Limiting (rare for Named Tunnels)
**Symptom:** `Too Many Requests` (429).
**Cause:** Usually happens if you are rapidly starting/stopping hundreds of tunnels.
**Solution:** Reuse the same tunnel UUID across runs and only swap the token.
