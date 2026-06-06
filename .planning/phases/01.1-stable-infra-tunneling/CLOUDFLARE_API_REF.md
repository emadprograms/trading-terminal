# Cloudflare Tunnel API Reference (for Offline Use)

This document provides raw API endpoints and JSON structures for managing Cloudflare Tunnels via scripts.

## 1. List Tunnels
**Endpoint:** `GET /accounts/{account_id}/cfd_tunnel`
**Description:** Lists all tunnels in the account.

**Response Example:**
```json
{
  "result": [
    {
      "id": "f70ff985-3d36-4ec3-9391-0391d46ee318",
      "name": "dev-tunnel",
      "status": "inactive",
      "created_at": "2021-01-25T18:22:34.017185Z",
      "deleted_at": null,
      "connections": []
    }
  ],
  "success": true,
  "errors": [],
  "messages": []
}
```

## 2. Get Tunnel Configuration
**Endpoint:** `GET /accounts/{account_id}/cfd_tunnel/{tunnel_id}/configurations`
**Description:** Retrieves the ingress rules for a tunnel.

**Response Example:**
```json
{
  "result": {
    "config": {
      "ingress": [
        {
          "hostname": "proxy.yourdomain.com",
          "service": "http://localhost:3000"
        },
        {
          "service": "http_status:404"
        }
      ]
    }
  },
  "success": true
}
```

## 3. Tunnel Metrics (Local)
**Endpoint:** `GET http://localhost:2000/metrics` (if started with `--metrics localhost:2000`)
**Description:** Prometheus-formatted metrics from the running `cloudflared` process.

**Key Metrics:**
- `cloudflared_tunnel_active_connections`: Number of active connections to the edge.
- `cloudflared_tunnel_total_requests`: Total requests handled.

## 4. Cloudflare Access Service Tokens
**Header Key:** `CF-Access-Client-Id`
**Header Key:** `CF-Access-Client-Secret`

When an Access Policy is set to "Service Auth", these two headers must be present and valid for the request to pass the edge.

## 5. Useful CLI Commands for Debugging
```bash
# Check if cloudflared can reach the edge
cloudflared tunnel info

# Tail tunnel logs
tail -f cloudflared.log

# Verify tunnel token validity (offline check)
# The token is a base64 encoded JSON string.
echo "<TOKEN>" | base64 -d
```
