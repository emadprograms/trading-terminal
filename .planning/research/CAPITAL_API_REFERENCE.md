# Capital.com API Reference (Authoritative Source of Truth)

**Last verified:** 2026-06-08
**Confidence:** MAXIMUM (Verified against live proxy implementation and official OpenAPI spec)

> **CORE MANDATE:** This document is the absolute source of truth for Capital.com API interactions in this project. 
> AIs MUST NOT apply "standard" REST patterns if they contradict the schemas and routing logic defined below.

---

## Proxy Routing Architecture

To avoid leaking API keys and bypass CORS restrictions, all frontend requests are routed through Vercel serverless proxy handlers.

| Frontend Service | Base URL Prefix | Proxy Handler | Target Backend Path |
|------------------|-----------------|---------------|---------------------|
| Session API | `/api/session` | `api/session.ts` | `/api/v1/session` |
| Account API | `/api/accounts` | `api/accounts.ts` | `/api/v1/accounts` |
| Trade API | `/api/order` | `api/order.ts` | `/api/v1/positions`, `/api/v1/workingorders` |
| Market API | `/api/market` | `api/market.ts` | `/api/v1/prices` |

### ⚠️ CRITICAL: Routing Rule
Requests MUST use the full path including the proxy prefix and the versioned subpath.
*   **Correct:** `api.get('accounts/v1/accounts')` -> `/api/accounts/v1/accounts`
*   **Incorrect:** `api.get('v1/accounts')` -> `/api/v1/accounts` (Misses the Vercel rewrite rule and falls back to `index.html`)

---

## Base URLs (Backend)

| Environment | REST Base URL | WebSocket URL |
|-------------|---------------|---------------|
| **Demo** | `https://demo-api-capital.backend-capital.com` | `wss://api-streaming-capital.backend-capital.com/connect` |
| **Live** | `https://api-capital.backend-capital.com` | `wss://api-streaming-capital.backend-capital.com/connect` |

---

## Authentication & Session

### POST `/api/session`
Creates a new trading session.

**Required Headers:**
```
X-CAP-API-KEY: <your_api_key>
```

**Success Response (200) Headers:**
- `CST` — Client Session Token
- `X-SECURITY-TOKEN` — Security token
*Note: Tokens are captured by `src/api/client.ts` and stored in `useSessionStore`.*

**Subsequent Request Headers:**
```
CST: <cst_value>
X-SECURITY-TOKEN: <security_token_value>
x-env: <DEMO | LIVE>
```

---

## REST API: Account Management

### GET `/api/accounts/v1/accounts`

**Response Structure (Polymorphic):**
The client (`src/api/account.ts`) MUST handle both:
1.  **Bare Array:** `[ { "accountId": "...", ... }, ... ]`
2.  **Wrapped Object:** `{ "accounts": [ { ... } ] }`

**Account Object Fields:**
- `balance`: `{ balance, available, deposit, profitLoss }`
- `status`: `"ACTIVE"`, `"PENDING"`, etc.
- `accountType`: `"CFD"`, `"SPREADBET"`, etc.

---

## REST API: Historical Prices (Market Data)

### GET `/api/market/v1/prices/{epic}`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `resolution` | string | Yes | — | `MINUTE`, `MINUTE_5`, `MINUTE_15`, `HOUR`, `DAY` |
| `max` | integer | No | 10 | Max candles (Max 1000) |

**Resolution Lookback Limits (Safety):**
Requests beyond these limits return `400 Bad Request`.

| Resolution | Approx. Max Lookback | Safe `max` |
|------------|---------------------|------------|
| `MINUTE` | ~16 hours | 960 |
| `MINUTE_5` | ~3 days | 864 |
| `MINUTE_15` | ~7 days | 672 |
| `HOUR` | ~60 days | 1000 |
| `DAY` | ~5 years | 1000 |

### ⚠️ CRITICAL: Field Mapping (`ask` vs `ofr`)
- **REST API** uses **`ask`** for the buy price.
- **WebSocket API** uses **`ofr`** for the buy price.

**REST Response JSON:**
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

### POST `/api/order/v1/workingorders`
Place a limit or stop order (requires `level` field).

### DELETE `/api/order/v1/positions/{dealId}`
Close an active position.

---

## WebSocket API: Real-Time Streaming

**URL:** `wss://api-streaming-capital.backend-capital.com/connect`

### Auth Message (Required)
```json
{
  "destination": "ping",
  "correlationId": "1",
  "cst": "<cst_token>",
  "securityToken": "<security_token>"
}
```

### Price Update Payload
```json
{
  "destination": "quote",
  "payload": {
    "epic": "AAPL",
    "bid": 175.43,
    "ofr": 175.45, 
    "timestamp": 1660297190627
  }
}
```
*Note: Uses `ofr`, NOT `ask`.*

---

## Common Epic Names

| Display Name | Epic |
|-------------|------|
| Apple | `AAPL` |
| Tesla | `TSLA` |
| SPY | `US500` |
| Gold | `GOLD` |
| Crude Oil | `OIL_CRUDE` |
| Bitcoin | `BTCUSD` |

---

## ky HTTP Client (v2) Integration Notes

**Crucial Bug History:**
- `prefix`: NOT a valid ky option (silently ignored).
- `baseUrl`: Standard in ky v2 for leading-slash paths (`/api/...`).
- `prefixUrl`: Throws if path starts with `/`.

**Current Configuration (`src/api/client.ts`):**
```typescript
export const api = ky.create({
  prefix: '/api', // This acts as a custom property, NOT ky prefixUrl
  // hooks handle the actual resolution
});
```

---

## Rate Limits

| Scope | Limit |
|-------|-------|
| REST API | 10 requests per second |
| Order placement | 1 request per 0.1 seconds |
| Session timeout | 10 minutes of inactivity |
