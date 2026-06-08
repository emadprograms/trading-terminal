# Capital.com API Reference (Authoritative Source of Truth)

**Last verified:** 2026-06-08
**Confidence:** MAXIMUM (Verified against live proxy implementation and official OpenAPI spec)

> **CORE MANDATE:** This document is the absolute source of truth for Capital.com API interactions in this project. 
> AIs MUST NOT apply "standard" REST patterns if they contradict the schemas and routing logic defined below.

---

## Proxy Routing Architecture

To avoid leaking API keys and bypass CORS/Cloudflare restrictions, all frontend requests MUST be routed through Vercel serverless proxy handlers.

| Frontend Service | Base URL Prefix | Proxy Handler | Target Backend Path |
|------------------|-----------------|---------------|---------------------|
| Session API | `/api/session` | `api/session.ts` | `/api/v1/session` |
| Account API | `/api/accounts` | `api/accounts.ts` | `/api/v1/accounts` |
| Trade API | `/api/order` | `api/order.ts` | `/api/v1/positions`, `/api/v1/workingorders` |
| Market API | `/api/market` | `api/market.ts` | `/api/v1/prices` |

### ⚠️ CRITICAL: Routing Rule
Requests MUST use the full path including the proxy prefix and the versioned subpath.
*   **Correct:** `api.get('accounts/v1/accounts')` -> hits `/api/accounts/v1/accounts`
*   **Incorrect:** `api.get('v1/accounts')` -> hits `/api/v1/accounts` (This misses the Vercel rewrite rule and falls back to `index.html`)

---

## Base URLs (Backend)

| Environment | REST Base URL | WebSocket URL |
|-------------|---------------|---------------|
| **Demo** | `https://demo-api-capital.backend-capital.com` | `wss://api-streaming-capital.backend-capital.com/connect` |
| **Live** | `https://api-capital.backend-capital.com` | `wss://api-streaming-capital.backend-capital.com/connect` |

---

## Authentication & Session

### POST `/api/session`
(Proxies to `/api/v1/session`)

**Request Headers:**
```
Content-Type: application/json
X-CAP-API-KEY: <your_api_key>
```

**Request Body:**
```json
{
  "identifier": "email@example.com",
  "password": "your_password",
  "encryptedPassword": false
}
```

**Success Response (200) Headers:**
- `CST` — Client Session Token
- `X-SECURITY-TOKEN` — Security token

**Preservation Rule:** These tokens are automatically captured by the `afterResponse` hook in `src/api/client.ts` and stored in `useSessionStore`. ALL subsequent REST requests require these headers.

---

## REST API: Account Management

### GET `/api/accounts/v1/accounts`

**Response Structure (Polymorphic):**
The client (`src/api/account.ts`) is designed to handle both formats returned by the API:
1.  **Bare Array:** `[ { "accountId": "...", ... }, ... ]`
2.  **Wrapped Object:** `{ "accounts": [ { ... } ] }`

**Account Object Schema:**
```json
{
  "accountId": "12345678",
  "accountName": "CFD Demo",
  "accountAlias": null,
  "status": "ACTIVE",
  "accountType": "CFD",
  "currency": "USD",
  "canTransferFrom": true,
  "canTransferTo": true,
  "balance": {
    "balance": 10000.00,
    "available": 9500.00,
    "deposit": 1000.00,
    "profitLoss": 500.00
  }
}
```

---

## REST API: Historical Prices (Market Data)

### GET `/api/market/v1/prices/{epic}`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `resolution` | string | Yes | — | Candle timeframe. See Resolution enum below. |
| `max` | integer | No | 10 | Max number of price points. **Maximum allowed: 1000**. |

**Resolution Enum:**
`MINUTE`, `MINUTE_5`, `MINUTE_15`, `MINUTE_30`, `HOUR`, `HOUR_4`, `DAY`, `WEEK`.

### ⚠️ CRITICAL: Data Range Limits (400 Errors)
Requesting beyond these limits returns a `400 Bad Request`.

| Resolution | Approx. Max Lookback | Safe `max` Value |
|------------|---------------------|------------------|
| `MINUTE` | ~16 hours | 960 |
| `MINUTE_5` | ~3 days | 864 |
| `MINUTE_15` | ~7 days | 672 |
| `MINUTE_30` | ~14 days | 672 |
| `HOUR` | ~60 days | 1000 |
| `HOUR_4` | ~180 days | 1000 |
| `DAY` | ~5 years | 1000 |

### ⚠️ Response Format & Field Mapping
The REST response is **Always Wrapped** in a `prices` key.
*   **REST uses `ask`** for the buy price.
*   **WebSocket uses `ofr`** for the buy price.

```json
{
  "prices": [
    {
      "snapshotTimeUTC": "2024-01-15T14:30:00",
      "openPrice": { "bid": 100.5, "ask": 100.7 },
      "closePrice": { "bid": 101.0, "ask": 101.2 },
      "highPrice": { "bid": 101.5, "ask": 101.7 },
      "lowPrice": { "bid": 100.0, "ask": 100.2 },
      "lastTradedVolume": 15234
    }
  ]
}
```

---

## REST API: Trading & Order Execution

### POST `/api/order/v1/positions`
Place a market order.

**Payload:**
```json
{
  "epic": "AAPL",
  "size": 1,
  "direction": "BUY",
  "guaranteedStop": false,
  "stopLevel": 170.0,
  "profitLevel": 190.0
}
```

### POST `/api/order/v1/workingorders`
Place a limit or stop order. Requires the `level` field.

### GET `/api/order/v1/confirms/{dealReference}`
Retrieve confirmation for a specific trade. Used as a fallback when WebSocket messages are missed.

---

## WebSocket API: Real-Time Streaming

**URL:** `wss://api-streaming-capital.backend-capital.com/connect`

### 1. Authentication Message
Required immediately after connection:
```json
{
  "destination": "ping",
  "correlationId": "1",
  "cst": "<cst_token>",
  "securityToken": "<security_token>"
}
```

### 2. Subscribe to Market Data
```json
{
  "destination": "marketData.subscribe",
  "payload": {
    "epics": ["AAPL", "US500"]
  }
}
```
*Note: `epics` MUST be an array. Max 40 epics per connection.*

### 3. Price Update Payload (`destination: "quote"`)
```json
{
  "status": "OK",
  "destination": "quote",
  "payload": {
    "epic": "AAPL",
    "bid": 175.43,
    "ofr": 175.45, 
    "timestamp": 1660297190627
  }
}
```
**⚠️ WARNING:** Use `ofr` for Ask price. WebSocket timestamp is in **milliseconds**.

---

## Common Epic Names

| Display Name | Epic |
|-------------|------|
| Apple | `AAPL` |
| Tesla | `TSLA` |
| SPY | `US500` |
| EUR/USD | `EURUSD` |
| Gold | `GOLD` |
| Crude Oil | `OIL_CRUDE` |
| Bitcoin | `BTCUSD` |

---

## Rate Limits

| Scope | Limit |
|-------|-------|
| REST API | 10 requests per second |
| Order placement | 1 request per 0.1 seconds |
| WebSocket | Max 40 instruments per connection |
| Session timeout | 10 minutes of inactivity |

---

## ky HTTP Client (v2) Configuration Notes

The codebase uses `ky` v2.0.2. 

**Bug History:**
1.  **`prefix` vs `baseUrl`**: `prefix` is NOT a valid ky option and is silently ignored. We use a custom `prefix` property in `src/api/client.ts` but the actual request is handled by a `beforeRequest` hook to resolve the full proxy URL.
2.  **Leading Slashes**: `prefixUrl` throws if the input starts with `/`. We use absolute path resolution in hooks to avoid this.

**Preservation Mandate:** Do not "simplify" the client headers or prefixes without verifying against the Vercel proxy rewrite rules in `vercel.json`.
